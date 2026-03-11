"use client";

import { useEffect, useState } from "react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type BrowserMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

function readBrowserMemory(): BrowserMemory | null {
  const p = performance as unknown as { memory?: BrowserMemory };
  return p.memory ?? null;
}

export function UserMemoryUsage() {
  const [mem, setMem] = useState<BrowserMemory | null>(null);

  useEffect(() => {
    const update = () => setMem(readBrowserMemory());
    update();
    const t = setInterval(update, 2000);
    return () => clearInterval(t);
  }, []);

  if (!mem) return null;

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm text-sm font-medium text-[var(--foreground)]"
      title={`Heap: ${formatBytes(mem.usedJSHeapSize)} / ${formatBytes(mem.jsHeapSizeLimit)}`}
    >
      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden />
      <span>ОЗУ: {formatBytes(mem.usedJSHeapSize)}</span>
    </div>
  );
}

