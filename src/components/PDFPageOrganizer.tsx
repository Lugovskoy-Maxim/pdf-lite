"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Crop, Plus, RotateCw, Trash2, Undo2 } from "lucide-react";

export type OrganizerPageItem = {
  id: string;
  kind: "source" | "blank";
  sourceIndex: number | null;
  pageNumberLabel: string;
  rotation: 0 | 90 | 180 | 270;
  cropPercent: number;
  deleted: boolean;
  width: number;
  height: number;
  previewDataUrl: string | null;
};

type Props = {
  pdfFile: File;
  pageCount?: number;
  onChange: (pages: OrganizerPageItem[]) => void;
};

const THUMB_SCALE = 0.24;
const DEFAULT_BLANK_WIDTH = 595.28;
const DEFAULT_BLANK_HEIGHT = 841.89;
const ROTATIONS: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function nextRotation(current: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  const idx = ROTATIONS.indexOf(current);
  return ROTATIONS[(idx + 1) % ROTATIONS.length];
}

function createSkeletonPages(count: number): OrganizerPageItem[] {
  const safeCount = Math.max(0, count);
  return Array.from({ length: safeCount }, (_, idx) => ({
    id: createId(),
    kind: "source",
    sourceIndex: idx,
    pageNumberLabel: `${idx + 1}`,
    rotation: 0,
    cropPercent: 0,
    deleted: false,
    width: DEFAULT_BLANK_WIDTH,
    height: DEFAULT_BLANK_HEIGHT,
    previewDataUrl: null,
  }));
}

export function PDFPageOrganizer({ pdfFile, pageCount = 0, onChange }: Props) {
  const [pages, setPages] = useState<OrganizerPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState({ loaded: 0, total: 0 });
  const lastNotifiedStateRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (pageCount > 0) {
      setPages(createSkeletonPages(pageCount));
      setLoading(false);
    } else {
      setPages([]);
    }
    setPreviewProgress({ loaded: 0, total: 0 });

    (async () => {
      try {
        // Сначала пробуем серверную генерацию превью (Python + PyMuPDF)
        const formData = new FormData();
        formData.append("file", pdfFile);
        const apiRes = await fetch("/api/pdf-thumbnails", { method: "POST", body: formData });
        if (apiRes.ok) {
          const data = (await apiRes.json()) as {
            pageCount: number;
            thumbnails: string[];
            widths: number[];
            heights: number[];
          };
          const totalPages = data.pageCount;
          if (totalPages <= 0) {
            throw new Error("В PDF не найдено страниц");
          }
          if (cancelled) return;
          setPreviewProgress({ loaded: totalPages, total: totalPages });
          setPages(
            createSkeletonPages(totalPages).map((p, i) => ({
              ...p,
              previewDataUrl: data.thumbnails[i] ?? null,
              width: data.widths[i] ?? DEFAULT_BLANK_WIDTH,
              height: data.heights[i] ?? DEFAULT_BLANK_HEIGHT,
            }))
          );
          setLoading(false);
          return;
        }

        // Fallback: рендер в браузере через pdfjs-dist
        const pdfjsLib = await import("pdfjs-dist");
        const { setPdfWorkerSrc } = await import("@/app/utils/pdfUtils");
        setPdfWorkerSrc(pdfjsLib);
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;

        const totalPages = pdf.numPages;
        if (totalPages <= 0) {
          throw new Error("В PDF не найдено страниц");
        }
        setPreviewProgress({ loaded: 0, total: totalPages });
        if (!cancelled) {
          setPages((prev) => (prev.length === totalPages ? prev : createSkeletonPages(totalPages)));
          setLoading(false);
        }

        const batchSize = 4;
        for (let i = 1; i <= totalPages; i += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: THUMB_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;

          const previewDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const width = viewport.width / THUMB_SCALE || DEFAULT_BLANK_WIDTH;
          const height = viewport.height / THUMB_SCALE || DEFAULT_BLANK_HEIGHT;

          if (cancelled) return;
          setPages((prev) => {
            if (!prev[i - 1]) return prev;
            const next = [...prev];
            next[i - 1] = { ...next[i - 1], previewDataUrl, width, height };
            return next;
          });
          setPreviewProgress((prev) => ({
            total: totalPages,
            loaded: Math.min(prev.loaded + 1, totalPages),
          }));

          if (i % batchSize === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить превью страниц");
          setLoading(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfFile.name, pdfFile.size, pageCount]);

  useEffect(() => {
    const stateKey = pages
      .map((p) => `${p.id}:${p.kind}:${p.sourceIndex ?? "n"}:${p.rotation}:${p.cropPercent}:${p.deleted ? 1 : 0}:${p.width}:${p.height}`)
      .join("|");

    if (stateKey !== lastNotifiedStateRef.current) {
      lastNotifiedStateRef.current = stateKey;
      onChange(pages);
    }
  }, [pages, onChange]);

  const visiblePagesCount = useMemo(() => pages.filter((p) => !p.deleted).length, [pages]);

  const movePage = (id: string, direction: -1 | 1) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      return copy;
    });
  };

  const updatePage = (id: string, patch: Partial<OrganizerPageItem>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const insertBlankAfter = (id: string) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const blank: OrganizerPageItem = {
        id: createId(),
        kind: "blank",
        sourceIndex: null,
        pageNumberLabel: "Пустая",
        rotation: 0,
        cropPercent: 0,
        deleted: false,
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT,
        previewDataUrl: null,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, blank);
      return copy;
    });
  };

  const addBlankToEnd = () => {
    setPages((prev) => [
      ...prev,
      {
        id: createId(),
        kind: "blank",
        sourceIndex: null,
        pageNumberLabel: "Пустая",
        rotation: 0,
        cropPercent: 0,
        deleted: false,
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT,
        previewDataUrl: null,
      },
    ]);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-600 dark:text-stone-400">Готовим режим просмотра страниц...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-stone-900 dark:text-white">Режим просмотра страниц</h4>
        <button type="button" onClick={addBlankToEnd} className="btn-ui btn-primary text-xs px-3 py-1.5">
          <Plus className="h-3.5 w-3.5" />
          Добавить пустую в конец
        </button>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
        Переставляйте, поворачивайте, удаляйте и обрезайте страницы. Активных страниц: {visiblePagesCount}.
      </p>
      <div className="mb-4 space-y-1.5">
        <p className="text-[11px] text-stone-400 dark:text-stone-500">
          Превью страниц подгружается постепенно, можно работать сразу.
        </p>
        {previewProgress.total > 0 && previewProgress.loaded < previewProgress.total && (
          <>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Загружено превью: {previewProgress.loaded} / {previewProgress.total}
            </p>
            <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${(previewProgress.loaded / previewProgress.total) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[560px] overflow-y-auto pr-1">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`rounded-lg border overflow-hidden ${
              page.deleted
                ? "border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20"
                : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
            }`}
          >
            <div className="aspect-[3/4] bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              {page.previewDataUrl ? (
                <img src={page.previewDataUrl} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center px-4">
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Пустая страница</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">A4</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-stone-100 dark:border-stone-700 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  #{index + 1} {page.kind === "source" ? `(ориг. ${page.pageNumberLabel})` : "(новая)"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => movePage(page.id, -1)}
                    className="btn-ui btn-ghost p-1.5 text-stone-600 dark:text-stone-300"
                    title="Сдвинуть влево"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePage(page.id, 1)}
                    className="btn-ui btn-ghost p-1.5 text-stone-600 dark:text-stone-300"
                    title="Сдвинуть вправо"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => updatePage(page.id, { rotation: nextRotation(page.rotation) })}
                  className="btn-ui btn-secondary text-xs px-2.5 py-1.5"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {page.rotation}°
                </button>
                <button
                  type="button"
                  onClick={() => insertBlankAfter(page.id)}
                  className="btn-ui btn-secondary text-xs px-2.5 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Пустая после
                </button>
                <button
                  type="button"
                  onClick={() => updatePage(page.id, { deleted: !page.deleted })}
                  className={`btn-ui text-xs px-2.5 py-1.5 ${
                    page.deleted ? "btn-secondary" : "btn-ghost text-red-600 dark:text-red-400"
                  }`}
                >
                  {page.deleted ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {page.deleted ? "Восстановить" : "Удалить"}
                </button>
              </div>

              {page.kind === "source" && (
                <div>
                  <label className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mb-1.5">
                    <Crop className="h-3.5 w-3.5" />
                    Обрезка полей: {page.cropPercent}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={page.cropPercent}
                    onChange={(e) => updatePage(page.id, { cropPercent: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
