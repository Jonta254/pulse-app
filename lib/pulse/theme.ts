/**
 * PULSE theme manager — day / night toggle
 * Default: "night" (dark). Stored in localStorage.
 * Applied via data-theme attribute on <html>.
 */

export type PulseTheme = "night" | "day";

const STORAGE_KEY = "pulse_theme_v1";

export function getStoredTheme(): PulseTheme {
  if (typeof window === "undefined") return "night";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "day" ? "day" : "night";
}

export function applyTheme(theme: PulseTheme): void {
  if (typeof document === "undefined") return;
  if (theme === "day") {
    document.documentElement.setAttribute("data-theme", "day");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function saveTheme(theme: PulseTheme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleTheme(current: PulseTheme): PulseTheme {
  return current === "night" ? "day" : "night";
}
