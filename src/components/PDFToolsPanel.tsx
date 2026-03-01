"use client";

import { Suspense } from "react";
import { PDFToolsContent } from "@/app/page";

type Props = {
  initialTab?: string;
  singleToolMode?: boolean;
};

export function PDFToolsPanel({ initialTab = "pdfToImage", singleToolMode }: Props) {
  if (singleToolMode) {
    return (
      <div className="w-full">
        <Suspense fallback={<div className="p-6 text-sm text-[var(--muted)]">Загрузка...</div>}>
          <PDFToolsContent forcedStandalone forcedTool={initialTab} />
        </Suspense>
      </div>
    );
  }

  return null;
}
