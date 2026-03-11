"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { InstallAppButton } from "./InstallAppButton";
import logoImg from "@/app/logo.png";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
              <Image src={logoImg} alt="" width={36} height={36} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-[var(--foreground)]">
              forPDF
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
            <InstallAppButton />
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
