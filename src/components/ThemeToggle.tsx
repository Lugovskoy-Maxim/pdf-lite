"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme";

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const initial: ThemeMode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => applyTheme("system");
    media.addEventListener("change", onSystemThemeChange);
    return () => media.removeEventListener("change", onSystemThemeChange);
  }, [theme, mounted]);

  const setMode = (next: ThemeMode) => {
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  if (!mounted) return null;

  return (
    <div className="inline-flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 p-1.5 shadow-sm">
      <button
        onClick={() => setMode("light")}
        className={`btn-ui btn-icon p-1.5 rounded-lg ${
          theme === "light"
            ? "btn-secondary bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "btn-ghost text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        aria-label="Светлая тема"
        title="Светлая тема"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setMode("system")}
        className={`btn-ui btn-icon p-1.5 rounded-lg ${
          theme === "system"
            ? "btn-secondary bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "btn-ghost text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        aria-label="Системная тема"
        title="Системная тема"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        onClick={() => setMode("dark")}
        className={`btn-ui btn-icon p-1.5 rounded-lg ${
          theme === "dark"
            ? "btn-secondary bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "btn-ghost text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        aria-label="Тёмная тема"
        title="Тёмная тема"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
