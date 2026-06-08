"use client";

import { useEffect, useState } from "react";
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  formatMoney as formatMoneyImpl,
  isCurrency,
  type Currency,
} from "@/lib/currency";

/**
 * Read the user's selected currency from the cookie on the client.
 * Returns DEFAULT_CURRENCY during SSR / first paint.
 */
export function useCurrency(): {
  currency: Currency;
  format: (npr: number) => string;
} {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${CURRENCY_COOKIE}=`));
    if (!match) return;
    const v = decodeURIComponent(match.slice(CURRENCY_COOKIE.length + 1));
    if (isCurrency(v)) setCurrency(v);
  }, []);

  return {
    currency,
    format: (npr: number) => formatMoneyImpl(npr, currency),
  };
}
