import { useEffect, useMemo, useState } from "react";
import type { WalkInDoc } from "@himalayan-stays/shared";
import { listWalkIns } from "@/lib/rooms";

type Range = "today" | "7d" | "30d" | "all";

const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All",
};

function startOfRange(range: Range): number {
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function WalkInsList() {
  const [walkIns, setWalkIns] = useState<WalkInDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("today");

  useEffect(() => {
    listWalkIns()
      .then(setWalkIns)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const cutoff = startOfRange(range);
    return walkIns.filter((w) => new Date(w.check_in).getTime() >= cutoff);
  }, [walkIns, range]);

  const stats = useMemo(() => {
    const totalGuests = filtered.reduce((sum, w) => sum + (w.group_size || 1), 0);
    const unsynced = filtered.filter((w) => !w.synced).length;
    return { count: filtered.length, totalGuests, unsynced };
  }, [filtered]);

  if (loading) {
    return <p className="pt-12 text-center text-white/50">Loading walk-ins…</p>;
  }

  return (
    <>
      {/* Range filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(["today", "7d", "30d", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              range === r
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] text-white/60"
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className="text-2xl font-bold text-white">{stats.count}</p>
          <p className="text-xs text-white/50">walk-ins</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className="text-2xl font-bold text-white">{stats.totalGuests}</p>
          <p className="text-xs text-white/50">guests</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface)] p-3">
          <p className={`text-2xl font-bold ${stats.unsynced > 0 ? "text-yellow-400" : "text-white"}`}>
            {stats.unsynced}
          </p>
          <p className="text-xs text-white/50">unsynced</p>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-white/10 px-6 py-12 text-center text-white/40">
          No walk-ins {range === "today" ? "today" : `in the ${RANGE_LABELS[range].toLowerCase()}`}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div
              key={w._id}
              className="rounded-xl bg-[var(--color-surface)] p-4 border border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white">{w.guest_name}</h3>
                  <p className="mt-0.5 text-xs text-white/50">
                    Room {w.room_id ?? "—"} · {formatDateTime(w.check_in)}
                    {w.expected_checkout && ` → ${formatDate(w.expected_checkout)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
                    {w.group_size} {w.group_size === 1 ? "guest" : "guests"}
                  </span>
                  {!w.synced && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
                      offline
                    </span>
                  )}
                </div>
              </div>
              {(w.nationality || w.phone) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                  {w.nationality && <span>🌍 {w.nationality}</span>}
                  {w.phone && <span>📞 {w.phone}</span>}
                </div>
              )}
              {w.notes && (
                <p className="mt-2 rounded bg-white/5 px-2 py-1 text-xs text-white/60">
                  {w.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
