"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WISHLIST_COOKIE,
  parseWishlist,
  serializeWishlist,
} from "@/lib/wishlist";

const STORAGE_EVENT = "hs-wishlist-changed";

function readCookie(): string[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${WISHLIST_COOKIE}=`));
  if (!match) return [];
  return parseWishlist(match.slice(WISHLIST_COOKIE.length + 1));
}

function writeCookie(slugs: string[]) {
  document.cookie = `${WISHLIST_COOKIE}=${serializeWishlist(slugs)};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useWishlist() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSlugs(readCookie());
    setHydrated(true);
    function refresh() {
      setSlugs(readCookie());
    }
    window.addEventListener(STORAGE_EVENT, refresh);
    return () => window.removeEventListener(STORAGE_EVENT, refresh);
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    (slug: string) => {
      const next = slugs.includes(slug)
        ? slugs.filter((s) => s !== slug)
        : [...slugs, slug];
      writeCookie(next);
      setSlugs(next);
    },
    [slugs]
  );

  return { slugs, has, toggle, count: slugs.length, hydrated };
}
