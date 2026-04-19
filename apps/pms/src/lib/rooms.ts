import { getDoc, putDoc } from "@/lib/db";
import type { RoomStatusDoc, RoomSlot, WalkInDoc } from "@himalayan-stays/shared";
import { openTab } from "@/lib/tabs";

const LODGE_ID = "default";
const ROOM_STATUS_ID = `room_status:${LODGE_ID}`;

export async function getRoomStatus(): Promise<RoomStatusDoc | null> {
  return getDoc<RoomStatusDoc>(ROOM_STATUS_ID);
}

export async function initializeRooms(
  rooms: { name: string; type: string }[]
): Promise<void> {
  const existing = await getRoomStatus();
  if (existing) return;

  const slots: RoomSlot[] = rooms.map((r, i) => ({
    room_id: `room_${i + 1}`,
    room_name: r.name,
    status: "VACANT" as const,
  }));

  const doc = {
    _id: ROOM_STATUS_ID,
    type: "room_status" as const,
    lodge_id: LODGE_ID,
    rooms: slots,
    room_types: Object.fromEntries(
      rooms.map((r, i) => [`room_${i + 1}`, r.type])
    ),
    updated_at: new Date().toISOString(),
  };

  await putDoc(doc);
}

export async function addRoom(name: string, type: string): Promise<void> {
  const doc = await getDoc<RoomStatusDoc & { room_types?: Record<string, string> }>(ROOM_STATUS_ID);
  if (!doc) throw new Error("Room status not initialized");

  const nextId = `room_${doc.rooms.length + 1}`;
  const newSlot: RoomSlot = {
    room_id: nextId,
    room_name: name,
    status: "VACANT",
  };

  doc.rooms.push(newSlot);
  doc.room_types = { ...doc.room_types, [nextId]: type };
  doc.updated_at = new Date().toISOString();
  await putDoc(doc);
}

export async function updateRoomSlot(
  roomId: string,
  updates: Partial<RoomSlot>
): Promise<void> {
  const doc = await getDoc<RoomStatusDoc>(ROOM_STATUS_ID);
  if (!doc) throw new Error("Room status not initialized");
  const idx = doc.rooms.findIndex((r) => r.room_id === roomId);
  if (idx === -1) throw new Error(`Room ${roomId} not found`);

  doc.rooms[idx] = { ...doc.rooms[idx], ...updates };
  doc.updated_at = new Date().toISOString();
  await putDoc(doc);
}

export async function checkIn(
  roomId: string,
  guestName: string,
  groupSize: number = 1,
  expectedCheckout?: string,
  nationality?: string,
  phone?: string,
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();

  await updateRoomSlot(roomId, {
    status: "OCCUPIED",
    guest_name: guestName,
    check_in_date: now,
    expected_checkout: expectedCheckout,
  });

  const walkIn: WalkInDoc = {
    _id: `walkin:${LODGE_ID}:${Date.now()}`,
    type: "walkin",
    lodge_id: LODGE_ID,
    guest_name: guestName,
    group_size: groupSize,
    room_id: roomId,
    check_in: now,
    expected_checkout: expectedCheckout,
    nationality,
    phone,
    notes,
    created_at: now,
    synced: false,
  };

  await putDoc(walkIn);

  // Auto-open a POS tab for the guest
  await openTab(guestName, roomId);
}

export async function checkOut(roomId: string): Promise<void> {
  await updateRoomSlot(roomId, {
    status: "VACANT",
    guest_name: undefined,
    booking_ref: undefined,
    check_in_date: undefined,
    expected_checkout: undefined,
  });
}

export async function getRoomType(roomId: string): Promise<string> {
  const doc = await getDoc<RoomStatusDoc & { room_types?: Record<string, string> }>(
    ROOM_STATUS_ID
  );
  return doc?.room_types?.[roomId] ?? "";
}
