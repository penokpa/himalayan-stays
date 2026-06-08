import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: { findMany: vi.fn() },
    bookingLeg: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getRoomAvailability } from "@/lib/availability";

const mockedRooms = prisma.room.findMany as unknown as ReturnType<typeof vi.fn>;
const mockedLegs = prisma.bookingLeg.findMany as unknown as ReturnType<typeof vi.fn>;

const FROM = new Date("2026-07-01");
const TO = new Date("2026-07-03");

describe("getRoomAvailability", () => {
  beforeEach(() => {
    mockedRooms.mockReset();
    mockedLegs.mockReset();
  });

  it("returns an empty Map when the lodge has no active rooms", async () => {
    mockedRooms.mockResolvedValue([]);

    const result = await getRoomAvailability("lodge_1", FROM, TO);

    expect(result.size).toBe(0);
    // Should short-circuit and never query bookingLeg
    expect(mockedLegs).not.toHaveBeenCalled();
  });

  it("marks every room as available when no booking legs conflict", async () => {
    mockedRooms.mockResolvedValue([{ id: "room_a" }, { id: "room_b" }]);
    mockedLegs.mockResolvedValue([]);

    const result = await getRoomAvailability("lodge_1", FROM, TO);

    expect(result.get("room_a")).toBe("available");
    expect(result.get("room_b")).toBe("available");
  });

  it("marks only the conflicting room as booked, others remain available", async () => {
    mockedRooms.mockResolvedValue([
      { id: "room_a" },
      { id: "room_b" },
      { id: "room_c" },
    ]);
    mockedLegs.mockResolvedValue([{ roomId: "room_b" }]);

    const result = await getRoomAvailability("lodge_1", FROM, TO);

    expect(result.get("room_a")).toBe("available");
    expect(result.get("room_b")).toBe("booked");
    expect(result.get("room_c")).toBe("available");
  });

  it("queries with the correct date-range overlap predicate", async () => {
    mockedRooms.mockResolvedValue([{ id: "room_a" }]);
    mockedLegs.mockResolvedValue([]);

    await getRoomAvailability("lodge_1", FROM, TO);

    expect(mockedLegs).toHaveBeenCalledTimes(1);
    const args = mockedLegs.mock.calls[0]?.[0] as {
      where: {
        checkInDate: { lt: Date };
        checkOutDate: { gt: Date };
        roomId: { in: string[] };
        status: { notIn: string[] };
      };
    };
    expect(args.where.checkInDate.lt).toEqual(TO);
    expect(args.where.checkOutDate.gt).toEqual(FROM);
    expect(args.where.roomId.in).toEqual(["room_a"]);
    // Cancelled/no-show legs must not block — they're excluded at the query layer
    expect(args.where.status.notIn).toEqual(["CANCELLED", "NO_SHOW"]);
  });

  it("requires PENDING bookings older than the hold window to be filtered out by the query", async () => {
    mockedRooms.mockResolvedValue([{ id: "room_a" }]);
    mockedLegs.mockResolvedValue([]);

    await getRoomAvailability("lodge_1", FROM, TO);

    const args = mockedLegs.mock.calls[0]?.[0] as {
      where: { booking: { OR: { status: unknown; createdAt?: { gte: Date } }[] } };
    };
    const orClause = args.where.booking.OR;
    expect(orClause).toHaveLength(2);
    // Branch 1: any non-PENDING status
    expect(orClause[0].status).toEqual({ not: "PENDING" });
    // Branch 2: PENDING but recent (createdAt >= now - 30 min)
    expect(orClause[1].status).toBe("PENDING");
    expect(orClause[1].createdAt).toBeDefined();
    const cutoff = orClause[1].createdAt!.gte.getTime();
    const expectedCutoff = Date.now() - 30 * 60 * 1000;
    // Allow ±5s of clock drift between the test and the function call
    expect(Math.abs(cutoff - expectedCutoff)).toBeLessThan(5000);
  });
});
