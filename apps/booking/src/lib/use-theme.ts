"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_COOKIE, type Theme, parseTheme } from "@/lib/theme";

const STORAGE_EVENT = "hs-theme-changed";

function readCookie(): Theme {
  if (typeof document === "undefined") return "system";
  const m = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${THEME_COOKIE}=`));
  if (!m) return "system";
  return parseTheme(decodeURIComponent(m.slice(THEME_COOKIE.length + 1)));
}

function applyClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

function writeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = readCookie();
    setThemeState(t);
    setHydrated(true);
    applyClass(t);

    function refresh() {
      const next = readCookie();
      setThemeState(next);
      applyClass(next);
    }
    window.addEventListener(STORAGE_EVENT, refresh);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      if (readCookie() === "system") applyClass("system");
    }
    mql.addEventListener("change", onSystemChange);

    return () => {
      window.removeEventListener(STORAGE_EVENT, refresh);
      mql.removeEventListener("change", onSystemChange);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    writeCookie(next);
    setThemeState(next);
    applyClass(next);
  }, []);

  const cycle = useCallback(() => {
    const order: Theme[] = ["light", "system", "dark"];
    const current = readCookie();
    const i = order.indexOf(current);
    const next = order[(i + 1) % order.length];
    writeCookie(next);
    setThemeState(next);
    applyClass(next);
  }, []);

  return { theme, setTheme, cycle, hydrated };
}
