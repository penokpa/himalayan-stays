import Link from "next/link";
import type { LodgeProgress } from "@/lib/owner-onboarding";

interface Props {
  /** When set, render a single-lodge checklist for that lodge (used on the lodge detail page). */
  progress?: LodgeProgress;
  /** When set, render a multi-lodge summary (used on the dashboard). */
  list?: LodgeProgress[];
  hasAnyLodge: boolean;
}

export default function OwnerOnboarding({ progress, list, hasAnyLodge }: Props) {
  // Empty-state: owner has no lodges at all
  if (!hasAnyLodge) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
              Add your first lodge
            </h3>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/80">
              We&apos;ll walk you through the setup. Once your lodge is live, trekkers can find and book it.
            </p>
            <Link
              href="/owner/lodges/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Get started →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Single-lodge detail variant
  if (progress) {
    if (progress.isComplete) {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            ✓ {progress.lodgeName} is fully set up
          </p>
          <p className="mt-0.5 text-emerald-900/80 dark:text-emerald-200/80">
            All four setup steps complete. Trekkers can now find and book your lodge.
          </p>
        </div>
      );
    }
    return (
      <ChecklistCard progress={progress} compact />
    );
  }

  // Dashboard summary: list of incomplete lodges
  if (list && list.length > 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
            Finish setting up your {list.length === 1 ? "lodge" : `${list.length} lodges`}
          </h3>
          {list.length > 1 && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {list.length} need attention
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
          {list.length === 1
            ? "Just a few more steps before trekkers can book."
            : "Each one needs a few more steps before trekkers can book."}
        </p>
        <ul className="mt-4 space-y-3">
          {list.slice(0, 3).map((p) => (
            <li
              key={p.lodgeId}
              className="rounded-lg bg-white p-3 ring-1 ring-amber-200/70 dark:bg-stone-900 dark:ring-amber-900/50"
            >
              <ChecklistCard progress={p} compact />
            </li>
          ))}
          {list.length > 3 && (
            <li className="text-xs text-amber-700 dark:text-amber-300">
              + {list.length - 3} more lodges to finish — see{" "}
              <Link href="/owner/lodges" className="font-semibold underline">
                My Lodges
              </Link>
              .
            </li>
          )}
        </ul>
      </div>
    );
  }

  return null;
}

function ChecklistCard({
  progress,
  compact = false,
}: {
  progress: LodgeProgress;
  compact?: boolean;
}) {
  const pct = (progress.completedCount / progress.totalCount) * 100;
  const nextStep = progress.items.find((i) => !i.done);
  return (
    <div className={compact ? "" : "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-stone-100">
          {progress.lodgeName}
          {!progress.isActive && (
            <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Hidden
            </span>
          )}
        </p>
        <span className="text-xs font-medium text-gray-500 dark:text-stone-400">
          {progress.completedCount}/{progress.totalCount} steps
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {progress.items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 text-xs ${
              item.done
                ? "text-stone-400 line-through dark:text-stone-500"
                : "text-stone-700 dark:text-stone-200"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                item.done
                  ? "bg-emerald-500 text-white"
                  : "border border-stone-300 dark:border-stone-600"
              }`}
            >
              {item.done && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      {nextStep && (
        <div className="mt-3">
          <Link
            href={progress.manageUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Next: {nextStep.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
