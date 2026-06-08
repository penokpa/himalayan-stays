"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  lodgeSlug: string;
  defaultFrom?: string;
  defaultTo?: string;
}

function tomorrow(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function plus(days: number, fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function AvailabilityChecker({
  lodgeSlug,
  defaultFrom,
  defaultTo,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const initialFrom = defaultFrom ?? params.get("from") ?? tomorrow();
  const initialTo = defaultTo ?? params.get("to") ?? plus(2, initialFrom);

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function update(nextFrom: string, nextTo: string) {
    const next = new URLSearchParams(params.toString());
    next.set("from", nextFrom);
    next.set("to", nextTo);
    startTransition(() => {
      router.push(`/lodge/${lodgeSlug}?${next.toString()}`);
    });
  }

  function handleFrom(v: string) {
    setFrom(v);
    let nextTo = to;
    if (new Date(nextTo) <= new Date(v)) {
      nextTo = plus(2, v);
      setTo(nextTo);
    }
    update(v, nextTo);
  }

  function handleTo(v: string) {
    setTo(v);
    update(from, v);
  }

  function handleClear() {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    startTransition(() => {
      router.push(`/lodge/${lodgeSlug}${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const datesActive = !!params.get("from");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="block text-xs font-medium text-stone-600 dark:text-stone-300">Check-in</span>
        <input
          type="date"
          value={from}
          min={today}
          onChange={(e) => handleFrom(e.target.value)}
          className="mt-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-stone-600 dark:text-stone-300">Check-out</span>
        <input
          type="date"
          value={to}
          min={plus(1, from)}
          onChange={(e) => handleTo(e.target.value)}
          className="mt-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
        />
      </label>
      {datesActive && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Clear
        </button>
      )}
    </div>
  );
}
