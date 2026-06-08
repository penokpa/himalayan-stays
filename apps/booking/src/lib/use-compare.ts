"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COMPARE_COOKIE,
  COMPARE_MAX,
  parseCompare,
  serializeCompare,
} from "@/lib/compare";

const STORAGE_EVENT = "hs-compare-changed";

function readCookie(): string[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COMPARE_COOKIE}=`));
  if (!match) return [];
  return parseCompare(match.slice(COMPARE_COOKIE.length + 1));
}

function writeCookie(slugs: string[]) {
  document.cookie = `${COMPARE_COOKIE}=${serializeCompare(slugs)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useCompare() {
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
  const isFull = slugs.length >= COMPARE_MAX;

  const toggle = useCallback(
    (slug: string): "added" | "removed" | "full" => {
      if (slugs.includes(slug)) {
        const next = slugs.filter((s) => s !== slug);
        writeCookie(next);
        setSlugs(next);
        return "removed";
      }
      if (slugs.length >= COMPARE_MAX) {
        return "full";
      }
      const next = [...slugs, slug];
      writeCookie(next);
      setSlugs(next);
      return "added";
    },
    [slugs]
  );

  const remove = useCallback(
    (slug: string) => {
      const next = slugs.filter((s) => s !== slug);
      writeCookie(next);
      setSlugs(next);
    },
    [slugs]
  );

  const clear = useCallback(() => {
    writeCookie([]);
    setSlugs([]);
  }, []);

  return { slugs, has, toggle, remove, clear, count: slugs.length, isFull, hydrated, max: COMPARE_MAX };
}
