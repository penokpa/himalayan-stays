"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Day {
  iso: string;
  totalRooms: number;
  bookedRooms: number;
  status: "available" | "partial" | "full";
}

interface Props {
  lodgeSlug: string;
  year: number;
  monthIndex: number; // 0-11
  days: Day[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const m = monthIndex + delta;
  return {
    year: year + Math.floor(m / 12),
    monthIndex: ((m % 12) + 12) % 12,
  };
}

function ymKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({
  lodgeSlug,
  year,
  monthIndex,
  days,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const today = todayIso();
  const from = params.get("from");
  const to = params.get("to");

  function navigate(newFrom: string | null, newTo: string | null, newMonth?: string) {
    const next = new URLSearchParams(params.toString());
    if (newFrom) next.set("from", newFrom);
    else next.delete("from");
    if (newTo) next.set("to", newTo);
    else next.delete("to");
    if (newMonth !== undefined) {
      if (newMonth) next.set("month", newMonth);
      else next.delete("month");
    }
    startTransition(() => {
      router.push(`/lodge/${lodgeSlug}${next.toString() ? `?${next.toString()}` : ""}`, {
        scroll: false,
      });
    });
  }

  function handleDayClick(iso: string, day: Day) {
    if (iso < today) return; // past
    if (day.status === "full") return; // can't start on a full day
    if (!from || (from && to)) {
      navigate(iso, null);
    } else if (iso === from) {
      navigate(null, null);
    } else if (iso < from) {
      navigate(iso, null);
    } else {
      navigate(from, iso);
    }
  }

  // Build a 6-row grid (max needed)
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0=Sun
  const cells: (Day | null)[] = [
    ...Array.from({ length: startWeekday }).map(() => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = shiftMonth(year, monthIndex, -1);
  const next = shiftMonth(year, monthIndex, 1);
  const prevMonthKey = ymKey(prev.year, prev.monthIndex);
  const nextMonthKey = ymKey(next.year, next.monthIndex);

  // Disable nav backwards past the current month
  const todayDate = new Date();
  const currentMonthKey = ymKey(todayDate.getUTCFullYear(), todayDate.getUTCMonth());
  const canGoBack = ymKey(year, monthIndex) > currentMonthKey;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoBack && navigate(from, to, prevMonthKey)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="rounded-md p-1.5 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {MONTH_NAMES[monthIndex]} {year}
        </h3>
        <button
          type="button"
          onClick={() => navigate(from, to, nextMonthKey)}
          aria-label="Next month"
          className="rounded-md p-1.5 text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} />;
          const isPast = cell.iso < today;
          const isFrom = cell.iso === from;
          const isTo = cell.iso === to;
          const inRange =
            from && to ? cell.iso > from && cell.iso < to : false;
          const isFull = cell.status === "full";
          const disabled = isPast || isFull;

          let cls =
            "relative flex aspect-square flex-col items-center justify-center rounded-md text-xs transition";
          if (disabled) {
            cls +=
              " cursor-not-allowed text-stone-300 line-through dark:text-stone-600";
          } else if (isFrom || isTo) {
            cls +=
              " cursor-pointer bg-emerald-700 font-bold text-white shadow-sm";
          } else if (inRange) {
            cls +=
              " cursor-pointer bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
          } else if (cell.status === "available") {
            cls +=
              " cursor-pointer bg-emerald-50 text-stone-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-stone-200 dark:hover:bg-emerald-950/60";
          } else if (cell.status === "partial") {
            cls +=
              " cursor-pointer bg-amber-50 text-stone-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-stone-200 dark:hover:bg-amber-950/60";
          } else {
            cls += " bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600";
          }

          const dayNum = Number(cell.iso.slice(8));
          const remaining = cell.totalRooms - cell.bookedRooms;
          const tip = isPast
            ? "Past date"
            : isFull
            ? "Fully booked"
            : `${remaining}/${cell.totalRooms} rooms available`;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => !disabled && handleDayClick(cell.iso, cell)}
              disabled={disabled}
              aria-label={`${cell.iso} — ${tip}`}
              title={tip}
              className={cls}
            >
              <span>{dayNum}</span>
              {!disabled && cell.totalRooms > 0 && (
                <span className="mt-0.5 text-[9px] leading-none opacity-70">
                  {remaining}/{cell.totalRooms}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
        <Legend swatch="bg-emerald-50 dark:bg-emerald-950/30" label="Available" />
        <Legend swatch="bg-amber-50 dark:bg-amber-950/30" label="Partial" />
        <Legend swatch="bg-stone-100 dark:bg-stone-800" label="Full" />
        <Legend swatch="bg-emerald-700" label="Selected" textOnSwatch />
      </div>

      {(from || to) && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-stone-600 dark:text-stone-300">
            {from && to
              ? `${from} → ${to} (${Math.round(
                  (Date.UTC(
                    Number(to.slice(0, 4)),
                    Number(to.slice(5, 7)) - 1,
                    Number(to.slice(8))
                  ) -
                    Date.UTC(
                      Number(from.slice(0, 4)),
                      Number(from.slice(5, 7)) - 1,
                      Number(from.slice(8))
                    )) /
                    MS_PER_DAY
                )} nights)`
              : `${from} — pick check-out`}
          </span>
          <button
            type="button"
            onClick={() => navigate(null, null)}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function Legend({
  swatch,
  label,
  textOnSwatch,
}: {
  swatch: string;
  label: string;
  textOnSwatch?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className={`inline-block h-3 w-3 rounded-sm ${swatch} ring-1 ring-stone-300/60 dark:ring-stone-700`}
      />
      <span className={textOnSwatch ? "text-stone-600 dark:text-stone-300" : ""}>{label}</span>
    </span>
  );
}
