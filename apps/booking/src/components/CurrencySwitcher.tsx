"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type Currency,
  isCurrency,
} from "@/lib/currency";

function readCookie(): Currency {
  if (typeof document === "undefined") return DEFAULT_CURRENCY;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CURRENCY_COOKIE}=`));
  if (!match) return DEFAULT_CURRENCY;
  const v = decodeURIComponent(match.slice(CURRENCY_COOKIE.length + 1));
  return isCurrency(v) ? v : DEFAULT_CURRENCY;
}

function writeCookie(c: Currency) {
  document.cookie = `${CURRENCY_COOKIE}=${c};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export default function CurrencySwitcher() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    setCurrency(readCookie());
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Currency;
    setCurrency(next);
    writeCookie(next);
    router.refresh();
  }

  return (
    <label className="relative inline-flex items-center" aria-label="Display currency">
      <select
        value={currency}
        onChange={handleChange}
        className="cursor-pointer appearance-none rounded-md border border-stone-300 bg-white px-2.5 py-1 pr-7 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-stone-400 dark:text-stone-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}
