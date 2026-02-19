"use client";

import { Suspense } from "react";
import { PDFToolsContent } from "@/app/page";

type Props = {
  initialTab?: string;
  singleToolMode?: boolean;
};

/**
 * Панель инструментов PDF. В режиме singleToolMode рендерит нативный инструмент
 * напрямую (без iframe), чтобы сохранить единый контекст темы и приложения.
 */
export function PDFToolsPanel({ initialTab = "pdfToImage", singleToolMode }: Props) {
  if (singleToolMode) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <Suspense fallback={<div className="p-6 text-sm text-stone-500 dark:text-stone-400">Загрузка инструмента...</div>}>
          <PDFToolsContent forcedStandalone forcedTool={initialTab} />
        </Suspense>
      </div>
    );
  }

  return null;
}
