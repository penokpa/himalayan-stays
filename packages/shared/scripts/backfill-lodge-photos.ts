// One-off: give every lodge 3 stable placeholder photos (picsum.photos seeded
// by slug). Skips lodges that already have at least one photo so this won't
// overwrite real uploads.
//
// Run from packages/shared:
//   npx tsx scripts/backfill-lodge-photos.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function placeholderPhotosFor(slug: string): string[] {
  return [
    `https://picsum.photos/seed/lodge-${slug}-1/1200/800`,
    `https://picsum.photos/seed/lodge-${slug}-2/1200/800`,
    `https://picsum.photos/seed/lodge-${slug}-3/1200/800`,
  ];
}

async function main() {
  const lodges = await prisma.lodge.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, photos: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const lodge of lodges) {
    if (lodge.photos.length > 0) {
      skipped++;
      continue;
    }
    await prisma.lodge.update({
      where: { id: lodge.id },
      data: { photos: placeholderPhotosFor(lodge.slug) },
    });
    updated++;
    console.log(`  ✓ ${lodge.name}`);
  }

  console.log(`\nDone. ${updated} lodge(s) backfilled, ${skipped} already had photos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
