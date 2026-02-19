"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-950 rounded-lg">
            <div className="w-9 h-9 rounded-xl bg-amber-500 dark:bg-amber-600 flex items-center justify-center group-hover:bg-amber-600 dark:group-hover:bg-amber-500 transition-colors">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-stone-900 dark:text-white text-lg">PDF Lite</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1" aria-label="Основная навигация">
            <a href="/#tools" className="px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              Инструменты
            </a>
            <a href="/#features" className="px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              Возможности
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/#tools"
              className="sm:hidden inline-flex items-center rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Инструменты
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
