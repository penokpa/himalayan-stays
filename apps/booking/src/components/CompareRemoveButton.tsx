"use client";

import { useCompare } from "@/lib/use-compare";

export default function CompareRemoveButton({ slug }: { slug: string }) {
  const { remove, hydrated } = useCompare();
  if (!hydrated) return null;
  return (
    <button
      type="button"
      onClick={() => remove(slug)}
      aria-label="Remove from comparison"
      title="Remove from comparison"
      className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-rose-600 dark:bg-stone-800/90 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-rose-400"
    >
      ×
    </button>
  );
}
