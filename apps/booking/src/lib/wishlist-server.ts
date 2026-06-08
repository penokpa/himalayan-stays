import { cookies } from "next/headers";
import { WISHLIST_COOKIE, parseWishlist } from "@/lib/wishlist";

/** Read the saved wishlist (slugs) from cookies. Server-only. */
export async function getWishlist(): Promise<string[]> {
  const c = await cookies();
  return parseWishlist(c.get(WISHLIST_COOKIE)?.value);
}
