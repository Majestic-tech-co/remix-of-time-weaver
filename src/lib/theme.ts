import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const KEY = "majestic.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Inlined into <head> so the right palette is applied before first paint (no flash).
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref !== "system") return pref;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

let preference: ThemePreference = typeof window === "undefined" ? "system" : readPreference();
let snapshot = { preference, resolved: typeof window === "undefined" ? "light" : resolve(preference) } as {
  preference: ThemePreference;
  resolved: ResolvedTheme;
};

function apply() {
  const resolved = resolve(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  snapshot = { preference, resolved };
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    if (preference === "system") apply();
  });
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable: still switch for this visit */
  }
  apply();
}

const serverSnapshot = { preference: "system" as ThemePreference, resolved: "light" as ResolvedTheme };

export function useTheme() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => serverSnapshot,
  );
}
