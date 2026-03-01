"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[var(--foreground)]">
              PDF Lite
            </span>
          </Link>
          
          <nav className="hidden sm:flex items-center gap-1" aria-label="Основная навигация">
            <a 
              href="/#tools" 
              className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
            >
              Инструменты
            </a>
            <a 
              href="/#features" 
              className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
            >
              О сервисе
            </a>
          </nav>
          
          <div className="flex items-center gap-3">
            <a
              href="/#tools"
              className="sm:hidden btn btn-sm btn-secondary"
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
