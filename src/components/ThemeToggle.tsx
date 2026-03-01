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
    <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <button
        onClick={() => setMode("light")}
        className={`p-1.5 rounded transition-colors ${
          theme === "light"
            ? "bg-[var(--surface)] text-[var(--foreground)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-label="Светлая тема"
        title="Светлая тема"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setMode("system")}
        className={`p-1.5 rounded transition-colors ${
          theme === "system"
            ? "bg-[var(--surface)] text-[var(--foreground)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-label="Системная тема"
        title="Системная тема"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        onClick={() => setMode("dark")}
        className={`p-1.5 rounded transition-colors ${
          theme === "dark"
            ? "bg-[var(--surface)] text-[var(--foreground)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-label="Тёмная тема"
        title="Тёмная тема"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
