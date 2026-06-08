// One-off: give every active lodge its own LODGE_OWNER user so the
// /owner/bookings view actually scopes to per-lodge ownership. Idempotent —
// safe to re-run; existing owners and lodges are reused where possible.
//
// Strategy:
//   - Pemba Sherpa (owner@himalayanstays.com) stays as owner of Namche Hotel &
//     Lodge so the canonical test login still has lodges + bookings to look at.
//   - Every other lodge gets a brand-new owner with email
//       owner+<slug>@himalayanstays.com  (Gmail-style alias, password: owner123)
//     and name derived from the lodge.
//   - Existing booking rows are NOT touched — only the Lodge.ownerId pointer.
//
// Run from packages/shared:
//   npx tsx scripts/assign-lodge-owners.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PEMBA_EMAIL = "owner@himalayanstays.com";
const PEMBA_LODGE_SLUG = "namche-hotel-lodge";
const DEFAULT_PASSWORD = "owner123";

function ownerEmailFor(slug: string): string {
  return `owner+${slug}@himalayanstays.com`;
}

function ownerNameFor(lodgeName: string): string {
  // Strip generic suffixes for a cleaner human name
  return `${lodgeName.replace(/\s+(Lodge|Inn|Hotel|Stay|House|Retreat|Home).*$/i, "")} Owner`;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const lodges = await prisma.lodge.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, ownerId: true },
    orderBy: { name: "asc" },
  });

  let created = 0;
  let reassigned = 0;
  let unchanged = 0;
  const credentials: { lodge: string; email: string }[] = [];

  for (const lodge of lodges) {
    // Pemba retains Namche Hotel & Lodge
    if (lodge.slug === PEMBA_LODGE_SLUG) {
      const pemba = await prisma.user.findUnique({ where: { email: PEMBA_EMAIL } });
      if (!pemba) {
        console.log(`  ! Pemba (${PEMBA_EMAIL}) not found — skipping ${lodge.name}`);
        continue;
      }
      if (lodge.ownerId !== pemba.id) {
        await prisma.lodge.update({ where: { id: lodge.id }, data: { ownerId: pemba.id } });
        reassigned++;
        console.log(`  ↻ ${lodge.name} → Pemba Sherpa`);
      } else {
        unchanged++;
      }
      credentials.push({ lodge: lodge.name, email: PEMBA_EMAIL });
      continue;
    }

    const email = ownerEmailFor(lodge.slug);
    const name = ownerNameFor(lodge.name);

    const owner = await prisma.user.upsert({
      where: { email },
      // Backfill emailVerifiedAt on existing rows so login works for owners
      // created by an earlier run of this script (which missed this field).
      update: { emailVerifiedAt: new Date() },
      create: {
        email,
        name,
        role: "LODGE_OWNER",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
    if (owner.id !== lodge.ownerId) {
      // Did the upsert create the user, or did it already exist?
      const wasNewlyCreated =
        (await prisma.user.count({ where: { email, createdAt: { gte: new Date(Date.now() - 5000) } } })) > 0;
      if (wasNewlyCreated) created++;

      await prisma.lodge.update({ where: { id: lodge.id }, data: { ownerId: owner.id } });
      reassigned++;
      console.log(`  ↻ ${lodge.name} → ${name} (${email})`);
    } else {
      unchanged++;
    }
    credentials.push({ lodge: lodge.name, email });
  }

  console.log(
    `\nDone. ${reassigned} lodge(s) reassigned, ${unchanged} already correct, ${created} new owner user(s).`
  );
  console.log(`\nLogin credentials (password is "${DEFAULT_PASSWORD}" for every owner):`);
  for (const c of credentials) {
    console.log(`  ${c.email.padEnd(50)} → ${c.lodge}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
