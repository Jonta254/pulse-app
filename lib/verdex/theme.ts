/**
 * VeRdex theme manager — day / night toggle
 * Default: "night" (dark). Stored in localStorage.
 * Applied via data-theme attribute on <html>.
 */

export type VerdexTheme = "night" | "day";

const STORAGE_KEY = "verdex_theme_v1";

export function getStoredTheme(): VerdexTheme {
  if (typeof window === "undefined") return "night";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "day" ? "day" : "night";
}

export function applyTheme(theme: VerdexTheme): void {
  if (typeof document === "undefined") return;
  if (theme === "day") {
    document.documentElement.setAttribute("data-theme", "day");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function saveTheme(theme: VerdexTheme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleTheme(current: VerdexTheme): VerdexTheme {
  return current === "night" ? "day" : "night";
}
