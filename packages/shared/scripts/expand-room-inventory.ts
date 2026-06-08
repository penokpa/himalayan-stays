// One-off: for every active lodge, ensure each non-DORM room type has at least
// MIN_UNITS_PER_TYPE physical rooms. Today most lodges have 1 of each type, so
// booking a single physical room makes the whole type appear "BOOKED" on the
// lodge detail page. This expands capacity without touching existing rooms or
// bookings.
//
// Run from packages/shared:
//   npx tsx scripts/expand-room-inventory.ts

import { PrismaClient, RoomType, Season } from "@prisma/client";

const prisma = new PrismaClient();

const MIN_UNITS_PER_TYPE: Record<RoomType, number> = {
  PRIVATE_SINGLE: 3,
  PRIVATE_DOUBLE: 4,
  PRIVATE_TWIN: 3,
  DORM: 1, // single dorm record (capacity already reflects multiple beds)
};

// Pre-existing seed pattern: each room created with full season pricing rows.
// Match that so the new units quote the same prices as their siblings.
const SEASON_ROWS = [
  { season: Season.PEAK, startDate: new Date("2026-10-01"), endDate: new Date("2026-11-30"), multiplier: 1.5 },
  { season: Season.PEAK, startDate: new Date("2026-04-01"), endDate: new Date("2026-05-31"), multiplier: 1.5 },
  { season: Season.OFF, startDate: new Date("2026-06-01"), endDate: new Date("2026-08-31"), multiplier: 0.7 },
] as const;

async function main() {
  const lodges = await prisma.lodge.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  console.log(`Scanning ${lodges.length} active lodges…\n`);

  let totalCreated = 0;

  for (const lodge of lodges) {
    const existingRooms = await prisma.room.findMany({
      where: { lodgeId: lodge.id, isActive: true },
      select: {
        roomType: true,
        capacity: true,
        basePriceNpr: true,
      },
    });

    const byType: Partial<Record<RoomType, typeof existingRooms>> = {};
    for (const r of existingRooms) {
      (byType[r.roomType] ??= []).push(r);
    }

    let lodgeCreated = 0;
    for (const [roomTypeRaw, minCount] of Object.entries(MIN_UNITS_PER_TYPE)) {
      const roomType = roomTypeRaw as RoomType;
      const existing = byType[roomType] ?? [];
      if (existing.length >= minCount) continue;

      const toCreate = minCount - existing.length;
      if (existing.length === 0) {
        // No template room to copy price/capacity from — skip with a warning.
        console.log(
          `  ! ${lodge.name}: no existing ${roomType} room to use as template, skipping`
        );
        continue;
      }

      const template = existing[0];
      const startingIndex = existing.length + 1;

      for (let i = 0; i < toCreate; i++) {
        const idx = startingIndex + i;
        const labelBase =
          roomType === "PRIVATE_DOUBLE"
            ? "Private Double"
            : roomType === "PRIVATE_TWIN"
              ? "Private Twin"
              : roomType === "PRIVATE_SINGLE"
                ? "Private Single"
                : "Dorm Bed";

        const room = await prisma.room.create({
          data: {
            lodgeId: lodge.id,
            name: `${labelBase} ${idx}`,
            roomType,
            capacity: template.capacity,
            basePriceNpr: template.basePriceNpr,
            isActive: true,
          },
        });

        // Season pricing rows match the seed's per-room shape
        for (const sr of SEASON_ROWS) {
          await prisma.seasonPricing.create({
            data: {
              roomId: room.id,
              season: sr.season,
              startDate: sr.startDate,
              endDate: sr.endDate,
              priceNpr: Math.round(Number(template.basePriceNpr) * sr.multiplier),
            },
          });
        }

        lodgeCreated++;
        totalCreated++;
      }
    }

    if (lodgeCreated > 0) {
      console.log(`  ✓ ${lodge.name}: +${lodgeCreated} room(s)`);
    }
  }

  console.log(`\nDone. Created ${totalCreated} rooms across ${lodges.length} lodges.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
