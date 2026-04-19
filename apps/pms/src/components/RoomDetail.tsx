import { useState, useEffect, useCallback } from "react";
import type { RoomSlot, TabDoc } from "@himalayan-stays/shared";
import { checkOut, updateRoomSlot } from "@/lib/rooms";
import { getDocsByPrefix } from "@/lib/db";

interface Props {
  room: RoomSlot;
  roomType: string;
  onClose: () => void;
  onDone: () => void;
}

export default function RoomDetail({ room, roomType, onClose, onDone }: Props) {
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roomTabs, setRoomTabs] = useState<TabDoc[]>([]);

  useEffect(() => {
    // Load all tabs for this room (open + settled)
    getDocsByPrefix<TabDoc>("tab:default:").then((allTabs) => {
      const matching = allTabs
        .filter((t) => t.room_id === room.room_id)
        .sort(
          (a, b) =>
            new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
        );
      setRoomTabs(matching);
    });
  }, [room.room_id]);

  const handleCheckOut = useCallback(async () => {
    if (!confirmingCheckout) {
      setConfirmingCheckout(true);
      return;
    }
    setSubmitting(true);
    try {
      await checkOut(room.room_id);
      onDone();
    } catch (err) {
      console.error("Check-out failed:", err);
      setSubmitting(false);
    }
  }, [confirmingCheckout, room.room_id, onDone]);

  const handleToggleMaintenance = useCallback(async () => {
    setSubmitting(true);
    try {
      if (room.status === "MAINTENANCE") {
        await updateRoomSlot(room.room_id, { status: "VACANT" });
      } else {
        await updateRoomSlot(room.room_id, { status: "MAINTENANCE" });
      }
      onDone();
    } catch (err) {
      console.error("Status toggle failed:", err);
      setSubmitting(false);
    }
  }, [room.room_id, room.status, onDone]);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatTime = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const statusColors: Record<string, string> = {
    VACANT: "text-green-400",
    OCCUPIED: "text-red-400",
    MAINTENANCE: "text-yellow-400",
    BLOCKED: "text-gray-400",
  };

  const tabStatusBadge = (tab: TabDoc) => {
    if (tab.status === "OPEN") {
      return (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
          Open
        </span>
      );
    }
    if (tab.status === "SETTLED") {
      const methodLabel =
        tab.settlement_method === "CASH"
          ? "Cash"
          : tab.settlement_method === "ESEWA"
            ? "eSewa"
            : tab.settlement_method === "KHALTI"
              ? "Khalti"
              : tab.settlement_method === "INCLUDED_IN_BOOKING"
                ? "Room Tab"
                : "Settled";
      return (
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
          {methodLabel}
        </span>
      );
    }
    return (
      <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full font-medium">
        {tab.status}
      </span>
    );
  };

  // Totals across all tabs
  const openTotal = roomTabs
    .filter((t) => t.status === "OPEN")
    .reduce((sum, t) => sum + t.tab_total_npr, 0);
  const settledTotal = roomTabs
    .filter((t) => t.status === "SETTLED")
    .reduce((sum, t) => sum + t.tab_total_npr, 0);
  const grandTotal = openTotal + settledTotal;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={onClose}
          className="min-h-12 min-w-12 flex items-center justify-center text-white/60 text-lg"
        >
          {"\u2715"}
        </button>
        <h2 className="text-lg font-bold">{room.room_name}</h2>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status badge */}
        <div className="bg-[var(--color-surface)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Status</span>
            <span className={`text-lg font-bold ${statusColors[room.status]}`}>
              {room.status}
            </span>
          </div>
          {roomType && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-white/50 text-sm">Type</span>
              <span className="text-base text-white/80">{roomType}</span>
            </div>
          )}
        </div>

        {/* Guest info (occupied rooms) */}
        {room.status === "OCCUPIED" && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wide">
              Guest
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Name</span>
              <span className="text-lg font-semibold">
                {room.guest_name || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Check-in</span>
              <span className="text-base text-white/80">
                {formatDate(room.check_in_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Expected Checkout</span>
              <span className="text-base text-white/80">
                {formatDate(room.expected_checkout)}
              </span>
            </div>
            {room.booking_ref && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Booking Ref</span>
                <span className="text-base text-white/80">
                  {room.booking_ref}
                </span>
              </div>
            )}
          </div>
        )}

        {/* POS Tabs for this room */}
        {room.status === "OCCUPIED" && (
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>{"\uD83E\uDDFE"}</span> POS Tabs
              </h3>
            </div>

            {roomTabs.length === 0 ? (
              <div className="px-4 py-4 text-center text-white/30 text-sm">
                No tabs yet for this room
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {roomTabs.map((tab) => (
                  <div key={tab._id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {tabStatusBadge(tab)}
                        <span className="text-xs text-white/40">
                          {formatTime(tab.opened_at)}
                          {tab.closed_at && ` — ${formatTime(tab.closed_at)}`}
                        </span>
                      </div>
                      <span
                        className={`text-base font-bold ${
                          tab.status === "OPEN"
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        Rs. {tab.tab_total_npr.toLocaleString()}
                      </span>
                    </div>

                    {/* Item list */}
                    {tab.items.filter((i) => !i.voided).length > 0 && (
                      <div className="space-y-1 ml-1">
                        {tab.items
                          .filter((i) => !i.voided)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm text-white/60"
                            >
                              <span>
                                {item.quantity}x {item.item_name}
                              </span>
                              <span>Rs. {item.line_total_npr}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Totals summary */}
                <div className="px-4 py-3 bg-white/5 space-y-1">
                  {openTotal > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yellow-400">Outstanding</span>
                      <span className="font-bold text-yellow-400">
                        Rs. {openTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {settledTotal > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400">Settled</span>
                      <span className="font-bold text-green-400">
                        Rs. {settledTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base pt-1 border-t border-white/10">
                    <span className="font-bold">Total Charges</span>
                    <span className="font-bold text-white">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maintenance toggle */}
        {(room.status === "VACANT" || room.status === "MAINTENANCE") && (
          <button
            onClick={handleToggleMaintenance}
            disabled={submitting}
            className="w-full min-h-14 rounded-lg bg-[var(--color-surface)] border border-yellow-500/30 text-yellow-400 text-base font-medium disabled:opacity-40"
          >
            {room.status === "MAINTENANCE"
              ? "Mark as Vacant"
              : "Mark as Maintenance"}
          </button>
        )}
      </div>

      {/* Actions */}
      {room.status === "OCCUPIED" && (
        <div className="p-4 border-t border-white/10 bg-[var(--color-surface)]">
          {openTotal > 0 && (
            <p className="text-center text-xs text-yellow-400 mb-2">
              Rs. {openTotal.toLocaleString()} outstanding — settle open tabs
              before checkout
            </p>
          )}
          <button
            onClick={handleCheckOut}
            disabled={submitting}
            className={`w-full min-h-14 rounded-lg text-white text-lg font-bold disabled:opacity-40 ${
              confirmingCheckout ? "bg-red-700" : "bg-red-600"
            }`}
          >
            {submitting
              ? "Checking Out..."
              : confirmingCheckout
                ? "Tap Again to Confirm"
                : "Check Out"}
          </button>
          {confirmingCheckout && (
            <button
              onClick={() => setConfirmingCheckout(false)}
              className="w-full min-h-12 mt-2 rounded-lg bg-white/10 text-white/60 text-base"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
