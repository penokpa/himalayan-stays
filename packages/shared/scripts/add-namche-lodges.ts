// One-off: insert 6 extra Namche lodges so the trek route page exceeds the
// 6-card threshold and renders the "Show all N lodges in Namche Bazaar" reveal.
// Non-destructive: skips any lodge whose slug already exists.
//
// Run from packages/shared:
//   npx tsx scripts/add-namche-lodges.ts

import { PrismaClient, ManagedBy, RoomType, TrekRoute } from "@prisma/client";

const prisma = new PrismaClient();

interface RoomPrices {
  PRIVATE_DOUBLE: number;
  PRIVATE_TWIN: number;
  PRIVATE_SINGLE: number;
  DORM: number;
}

interface NamcheLodgeDef {
  name: string;
  slug: string;
  altitude: number;
  lat: number;
  lng: number;
  managedBy: ManagedBy;
  amenities: Record<string, boolean>;
  description: string;
  roomPrices: RoomPrices;
}

const NAMCHE_LODGES: NamcheLodgeDef[] = [
  {
    name: "Namche Sherpa Retreat",
    slug: "namche-sherpa-retreat",
    altitude: 3440,
    lat: 27.8073,
    lng: 86.7148,
    managedBy: ManagedBy.OWNER,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, heater: true, bakery: true },
    description: "Boutique retreat with heated rooms and a renowned bakery — a favourite acclimatization stop for guided groups.",
    roomPrices: { PRIVATE_DOUBLE: 3200, PRIVATE_TWIN: 2700, PRIVATE_SINGLE: 2000, DORM: 1300 },
  },
  {
    name: "Namche Khumbu View",
    slug: "namche-khumbu-view",
    altitude: 3440,
    lat: 27.8061,
    lng: 86.7132,
    managedBy: ManagedBy.PLATFORM,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, garden: true, library: true },
    description: "Panoramic terrace overlooking Kongde Ri with a quiet reading lounge — great for a low-key rest day.",
    roomPrices: { PRIVATE_DOUBLE: 2800, PRIVATE_TWIN: 2300, PRIVATE_SINGLE: 1700, DORM: 1100 },
  },
  {
    name: "Namche Budget Inn",
    slug: "namche-budget-inn",
    altitude: 3440,
    lat: 27.8058,
    lng: 86.7128,
    managedBy: ManagedBy.OWNER,
    amenities: { charging: true, restaurant: true },
    description: "Straightforward, affordable rooms with shared bathrooms — popular with budget trekkers and porters.",
    roomPrices: { PRIVATE_DOUBLE: 1600, PRIVATE_TWIN: 1300, PRIVATE_SINGLE: 900, DORM: 500 },
  },
  {
    name: "Namche Heritage Lodge",
    slug: "namche-heritage-lodge",
    altitude: 3440,
    lat: 27.8077,
    lng: 86.7153,
    managedBy: ManagedBy.HYBRID,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, bar: true, bakery: true, heater: true },
    description: "Restored stone-built lodge with Sherpa heritage decor, a wood-fired bar, and the highest-rated kitchen on the trail.",
    roomPrices: { PRIVATE_DOUBLE: 4200, PRIVATE_TWIN: 3500, PRIVATE_SINGLE: 2600, DORM: 1600 },
  },
  {
    name: "Namche Trekkers Home",
    slug: "namche-trekkers-home",
    altitude: 3440,
    lat: 27.8054,
    lng: 86.7124,
    managedBy: ManagedBy.OWNER,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, heater: true },
    description: "Family-run lodge five minutes from the main square — solid heating, hot showers, and home-cooked dal bhat.",
    roomPrices: { PRIVATE_DOUBLE: 2400, PRIVATE_TWIN: 2000, PRIVATE_SINGLE: 1400, DORM: 800 },
  },
  {
    name: "Namche Summit Stay",
    slug: "namche-summit-stay",
    altitude: 3440,
    lat: 27.8082,
    lng: 86.7159,
    managedBy: ManagedBy.PLATFORM,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, bar: true, oxygenAvailable: true, heater: true },
    description: "Upscale stay with oxygen-monitored rooms and a Western-style menu — popular with expedition teams.",
    roomPrices: { PRIVATE_DOUBLE: 4800, PRIVATE_TWIN: 4000, PRIVATE_SINGLE: 3000, DORM: 1800 },
  },
];

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "LODGE_OWNER" } });
  if (!owner) {
    throw new Error("No LODGE_OWNER user found. Run the main seed first.");
  }
  console.log(`Using lodge owner: ${owner.email} (${owner.id})`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const def of NAMCHE_LODGES) {
    const existing = await prisma.lodge.findUnique({ where: { slug: def.slug } });
    if (existing) {
      skippedCount++;
      console.log(`  · ${def.slug} already exists, skipping`);
      continue;
    }

    const lodge = await prisma.lodge.create({
      data: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        altitudeMeters: def.altitude,
        latitude: def.lat,
        longitude: def.lng,
        trekRoute: TrekRoute.EBC,
        trailPosition: 2,
        village: "Namche Bazaar",
        district: "Solukhumbu",
        ownerId: owner.id,
        managedBy: def.managedBy,
        amenities: def.amenities,
        isActive: true,
        photos: [],
      },
    });

    const roomDefs: { name: string; roomType: RoomType; capacity: number; price: number }[] = [
      { name: "Private Double", roomType: RoomType.PRIVATE_DOUBLE, capacity: 2, price: def.roomPrices.PRIVATE_DOUBLE },
      { name: "Private Twin", roomType: RoomType.PRIVATE_TWIN, capacity: 2, price: def.roomPrices.PRIVATE_TWIN },
      { name: "Private Single", roomType: RoomType.PRIVATE_SINGLE, capacity: 1, price: def.roomPrices.PRIVATE_SINGLE },
      { name: "Dorm Bed", roomType: RoomType.DORM, capacity: 6, price: def.roomPrices.DORM },
    ];

    for (const r of roomDefs) {
      await prisma.room.create({
        data: {
          lodgeId: lodge.id,
          name: r.name,
          roomType: r.roomType,
          capacity: r.capacity,
          basePriceNpr: r.price,
          isActive: true,
        },
      });
    }

    createdCount++;
    console.log(`  ✓ ${def.name} (${roomDefs.length} rooms)`);
  }

  const namcheTotal = await prisma.lodge.count({
    where: { village: "Namche Bazaar", isActive: true },
  });
  console.log(
    `\nDone. Created ${createdCount}, skipped ${skippedCount}. Namche now has ${namcheTotal} active lodges.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
