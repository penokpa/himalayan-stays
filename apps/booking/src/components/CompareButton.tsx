"use client";

import { useState } from "react";
import { useCompare } from "@/lib/use-compare";

interface Props {
  slug: string;
  variant?: "overlay" | "inline";
}

export default function CompareButton({ slug, variant = "overlay" }: Props) {
  const { has, toggle, hydrated, max } = useCompare();
  const selected = has(slug);
  const [flash, setFlash] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(slug);
    if (result === "full") {
      setFlash(`Max ${max} lodges. Remove one first.`);
      setTimeout(() => setFlash(null), 2200);
    }
  }

  if (variant === "inline") {
    return (
      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={selected}
          aria-label={selected ? "Remove from comparison" : "Add to comparison"}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            selected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          }`}
        >
          <Bars filled={selected && hydrated} className="h-4 w-4" />
          {selected ? "Comparing" : "Compare"}
        </button>
        {flash && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white shadow">
            {flash}
          </span>
        )}
      </span>
    );
  }

  // overlay (corner of a card image, sits next to wishlist heart)
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      aria-label={selected ? "Remove from comparison" : "Add to comparison"}
      title={selected ? "Remove from comparison" : "Add to comparison"}
      className={`absolute right-12 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
        selected && hydrated
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-white/90 text-stone-700 hover:bg-white dark:bg-stone-800/90 dark:text-stone-200 dark:hover:bg-stone-800"
      }`}
    >
      <Bars filled={selected && hydrated} className="h-5 w-5" />
    </button>
  );
}

function Bars({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={filled ? 2.5 : 2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h18M3 12h12M3 19.5h6"
      />
    </svg>
  );
}
