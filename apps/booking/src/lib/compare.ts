export const COMPARE_COOKIE = "hs-compare";
export const COMPARE_MAX = 4;

export function parseCompare(value: string | undefined | null): string[] {
  if (!value) return [];
  const slugs = decodeURIComponent(value)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]+$/.test(s));
  return Array.from(new Set(slugs)).slice(0, COMPARE_MAX);
}

export function serializeCompare(slugs: string[]): string {
  return encodeURIComponent(slugs.slice(0, COMPARE_MAX).join(","));
}
