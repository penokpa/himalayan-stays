export const NPR_PER_USD = Number(process.env.NPR_PER_USD ?? 135);
// 1 USD = N EUR. 0.92 is a reasonable mid-2026 rate; replace with a live FX feed later.
export const EUR_PER_USD = Number(process.env.EUR_PER_USD ?? 0.92);

export const SUPPORTED_CURRENCIES = ["NPR", "USD", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_COOKIE = "hs-currency";
export const DEFAULT_CURRENCY: Currency = "NPR";

export function nprToUsd(npr: number): number {
  return Math.round((npr / NPR_PER_USD) * 100) / 100;
}

export function nprToEur(npr: number): number {
  return Math.round(((npr / NPR_PER_USD) * EUR_PER_USD) * 100) / 100;
}

/** Convert an NPR amount to the requested currency. */
export function convertFromNpr(npr: number, to: Currency): number {
  if (to === "NPR") return Math.round(npr);
  if (to === "USD") return nprToUsd(npr);
  if (to === "EUR") return nprToEur(npr);
  return Math.round(npr);
}

const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  NPR: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

const CURRENCY_PREFIX: Record<Currency, string> = {
  NPR: "NPR",
  USD: "USD",
  EUR: "EUR",
};

/** Format an NPR amount in the requested display currency. e.g. formatMoney(1500, "USD") → "USD 11.11" */
export function formatMoney(npr: number, currency: Currency = DEFAULT_CURRENCY): string {
  const value = convertFromNpr(npr, currency);
  return `${CURRENCY_PREFIX[currency]} ${CURRENCY_FORMATTERS[currency].format(value)}`;
}

export function isCurrency(s: string | undefined | null): s is Currency {
  return !!s && (SUPPORTED_CURRENCIES as readonly string[]).includes(s);
}
