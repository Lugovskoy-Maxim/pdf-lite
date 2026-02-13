"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500 dark:bg-amber-600 flex items-center justify-center group-hover:bg-amber-600 dark:group-hover:bg-amber-500 transition-colors">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white text-lg">PDF Lite</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="#tools" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              Инструменты
            </a>
            <a href="#features" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              Возможности
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
