"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCw } from "lucide-react";

interface PDFEditPreviewProps {
  pdfFile: File;
  pageRotations: number[];
  onPageRotationsChange: (rotations: number[]) => void;
  pageCount: number;
}

const THUMB_SCALE = 0.35;
const ROTATION_ANGLES = [0, 90, 180, 270] as const;

function cycleRotation(current: number): number {
  const idx = ROTATION_ANGLES.indexOf(current as 0 | 90 | 180 | 270);
  return ROTATION_ANGLES[(idx + 1) % 4];
}

export function PDFEditPreview({
  pdfFile,
  pageRotations,
  onPageRotationsChange,
  pageCount,
}: PDFEditPreviewProps) {
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(
    async (pageNum: number, rotation: number) => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.mjs`;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({
        scale: THUMB_SCALE,
        rotation,
      });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;
      return canvas.toDataURL("image/png");
    },
    [pdfFile]
  );

  useEffect(() => {
    setError(null);
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.mjs`;
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        const n = pdf.numPages;
        const urls: (string | null)[] = [];
        for (let i = 1; i <= n; i++) {
          if (cancelled) return;
          const rot = pageRotations[i - 1] ?? 0;
          const dataUrl = await renderPage(i, rot);
          urls.push(dataUrl);
        }
        if (!cancelled) setThumbnails(urls);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfFile.name, pdfFile.size, pageRotations, renderPage]);

  const handleRotate = (pageIndex: number) => {
    const next = [...(pageRotations.length >= pageCount ? pageRotations : [...pageRotations, ...Array(pageCount - pageRotations.length).fill(0)])];
    next[pageIndex] = cycleRotation(next[pageIndex] ?? 0);
    onPageRotationsChange(next);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-600 dark:text-stone-400">Загрузка превью страниц...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
      <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">
        Предпросмотр страниц — поворот сканов
      </h4>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
        Нажмите кнопку поворота под страницей, чтобы повернуть её на 90°. Изменения применятся при нажатии «Редактировать PDF».
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto pr-1">
        {thumbnails.map((url, index) => (
          <div
            key={index}
            className="flex flex-col rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden shadow-sm"
          >
            <div className="aspect-[3/4] bg-stone-100 dark:bg-stone-800 flex items-center justify-center min-h-[120px] overflow-hidden">
              {url ? (
                <img
                  src={url}
                  alt={`Страница ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs text-stone-400">—</span>
              )}
            </div>
            <div className="p-2 border-t border-stone-100 dark:border-stone-700 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400 truncate">
                Стр. {index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRotate(index)}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                title="Повернуть на 90°"
              >
                <RotateCw className="h-3.5 w-3.5" />
                90°
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
