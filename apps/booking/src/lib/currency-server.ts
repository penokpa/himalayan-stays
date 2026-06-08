import { cookies } from "next/headers";
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, type Currency, isCurrency } from "@/lib/currency";

/** Read the trekker-selected display currency from cookies (server only). */
export async function getCurrency(): Promise<Currency> {
  const c = await cookies();
  const v = c.get(CURRENCY_COOKIE)?.value;
  return isCurrency(v) ? v : DEFAULT_CURRENCY;
}
