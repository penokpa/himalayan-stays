import { getDoc } from "@/lib/db";
import { initializeRooms } from "@/lib/rooms";
import { seedMenuIfEmpty } from "@/lib/menu";
import type { RoomStatusDoc } from "@himalayan-stays/shared";

const LODGE_ID = "default";
const ROOM_STATUS_ID = `room_status:${LODGE_ID}`;

/**
 * Seeds the POS with realistic demo data for a Namche Bazaar lodge.
 * Only runs once — skips if rooms already exist.
 */
export async function seedDemoData(): Promise<void> {
  // Seed rooms if empty
  const existing = await getDoc<RoomStatusDoc>(ROOM_STATUS_ID);
  if (!existing) {
    await initializeRooms([
      { name: "101", type: "Private Double" },
      { name: "102", type: "Private Double" },
      { name: "103", type: "Private Twin" },
      { name: "104", type: "Private Single" },
      { name: "105", type: "Private Twin" },
      { name: "106", type: "Private Double" },
      { name: "D1", type: "Dorm" },
      { name: "D2", type: "Dorm" },
    ]);
  }

  // Seed menu if empty
  await seedMenuIfEmpty();
}
