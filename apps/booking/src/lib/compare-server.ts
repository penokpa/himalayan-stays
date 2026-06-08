import { cookies } from "next/headers";
import { COMPARE_COOKIE, parseCompare } from "@/lib/compare";

export async function getCompare(): Promise<string[]> {
  const c = await cookies();
  return parseCompare(c.get(COMPARE_COOKIE)?.value);
}
