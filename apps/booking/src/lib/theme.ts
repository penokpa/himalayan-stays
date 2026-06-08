export const THEME_COOKIE = "hs-theme";
export type Theme = "light" | "dark" | "system";

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

export function parseTheme(v: string | undefined | null): Theme {
  return isTheme(v) ? v : "system";
}
