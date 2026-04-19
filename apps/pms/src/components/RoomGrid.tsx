import { useState, useEffect, useCallback } from "react";
import type { RoomStatusDoc, RoomSlot } from "@himalayan-stays/shared";
import { getRoomStatus, updateRoomSlot, addRoom } from "@/lib/rooms";
import { getDoc } from "@/lib/db";
import RoomSetup from "./RoomSetup";
import CheckInModal from "./CheckInModal";
import RoomDetail from "./RoomDetail";

const STATUS_COLORS: Record<RoomSlot["status"], string> = {
  VACANT: "border-green-500 bg-green-500/15",
  OCCUPIED: "border-red-500 bg-red-500/15",
  MAINTENANCE: "border-yellow-500 bg-yellow-500/15",
  BLOCKED: "border-gray-500 bg-gray-500/15",
};

const STATUS_DOT: Record<RoomSlot["status"], string> = {
  VACANT: "bg-green-400",
  OCCUPIED: "bg-red-400",
  MAINTENANCE: "bg-yellow-400",
  BLOCKED: "bg-gray-400",
};

export default function RoomGrid() {
  const [doc, setDoc] = useState<RoomStatusDoc | null | undefined>(undefined);
  const [roomTypes, setRoomTypes] = useState<Record<string, string>>({});
  const [selectedRoom, setSelectedRoom] = useState<RoomSlot | null>(null);
  const [modalMode, setModalMode] = useState<"checkin" | "detail" | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("Private Double");

  const loadRooms = useCallback(async () => {
    try {
      const status = await getRoomStatus();
      setDoc(status);
      // Load room types from the extended doc
      if (status) {
        try {
          const fullDoc = await getDoc<RoomStatusDoc & { room_types?: Record<string, string> }>(
            status._id
          );
          setRoomTypes(fullDoc?.room_types ?? {});
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
      setDoc(null);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleRoomTap = useCallback((room: RoomSlot) => {
    setSelectedRoom(room);
    if (room.status === "VACANT") {
      setModalMode("checkin");
    } else {
      setModalMode("detail");
    }
  }, []);

  const handleLongPressStart = useCallback(
    (room: RoomSlot) => {
      if (room.status === "OCCUPIED") return; // don't toggle occupied rooms
      const timer = setTimeout(async () => {
        try {
          const newStatus = room.status === "MAINTENANCE" ? "VACANT" : "MAINTENANCE";
          await updateRoomSlot(room.room_id, { status: newStatus });
          await loadRooms();
        } catch (err) {
          console.error("Toggle maintenance failed:", err);
        }
      }, 600);
      setLongPressTimer(timer);
    },
    [loadRooms]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleModalClose = useCallback(() => {
    setSelectedRoom(null);
    setModalMode(null);
  }, []);

  const handleModalDone = useCallback(async () => {
    setSelectedRoom(null);
    setModalMode(null);
    await loadRooms();
  }, [loadRooms]);

  // Loading state
  if (doc === undefined) {
    return (
      <div className="text-center pt-20 text-white/50">
        <p className="text-lg">Loading rooms...</p>
      </div>
    );
  }

  // No rooms yet — show setup
  if (doc === null) {
    return <RoomSetup onDone={loadRooms} />;
  }

  const rooms = doc.rooms;

  return (
    <>
      {/* Summary bar */}
      <div className="flex gap-3 mb-4 text-sm">
        <span className="text-green-400">
          {rooms.filter((r) => r.status === "VACANT").length} vacant
        </span>
        <span className="text-red-400">
          {rooms.filter((r) => r.status === "OCCUPIED").length} occupied
        </span>
        {rooms.filter((r) => r.status === "MAINTENANCE").length > 0 && (
          <span className="text-yellow-400">
            {rooms.filter((r) => r.status === "MAINTENANCE").length} maint.
          </span>
        )}
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-2 gap-3">
        {rooms.map((room) => (
          <button
            key={room.room_id}
            onClick={() => handleRoomTap(room)}
            onTouchStart={() => handleLongPressStart(room)}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            onMouseDown={() => handleLongPressStart(room)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            className={`rounded-xl border-2 p-4 text-left min-h-[100px] active:scale-[0.97] transition-transform ${STATUS_COLORS[room.status]}`}
          >
            {/* Status dot + room name */}
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${STATUS_DOT[room.status]}`} />
              <span className="text-xl font-bold leading-tight">
                {room.room_name}
              </span>
            </div>

            {/* Room type */}
            <p className="text-xs text-white/40 mt-1">
              {roomTypes[room.room_id] || ""}
            </p>

            {/* Guest name if occupied */}
            {room.status === "OCCUPIED" && room.guest_name && (
              <p className="text-sm text-white/70 mt-2 truncate">
                {room.guest_name}
              </p>
            )}

            {/* Maintenance label */}
            {room.status === "MAINTENANCE" && (
              <p className="text-xs text-yellow-400/70 mt-2">Maintenance</p>
            )}
          </button>
        ))}
      </div>

      {/* Add Room */}
      {showAddRoom ? (
        <div className="mt-4 rounded-xl bg-[var(--color-surface)] p-4 border border-white/10">
          <input
            type="text"
            placeholder="Room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="w-full rounded-lg bg-white/10 px-4 py-3 min-h-[48px] text-white placeholder:text-white/30 mb-3"
          />
          <select
            value={newRoomType}
            onChange={(e) => setNewRoomType(e.target.value)}
            className="w-full rounded-lg bg-white/10 px-4 py-3 min-h-[48px] text-white mb-3"
          >
            <option value="Private Single">Private Single</option>
            <option value="Private Double">Private Double</option>
            <option value="Private Twin">Private Twin</option>
            <option value="Dorm">Dorm</option>
          </select>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddRoom(false)}
              className="flex-1 rounded-lg bg-white/10 min-h-[48px] text-white/70"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!newRoomName.trim()) return;
                await addRoom(newRoomName.trim(), newRoomType);
                setNewRoomName("");
                setShowAddRoom(false);
                await loadRooms();
              }}
              className="flex-1 rounded-lg bg-[var(--color-primary)] min-h-[48px] text-white font-semibold"
            >
              Add Room
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddRoom(true)}
          className="mt-4 w-full rounded-xl border-2 border-dashed border-white/20 min-h-[60px] text-white/40 text-lg font-medium hover:border-white/40 hover:text-white/60 transition-colors"
        >
          + Add Room
        </button>
      )}

      {/* Hint */}
      <p className="text-center text-xs text-white/20 mt-4">
        Long-press a vacant room to toggle maintenance
      </p>

      {/* Modals */}
      {selectedRoom && modalMode === "checkin" && (
        <CheckInModal
          room={selectedRoom}
          roomType={roomTypes[selectedRoom.room_id] || ""}
          onClose={handleModalClose}
          onDone={handleModalDone}
        />
      )}
      {selectedRoom && modalMode === "detail" && (
        <RoomDetail
          room={selectedRoom}
          roomType={roomTypes[selectedRoom.room_id] || ""}
          onClose={handleModalClose}
          onDone={handleModalDone}
        />
      )}
    </>
  );
}
