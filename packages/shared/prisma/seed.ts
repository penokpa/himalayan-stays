import { Prisma, PrismaClient, TrekRoute, ManagedBy, RoomType, ItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Price scaling helpers ──

const altitudePriceFactor: Record<string, number> = {
  "Lukla": 1.0,
  "Namche Bazaar": 1.25,
  "Tengboche": 1.5,
  "Dingboche": 1.75,
  "Lobuche": 2.0,
  "Gorak Shep": 2.5,
};

function scalePrice(base: number, village: string): number {
  const factor = altitudePriceFactor[village] ?? 1;
  return Math.round(base * factor);
}

// ── Lodge definitions ──

const lodgeDefs = [
  {
    name: "Lukla Guest House",
    slug: "lukla-guest-house",
    village: "Lukla",
    district: "Solukhumbu",
    altitude: 2860,
    lat: 27.6868,
    lng: 86.7305,
    trailPosition: 1,
    managedBy: ManagedBy.PLATFORM,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, bar: true },
    description: "A welcoming guest house at the gateway to the Everest region, perfect for your first night on the trail.",
    roomPrices: { PRIVATE_DOUBLE: 2000, PRIVATE_TWIN: 1500, PRIVATE_SINGLE: 1200, DORM: 800 },
  },
  {
    name: "Lukla Paradise Lodge",
    slug: "lukla-paradise-lodge",
    village: "Lukla",
    district: "Solukhumbu",
    altitude: 2860,
    lat: 27.6872,
    lng: 86.7310,
    trailPosition: 1,
    managedBy: ManagedBy.OWNER,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true },
    description: "A family-run lodge with garden views, just minutes from the Lukla airstrip.",
    roomPrices: { PRIVATE_DOUBLE: 1800, PRIVATE_TWIN: 1400, PRIVATE_SINGLE: 1000, DORM: 700 },
  },
  {
    name: "Namche Bazaar Lodge",
    slug: "namche-bazaar-lodge",
    village: "Namche Bazaar",
    district: "Solukhumbu",
    altitude: 3440,
    lat: 27.8069,
    lng: 86.7141,
    trailPosition: 2,
    managedBy: ManagedBy.HYBRID,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, bar: true, bakery: true },
    description: "Located in the bustling Sherpa capital, this lodge offers comfort and stunning views of Kongde Ri during your acclimatization days.",
    roomPrices: { PRIVATE_DOUBLE: 2500, PRIVATE_TWIN: 2000, PRIVATE_SINGLE: 1500, DORM: 1000 },
    extraRooms: true,
  },
  {
    name: "Namche Hotel & Lodge",
    slug: "namche-hotel-lodge",
    village: "Namche Bazaar",
    district: "Solukhumbu",
    altitude: 3440,
    lat: 27.8065,
    lng: 86.7135,
    trailPosition: 2,
    managedBy: ManagedBy.OWNER,
    amenities: { wifi: true, hotShower: true, charging: true, restaurant: true, bar: true },
    description: "Popular lodge in the heart of Namche with mountain views and a cozy common room.",
    roomPrices: { PRIVATE_DOUBLE: 2200, PRIVATE_TWIN: 1800, PRIVATE_SINGLE: 1300, DORM: 900 },
  },
  {
    name: "Tengboche Mountain Lodge",
    slug: "tengboche-mountain-lodge",
    village: "Tengboche",
    district: "Solukhumbu",
    altitude: 3867,
    lat: 27.8367,
    lng: 86.7639,
    trailPosition: 3,
    managedBy: ManagedBy.OWNER,
    amenities: { hotShower: true, charging: true, restaurant: true },
    description: "Nestled beside the famous Tengboche Monastery with panoramic views of Everest, Ama Dablam, and Nuptse.",
    roomPrices: { PRIVATE_DOUBLE: 3000, PRIVATE_TWIN: 2500, PRIVATE_SINGLE: 1800, DORM: 1200 },
  },
  {
    name: "Tengboche View Lodge",
    slug: "tengboche-view-lodge",
    village: "Tengboche",
    district: "Solukhumbu",
    altitude: 3867,
    lat: 27.8370,
    lng: 86.7645,
    trailPosition: 3,
    managedBy: ManagedBy.PLATFORM,
    amenities: { hotShower: true, charging: true, restaurant: true, garden: true },
    description: "Budget-friendly lodge with stunning sunrise views over Ama Dablam, near the monastery.",
    roomPrices: { PRIVATE_DOUBLE: 2800, PRIVATE_TWIN: 2200, PRIVATE_SINGLE: 1600, DORM: 1000 },
  },
  {
    name: "Dingboche Valley Inn",
    slug: "dingboche-valley-inn",
    village: "Dingboche",
    district: "Solukhumbu",
    altitude: 4410,
    lat: 27.8952,
    lng: 86.8319,
    trailPosition: 4,
    managedBy: ManagedBy.OWNER,
    amenities: { charging: true, restaurant: true, heater: true },
    description: "A cozy inn in the Imja Khola valley, ideal for acclimatization with views of Island Peak and Lhotse wall.",
    roomPrices: { PRIVATE_DOUBLE: 3500, PRIVATE_TWIN: 3000, PRIVATE_SINGLE: 2200, DORM: 1500 },
  },
  {
    name: "Dingboche Sherpa Lodge",
    slug: "dingboche-sherpa-lodge",
    village: "Dingboche",
    district: "Solukhumbu",
    altitude: 4410,
    lat: 27.8948,
    lng: 86.8315,
    trailPosition: 4,
    managedBy: ManagedBy.HYBRID,
    amenities: { charging: true, restaurant: true, heater: true, library: true },
    description: "Warm hospitality and hearty food at altitude — a popular acclimatization stop with a sunny terrace.",
    roomPrices: { PRIVATE_DOUBLE: 3200, PRIVATE_TWIN: 2800, PRIVATE_SINGLE: 2000, DORM: 1300 },
  },
  {
    name: "Lobuche Peak Lodge",
    slug: "lobuche-peak-lodge",
    village: "Lobuche",
    district: "Solukhumbu",
    altitude: 4940,
    lat: 27.9489,
    lng: 86.8092,
    trailPosition: 5,
    managedBy: ManagedBy.PLATFORM,
    amenities: { charging: true, restaurant: true, heater: true, oxygenAvailable: true },
    description: "High-altitude lodge at the foot of Lobuche peak, one of the last stops before Everest Base Camp.",
    roomPrices: { PRIVATE_DOUBLE: 4000, PRIVATE_TWIN: 3500, PRIVATE_SINGLE: 2500, DORM: 2000 },
  },
  {
    name: "Lobuche Eco Lodge",
    slug: "lobuche-eco-lodge",
    village: "Lobuche",
    district: "Solukhumbu",
    altitude: 4940,
    lat: 27.9485,
    lng: 86.8088,
    trailPosition: 5,
    managedBy: ManagedBy.OWNER,
    amenities: { charging: true, restaurant: true, heater: true, oxygenAvailable: true },
    description: "A well-insulated lodge built for extreme altitude comfort with thick stone walls and warm dining hall.",
    roomPrices: { PRIVATE_DOUBLE: 3800, PRIVATE_TWIN: 3200, PRIVATE_SINGLE: 2300, DORM: 1800 },
  },
  {
    name: "Gorak Shep Highland Inn",
    slug: "gorak-shep-highland-inn",
    village: "Gorak Shep",
    district: "Solukhumbu",
    altitude: 5164,
    lat: 27.9803,
    lng: 86.8292,
    trailPosition: 6,
    managedBy: ManagedBy.PLATFORM,
    amenities: { restaurant: true, heater: true, oxygenAvailable: true },
    description: "The highest lodge on the EBC trail, your base for visiting Everest Base Camp and climbing Kala Patthar.",
    roomPrices: { PRIVATE_DOUBLE: 5000, PRIVATE_TWIN: 4000, PRIVATE_SINGLE: 3500, DORM: 2500 },
  },
];

// ── Menu item definitions (base prices, scaled per lodge altitude) ──

interface MenuItemDef {
  name: string;
  nameNe?: string;
  unit: string;
  itemType: ItemType;
  basePrice: number;
  category: "Food" | "Drinks" | "Services";
}

const menuItemDefs: MenuItemDef[] = [
  // Food
  { name: "Dal Bhat", nameNe: "दालभात", unit: "plate", itemType: ItemType.FOOD, basePrice: 450, category: "Food" },
  { name: "Fried Rice", nameNe: "भुटेको भात", unit: "plate", itemType: ItemType.FOOD, basePrice: 400, category: "Food" },
  { name: "Egg Fried Rice", nameNe: "अण्डा भुटेको भात", unit: "plate", itemType: ItemType.FOOD, basePrice: 450, category: "Food" },
  { name: "Mo:Mo", nameNe: "मःम", unit: "plate", itemType: ItemType.FOOD, basePrice: 400, category: "Food" },
  { name: "Sherpa Stew", nameNe: "शेर्पा स्ट्यु", unit: "bowl", itemType: ItemType.FOOD, basePrice: 500, category: "Food" },
  { name: "Pancake", nameNe: "प्यानकेक", unit: "plate", itemType: ItemType.FOOD, basePrice: 300, category: "Food" },
  { name: "Tibetan Bread", nameNe: "तिब्बती रोटी", unit: "piece", itemType: ItemType.FOOD, basePrice: 200, category: "Food" },

  // Drinks
  { name: "Milk Tea", nameNe: "दूध चिया", unit: "cup", itemType: ItemType.DRINK, basePrice: 100, category: "Drinks" },
  { name: "Black Tea", nameNe: "कालो चिया", unit: "cup", itemType: ItemType.DRINK, basePrice: 80, category: "Drinks" },
  { name: "Hot Lemon", nameNe: "तातो कागती", unit: "cup", itemType: ItemType.DRINK, basePrice: 150, category: "Drinks" },
  { name: "Hot Chocolate", nameNe: "तातो चकलेट", unit: "cup", itemType: ItemType.DRINK, basePrice: 250, category: "Drinks" },
  { name: "Coca-Cola", nameNe: "कोका-कोला", unit: "bottle", itemType: ItemType.DRINK, basePrice: 300, category: "Drinks" },
  { name: "Beer", nameNe: "बियर", unit: "bottle", itemType: ItemType.DRINK, basePrice: 600, category: "Drinks" },
  { name: "Boiled Water", nameNe: "उमालेको पानी", unit: "liter", itemType: ItemType.DRINK, basePrice: 100, category: "Drinks" },

  // Services
  { name: "Hot Shower", nameNe: "तातो पानी नुहाउने", unit: "use", itemType: ItemType.SERVICE, basePrice: 300, category: "Services" },
  { name: "Device Charging", nameNe: "चार्जिङ", unit: "use", itemType: ItemType.SERVICE, basePrice: 200, category: "Services" },
  { name: "WiFi 1hr", nameNe: "वाइफाइ १ घण्टा", unit: "hour", itemType: ItemType.SERVICE, basePrice: 300, category: "Services" },
  { name: "Laundry", nameNe: "लुगा धुने", unit: "use", itemType: ItemType.SERVICE, basePrice: 500, category: "Services" },
];

// ── Main seed function ──

async function main() {
  console.log("🏔️  Himalayan Stays — Seed Script");
  console.log("==================================\n");

    // ── 1. Users ──
    console.log("👤 Upserting users...");

    const adminHash = await bcrypt.hash("admin123", 10);
    const ownerHash = await bcrypt.hash("owner123", 10);
    const trekkerHash = await bcrypt.hash("trekker123", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@himalayanstays.com" },
      update: {},
      create: {
        email: "admin@himalayanstays.com",
        name: "Admin",
        role: "ADMIN",
        passwordHash: adminHash,
      },
    });
    console.log(`  ✓ Admin: ${admin.id}`);

    const owner = await prisma.user.upsert({
      where: { email: "owner@himalayanstays.com" },
      update: {},
      create: {
        email: "owner@himalayanstays.com",
        name: "Pemba Sherpa",
        role: "LODGE_OWNER",
        passwordHash: ownerHash,
      },
    });
    console.log(`  ✓ Lodge Owner (Pemba Sherpa): ${owner.id}`);

    const trekker = await prisma.user.upsert({
      where: { email: "trekker@example.com" },
      update: {},
      create: {
        email: "trekker@example.com",
        name: "Alex Thompson",
        role: "TREKKER",
        passwordHash: trekkerHash,
        nationality: "Australia",
      },
    });
    console.log(`  ✓ Trekker (Alex Thompson): ${trekker.id}`);

    // ── 2. Clean existing seed data ──
    console.log("\n🧹 Cleaning existing lodges, menus, and itineraries...");

    const existingSlugs = lodgeDefs.map((l) => l.slug);
    const existingLodges = await prisma.lodge.findMany({
      where: { slug: { in: existingSlugs } },
      select: { id: true },
    });
    const existingLodgeIds = existingLodges.map((l) => l.id);

    if (existingLodgeIds.length > 0) {
      // Delete in dependency order
      await prisma.itineraryStop.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.tabItem.deleteMany({
        where: { tab: { lodgeId: { in: existingLodgeIds } } },
      });
      await prisma.guestTab.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.review.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.bookingLeg.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.dailySalesSummary.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.lodgeDevice.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      // Delete menu data — must delete in strict FK order
      for (const lodgeId of existingLodgeIds) {
        // Get all category IDs for this lodge
        const cats = await prisma.menuCategory.findMany({
          where: { lodgeId },
          select: { id: true },
        });
        const catIds = cats.map((c) => c.id);

        if (catIds.length > 0) {
          // Delete tab_items referencing menu_items in these categories
          await prisma.tabItem.deleteMany({
            where: { menuItem: { categoryId: { in: catIds } } },
          });
          // Delete menu_items in these categories
          await prisma.menuItem.deleteMany({
            where: { categoryId: { in: catIds } },
          });
        }
        // Also delete any menu_items by lodgeId directly
        await prisma.menuItem.deleteMany({ where: { lodgeId } });
        // Now safe to delete categories
        await prisma.menuCategory.deleteMany({ where: { lodgeId } });
      }
      await prisma.seasonPricing.deleteMany({
        where: { room: { lodgeId: { in: existingLodgeIds } } },
      });
      await prisma.room.deleteMany({ where: { lodgeId: { in: existingLodgeIds } } });
      await prisma.lodge.deleteMany({ where: { id: { in: existingLodgeIds } } });
      console.log(`  ✓ Removed ${existingLodgeIds.length} existing lodges and related data`);
    }

    // Delete template itineraries
    const templateItineraries = await prisma.itinerary.findMany({
      where: { isTemplate: true, trekRoute: TrekRoute.EBC },
      select: { id: true },
    });
    if (templateItineraries.length > 0) {
      const templateIds = templateItineraries.map((i) => i.id);
      await prisma.itineraryStop.deleteMany({ where: { itineraryId: { in: templateIds } } });
      await prisma.itinerary.deleteMany({ where: { id: { in: templateIds } } });
      console.log(`  ✓ Removed ${templateIds.length} existing EBC template itineraries`);
    }

    // ── 3. Create lodges, rooms, and menus ──
    console.log("\n🏠 Creating lodges...");

    const createdLodges: Record<string, string> = {}; // slug -> id

    for (const def of lodgeDefs) {
      const lodge = await prisma.lodge.create({
        data: {
          name: def.name,
          slug: def.slug,
          description: def.description,
          altitudeMeters: def.altitude,
          latitude: def.lat,
          longitude: def.lng,
          trekRoute: TrekRoute.EBC,
          trailPosition: def.trailPosition,
          village: def.village,
          district: def.district,
          ownerId: owner.id,
          managedBy: def.managedBy,
          amenities: def.amenities,
          isActive: true,
          photos: [],
        },
      });
      createdLodges[def.slug] = lodge.id;
      console.log(`  ✓ ${def.name} (${def.altitude}m) — ${lodge.id}`);

      // ── Rooms ──
      const roomDefs: { name: string; roomType: RoomType; capacity: number; price: number }[] = [
        { name: "Private Double", roomType: RoomType.PRIVATE_DOUBLE, capacity: 2, price: def.roomPrices.PRIVATE_DOUBLE },
        { name: "Private Twin", roomType: RoomType.PRIVATE_TWIN, capacity: 2, price: def.roomPrices.PRIVATE_TWIN },
        { name: "Private Single", roomType: RoomType.PRIVATE_SINGLE, capacity: 1, price: def.roomPrices.PRIVATE_SINGLE },
        { name: "Dorm Bed", roomType: RoomType.DORM, capacity: 6, price: def.roomPrices.DORM },
      ];

      // Extra rooms for Namche
      if (def.extraRooms) {
        roomDefs.push(
          { name: "Room 5", roomType: RoomType.PRIVATE_DOUBLE, capacity: 2, price: def.roomPrices.PRIVATE_DOUBLE },
          { name: "Room 6", roomType: RoomType.PRIVATE_TWIN, capacity: 2, price: def.roomPrices.PRIVATE_TWIN },
        );
      }

      for (const room of roomDefs) {
        await prisma.room.create({
          data: {
            lodgeId: lodge.id,
            name: room.name,
            roomType: room.roomType,
            capacity: room.capacity,
            basePriceNpr: room.price,
            isActive: true,
          },
        });
      }
      console.log(`    → ${roomDefs.length} rooms created`);

      // ── Menu categories & items ──
      const categoryNames = ["Food", "Drinks", "Services"] as const;
      const categoryMap: Record<string, string> = {};

      for (let i = 0; i < categoryNames.length; i++) {
        const cat = await prisma.menuCategory.create({
          data: {
            lodgeId: lodge.id,
            name: categoryNames[i],
            sortOrder: i + 1,
            isActive: true,
          },
        });
        categoryMap[categoryNames[i]] = cat.id;
      }

      let menuItemCount = 0;
      for (const item of menuItemDefs) {
        const price = scalePrice(item.basePrice, def.village);
        await prisma.menuItem.create({
          data: {
            categoryId: categoryMap[item.category],
            lodgeId: lodge.id,
            name: item.name,
            nameNe: item.nameNe ?? null,
            priceNpr: price,
            unit: item.unit,
            itemType: item.itemType,
            isActive: true,
            sortOrder: menuItemCount + 1,
          },
        });
        menuItemCount++;
      }
      console.log(`    → 3 menu categories, ${menuItemCount} menu items created`);
    }

    // ── 4. Itinerary template ──
    console.log("\n📋 Creating itinerary template...");

    const itinerary = await prisma.itinerary.create({
      data: {
        name: "Classic EBC Trek",
        trekRoute: TrekRoute.EBC,
        totalDays: 12,
        isTemplate: true,
        description: "The classic Everest Base Camp trek through the heart of the Khumbu region",
        createdById: admin.id,
      },
    });

    const stops = [
      { slug: "lukla-guest-house", dayNumber: 1, nights: 1, notes: "Arrive in Lukla, short walk to settle in" },
      { slug: "namche-bazaar-lodge", dayNumber: 2, nights: 2, notes: "Acclimatization day in Namche — explore the market and hike to Everest View Hotel" },
      { slug: "tengboche-mountain-lodge", dayNumber: 4, nights: 1, notes: "Visit Tengboche Monastery, stunning Ama Dablam views" },
      { slug: "dingboche-valley-inn", dayNumber: 5, nights: 2, notes: "Acclimatization day — hike to Nagarjun Hill for Lhotse and Island Peak views" },
      { slug: "lobuche-peak-lodge", dayNumber: 7, nights: 1, notes: "Trek along the Khumbu Glacier lateral moraine" },
      { slug: "gorak-shep-highland-inn", dayNumber: 8, nights: 1, notes: "Visit Everest Base Camp and climb Kala Patthar for sunrise" },
    ];

    for (const stop of stops) {
      await prisma.itineraryStop.create({
        data: {
          itineraryId: itinerary.id,
          lodgeId: createdLodges[stop.slug],
          dayNumber: stop.dayNumber,
          nights: stop.nights,
          notes: stop.notes,
        },
      });
    }
    console.log(`  ✓ "Classic EBC Trek" — ${stops.length} stops created`);

    // ── Done ──
    console.log("\n==================================");
    console.log("✅ Seed complete!");
    console.log(`   • 3 users (admin, lodge owner, trekker)`);
    console.log(`   • ${lodgeDefs.length} lodges with rooms and menus`);
    console.log(`   • 1 itinerary template with ${stops.length} stops`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
