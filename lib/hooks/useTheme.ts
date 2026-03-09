"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "dim" | "soft" | "light";

const ALL_THEMES: Theme[] = ["dark", "dim", "soft", "light"];

const THEME_CLASSES: Record<Theme, string> = {
  dark: "",
  dim: "dim",
  soft: "soft",
  light: "light",
};

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove("light", "dim", "soft");
  const cls = THEME_CLASSES[theme];
  if (cls) el.classList.add(cls);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dim");

  useEffect(() => {
    const stored = localStorage.getItem("nexus-theme") as Theme | null;
    let initial: Theme;
    if (stored && ALL_THEMES.includes(stored)) {
      initial = stored;
    } else {
      // Respect OS preference: light OS → soft, dark OS → dim
      const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
      initial = prefersLight ? "light" : "dim";
    }
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function setAndPersist(next: Theme) {
    setTheme(next);
    localStorage.setItem("nexus-theme", next);
    applyTheme(next);
  }

  return { theme, setTheme: setAndPersist };
}
