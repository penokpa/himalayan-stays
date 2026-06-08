"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/lib/use-compare";

export default function CompareBar() {
  const pathname = usePathname();
  const { slugs, remove, clear, hydrated, max } = useCompare();

  if (!hydrated) return null;
  if (slugs.length === 0) return null;
  if (pathname === "/compare") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Comparing {slugs.length}/{max}
          </p>
          <ul className="mt-1.5 flex flex-wrap items-center gap-2">
            {slugs.map((slug) => (
              <li
                key={slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900"
              >
                <span className="max-w-[180px] truncate">{slug}</span>
                <button
                  type="button"
                  onClick={() => remove(slug)}
                  aria-label={`Remove ${slug} from comparison`}
                  className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Clear
          </button>
          <Link
            href="/compare"
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
              slugs.length >= 2
                ? "bg-emerald-700 hover:bg-emerald-800"
                : "bg-stone-400 cursor-not-allowed pointer-events-none"
            }`}
            aria-disabled={slugs.length < 2}
          >
            Compare {slugs.length >= 2 ? `→` : `(pick ≥ 2)`}
          </Link>
        </div>
      </div>
    </div>
  );
}
