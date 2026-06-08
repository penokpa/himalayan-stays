"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SeasonGroup {
  season: "PEAK" | "SHOULDER" | "OFF" | "FESTIVAL";
  startDate: string;
  endDate: string;
  roomCount: number;
  minPriceNpr: number;
  maxPriceNpr: number;
}

const SEASON_LABELS: Record<SeasonGroup["season"], string> = {
  PEAK: "Peak",
  SHOULDER: "Shoulder",
  OFF: "Off-season",
  FESTIVAL: "Festival",
};

const SEASON_COLORS: Record<SeasonGroup["season"], string> = {
  PEAK: "bg-rose-50 text-rose-700 ring-rose-200",
  SHOULDER: "bg-amber-50 text-amber-700 ring-amber-200",
  OFF: "bg-sky-50 text-sky-700 ring-sky-200",
  FESTIVAL: "bg-purple-50 text-purple-700 ring-purple-200",
};

const DEFAULT_MULTIPLIER: Record<SeasonGroup["season"], number> = {
  PEAK: 1.5,
  SHOULDER: 1.2,
  OFF: 0.7,
  FESTIVAL: 1.75,
};

function formatDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SeasonsForm({ lodgeId }: { lodgeId: string }) {
  const router = useRouter();
  const [groups, setGroups] = useState<SeasonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    season: "PEAK" as SeasonGroup["season"],
    startDate: "",
    endDate: "",
    multiplier: "1.5",
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lodges/${lodgeId}/seasons`);
      if (!res.ok) throw new Error("Failed to load seasons");
      const data = await res.json();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lodgeId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lodges/${lodgeId}/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: form.season,
          startDate: form.startDate,
          endDate: form.endDate,
          multiplier: parseFloat(form.multiplier),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add");
      }
      setForm({
        season: "PEAK",
        startDate: "",
        endDate: "",
        multiplier: String(DEFAULT_MULTIPLIER.PEAK),
      });
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: SeasonGroup) {
    if (!confirm(`Delete ${SEASON_LABELS[g.season]} block ${g.startDate} → ${g.endDate}?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lodges/${lodgeId}/seasons`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: g.season,
          startDate: g.startDate,
          endDate: g.endDate,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Existing groups */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No seasonal pricing configured. Add one below to override base price for specific date ranges.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {groups.map((g, i) => (
            <li
              key={`${g.season}-${g.startDate}-${g.endDate}-${i}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${SEASON_COLORS[g.season]}`}
                  >
                    {SEASON_LABELS[g.season]}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(g.startDate)} → {formatDate(g.endDate)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {g.roomCount} {g.roomCount === 1 ? "room" : "rooms"} ·{" "}
                  NPR {g.minPriceNpr.toLocaleString()}
                  {g.minPriceNpr !== g.maxPriceNpr
                    ? `–${g.maxPriceNpr.toLocaleString()}`
                    : ""}
                  /night
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(g)}
                disabled={saving}
                className="shrink-0 rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="mt-6 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Add Season Block</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Applies to all active rooms in this lodge. Multiplier × base price = season price.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Season</label>
            <select
              value={form.season}
              onChange={(e) => {
                const s = e.target.value as SeasonGroup["season"];
                setForm((f) => ({ ...f, season: s, multiplier: String(DEFAULT_MULTIPLIER[s]) }));
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="PEAK">Peak</option>
              <option value="SHOULDER">Shoulder</option>
              <option value="OFF">Off-season</option>
              <option value="FESTIVAL">Festival</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">End Date</label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Multiplier
            </label>
            <input
              type="number"
              required
              min={0.1}
              max={10}
              step={0.05}
              value={form.multiplier}
              onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              e.g. 1.5 for +50%, 0.7 for −30%
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving || !form.startDate || !form.endDate}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Adding…" : "Add Season Block"}
          </button>
        </div>
      </form>
    </div>
  );
}
