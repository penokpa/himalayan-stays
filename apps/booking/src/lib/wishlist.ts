export const WISHLIST_COOKIE = "hs-wishlist";
const MAX_ITEMS = 50;

/** Parse a wishlist cookie value into an array of lodge slugs (deduped, capped). */
export function parseWishlist(value: string | undefined | null): string[] {
  if (!value) return [];
  const slugs = decodeURIComponent(value)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]+$/.test(s));
  return Array.from(new Set(slugs)).slice(0, MAX_ITEMS);
}

/** Serialize an array of slugs into a cookie value. */
export function serializeWishlist(slugs: string[]): string {
  return encodeURIComponent(slugs.slice(0, MAX_ITEMS).join(","));
}
