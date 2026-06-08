"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Result {
  id: string;
  name: string;
  slug: string;
  village: string;
  district: string;
  altitudeMeters: number | null;
  trekRoute: string;
  photo: string | null;
}

const ROUTE_LABELS: Record<string, string> = {
  EBC: "Everest Base Camp",
  ABC: "Annapurna Base Camp",
  LANGTANG: "Langtang",
  MANASLU: "Manaslu",
  UPPER_MUSTANG: "Upper Mustang",
};

export default function LodgeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside closes
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lodges/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) {
        setOpen(false);
        setQ("");
        router.push(`/lodge/${pick.slug}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs">
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-stone-400 dark:text-stone-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search lodges…"
          className="w-full rounded-md border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 z-40 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900">
          {loading && results.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-stone-500 dark:text-stone-400">
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-stone-500 dark:text-stone-400">
              No lodges match &ldquo;{q.trim()}&rdquo;.
            </div>
          ) : (
            <ul role="listbox">
              {results.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/lodge/${r.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 px-3 py-2 transition ${
                      i === active
                        ? "bg-emerald-50 dark:bg-emerald-950/40"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800"
                    }`}
                  >
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md bg-stone-200 dark:bg-stone-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                        {r.name}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {r.village}
                        {r.altitudeMeters
                          ? ` · ${r.altitudeMeters.toLocaleString()}m`
                          : ""}
                        {" · "}
                        {ROUTE_LABELS[r.trekRoute] ?? r.trekRoute}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
