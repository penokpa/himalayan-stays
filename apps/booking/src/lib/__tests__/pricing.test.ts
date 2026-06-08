import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the Prisma client before importing the module under test.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    seasonPricing: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { quoteRoom } from "@/lib/pricing";

// A minimal stand-in for Prisma.Decimal — quoteRoom only calls `.toNumber()`.
const dec = (n: number) => ({ toNumber: () => n }) as { toNumber: () => number };

const ROOM_ID = "room_abc";

const mockedRoom = prisma.room.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockedSeasons = prisma.seasonPricing.findMany as unknown as ReturnType<typeof vi.fn>;

describe("quoteRoom", () => {
  beforeEach(() => {
    mockedRoom.mockReset();
    mockedSeasons.mockReset();
  });

  it("returns base price per night when no season rows match", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([]);

    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-07-01"),
      new Date("2026-07-04") // 3 nights
    );

    expect(quote.roomId).toBe(ROOM_ID);
    expect(quote.nights).toHaveLength(3);
    expect(quote.nights.every((n) => n.priceNpr === 1000)).toBe(true);
    expect(quote.nights.every((n) => n.season === "BASE")).toBe(true);
    expect(quote.totalNpr).toBe(3000);
  });

  it("applies a PEAK season multiplier across the stay", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([
      {
        season: "PEAK",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-11-30"),
        priceNpr: dec(1500),
      },
    ]);

    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-10-15"),
      new Date("2026-10-17") // 2 peak nights
    );

    expect(quote.nights.map((n) => n.priceNpr)).toEqual([1500, 1500]);
    expect(quote.nights.every((n) => n.season === "PEAK")).toBe(true);
    expect(quote.totalNpr).toBe(3000);
  });

  it("mixes BASE and PEAK nights when the stay straddles a season window", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([
      {
        season: "PEAK",
        startDate: new Date("2026-09-10"),
        endDate: new Date("2026-09-25"),
        priceNpr: dec(1500),
      },
    ]);

    // 12-night stay from Sep 18 → Sep 30. We assert only nights that are
    // unambiguously inside or outside the season window (skip boundary
    // nights — see "timezone slop" test).
    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-09-18"),
      new Date("2026-09-30")
    );

    expect(quote.nights).toHaveLength(12);
    // Sep 18-22 (indices 0-4): clearly inside PEAK
    expect(quote.nights[0].season).toBe("PEAK");
    expect(quote.nights[3].season).toBe("PEAK");
    // Sep 27-29 (indices 9-11): clearly after PEAK
    expect(quote.nights[10].season).toBe("BASE");
    expect(quote.nights[11].season).toBe("BASE");
  });

  it("treats the night-of startDate as inside the season (timezone-stable)", async () => {
    // Regression guard for the Asia/Kathmandu (UTC+5:45) bug: previously the
    // cursor advanced in local time while seasonPricing.startDate is stored as
    // UTC midnight, so the night of Oct 1 fell into BASE in any timezone ahead
    // of UTC. eachNight now iterates in UTC, so this passes everywhere.
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([
      {
        season: "PEAK",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-31"),
        priceNpr: dec(1500),
      },
    ]);

    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-09-30"),
      new Date("2026-10-02")
    );

    expect(quote.nights).toHaveLength(2);
    expect(quote.nights[0].season).toBe("BASE"); // Sep 30 night, before PEAK
    expect(quote.nights[1].season).toBe("PEAK"); // Oct 1 night, first day of PEAK
    expect(quote.totalNpr).toBe(1000 + 1500);
  });

  it("treats the night-of endDate as inside the season (timezone-stable)", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([
      {
        season: "PEAK",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-31"),
        priceNpr: dec(1500),
      },
    ]);

    // Oct 30 night (inside PEAK), Oct 31 night (last day of PEAK).
    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-10-30"),
      new Date("2026-11-01")
    );

    expect(quote.nights).toHaveLength(2);
    expect(quote.nights[0].season).toBe("PEAK");
    expect(quote.nights[1].season).toBe("PEAK");
    expect(quote.totalNpr).toBe(3000);
  });

  it("picks the higher-priority season when ranges overlap", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    // OFF (priority 1) and PEAK (priority 3) overlap on the same night.
    // PEAK must win because of SEASON_PRIORITY.
    mockedSeasons.mockResolvedValue([
      {
        season: "OFF",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        priceNpr: dec(700),
      },
      {
        season: "PEAK",
        startDate: new Date("2026-08-15"),
        endDate: new Date("2026-09-15"),
        priceNpr: dec(1500),
      },
    ]);

    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-08-20"),
      new Date("2026-08-21") // single night where both seasons apply
    );

    expect(quote.nights).toHaveLength(1);
    expect(quote.nights[0].season).toBe("PEAK");
    expect(quote.nights[0].priceNpr).toBe(1500);
    expect(quote.totalNpr).toBe(1500);
  });

  it("throws when the room does not exist", async () => {
    mockedRoom.mockResolvedValue(null);
    mockedSeasons.mockResolvedValue([]);

    await expect(
      quoteRoom("missing", new Date("2026-07-01"), new Date("2026-07-02"))
    ).rejects.toThrow(/Room missing not found/);
  });

  it("returns zero nights when check-in equals check-out", async () => {
    mockedRoom.mockResolvedValue({ basePriceNpr: dec(1000) });
    mockedSeasons.mockResolvedValue([]);

    const quote = await quoteRoom(
      ROOM_ID,
      new Date("2026-07-01"),
      new Date("2026-07-01")
    );

    expect(quote.nights).toEqual([]);
    expect(quote.totalNpr).toBe(0);
  });
});
