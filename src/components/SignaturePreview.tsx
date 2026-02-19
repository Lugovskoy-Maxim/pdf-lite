"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { SignaturePosition } from "../app/utils/pdfUtils";

interface SignaturePreviewProps {
  pdfFile: File;
  signatureBlob: Blob | null;
  signatureWidth?: number;
  position: SignaturePosition;
  onPositionChange: (x: number, y: number) => void;
  previewPage?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

function getInitialPosition(
  pageWidth: number,
  pageHeight: number,
  sigWidth: number,
  sigHeight: number,
  position: SignaturePosition
): { x: number; y: number } {
  const margin = 40;
  switch (position) {
    case "bottom-right":
      return { x: pageWidth - sigWidth - margin, y: margin };
    case "bottom-left":
      return { x: margin, y: margin };
    case "top-right":
      return { x: pageWidth - sigWidth - margin, y: pageHeight - sigHeight - margin };
    case "top-left":
      return { x: margin, y: pageHeight - sigHeight - margin };
    case "center":
      return { x: (pageWidth - sigWidth) / 2, y: (pageHeight - sigHeight) / 2 };
    default:
      return { x: pageWidth - sigWidth - margin, y: margin };
  }
}

export function SignaturePreview({
  pdfFile,
  signatureBlob,
  signatureWidth = 140,
  position,
  onPositionChange,
  previewPage = 1,
  pageCount = 1,
  onPageChange,
}: SignaturePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [sigImg, setSigImg] = useState<string | null>(null);
  const [sigSize, setSigSize] = useState<{ width: number; height: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPos: { x: number; y: number } } | null>(null);

  const scale = 2;

  // Load PDF page as image
  useEffect(() => {
    setPageImage(null);
    setPageError(null);
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.mjs`;
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          useSystemFonts: true,
          disableFontFace: true,
        }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(Math.min(previewPage, pdf.numPages));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (!cancelled) setPageError("Не удалось создать canvas");
          return;
        }
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (cancelled) return;
        setPageImage(canvas.toDataURL("image/png"));
        setPageSize({ width: viewport.width / scale, height: viewport.height / scale });
      } catch (err) {
        if (!cancelled) {
          setPageError(err instanceof Error ? err.message : "Ошибка загрузки PDF");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfFile.name, pdfFile.size, previewPage]);

  // Load signature image
  useEffect(() => {
    if (!signatureBlob) {
      setSigImg(null);
      setSigSize(null);
      return;
    }
    const url = URL.createObjectURL(signatureBlob);
    const img = new Image();
    img.onload = () => {
      const aspect = img.height / img.width;
      const w = signatureWidth;
      const h = w * aspect;
      setSigImg(url);
      setSigSize({ width: w, height: h });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [signatureBlob, signatureWidth]);

  // Compute current position (drag or preset)
  const pos = useCallback(() => {
    if (!pageSize || !sigSize) return null;
    if (dragPos !== null) return dragPos;
    return getInitialPosition(pageSize.width, pageSize.height, sigSize.width, sigSize.height, position);
  }, [pageSize, sigSize, dragPos, position]);

  // Initialize or update position when page/sig/position changes
  useEffect(() => {
    if (!pageSize || !sigSize) return;
    const p = getInitialPosition(pageSize.width, pageSize.height, sigSize.width, sigSize.height, position);
    setDragPos(p);
    onPositionChange(p.x, p.y);
  }, [pageSize?.width, pageSize?.height, sigSize?.width, sigSize?.height, position]);

  const getClientCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!sigImg || !pageSize || !sigSize) return;
      e.preventDefault();
      const { x: cx, y: cy } = getClientCoords(e);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = (cx - rect.left) / scale;
      const clickYFromBottom = (rect.bottom - cy) / scale;
      const current = pos();
      if (!current) return;
      const inX = clickX >= current.x && clickX <= current.x + sigSize.width;
      const inY = clickYFromBottom >= current.y && clickYFromBottom <= current.y + sigSize.height;
      if (inX && inY) {
        setIsDragging(true);
        dragStartRef.current = { x: cx, y: cy, startPos: { ...current } };
      }
    },
    [sigImg, pageSize, sigSize, pos]
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current || !pageSize || !sigSize) return;
      const start = dragStartRef.current;
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = (cx - start.x) / scale;
      const dy = -(cy - start.y) / scale;
      let nx = start.startPos.x + dx;
      let ny = start.startPos.y + dy;
      nx = Math.max(0, Math.min(pageSize.width - sigSize.width, nx));
      ny = Math.max(0, Math.min(pageSize.height - sigSize.height, ny));
      setDragPos({ x: nx, y: ny });
      onPositionChange(nx, ny);
    },
    [pageSize, sigSize, onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: MouseEvent | TouchEvent) => handlePointerMove(e);
      const onUp = () => handleMouseUp();
      window.addEventListener("mousemove", onMove as (e: MouseEvent) => void);
      window.addEventListener("touchmove", onMove as (e: TouchEvent) => void, { passive: false });
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove as (e: MouseEvent) => void);
        window.removeEventListener("touchmove", onMove as (e: TouchEvent) => void);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchend", onUp);
      };
    }
  }, [isDragging, handlePointerMove, handleMouseUp]);

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-stone-100 dark:bg-stone-800 rounded-xl gap-2">
        <span className="text-red-600 dark:text-red-400 text-sm">{pageError}</span>
        <span className="text-stone-500 text-xs">Проверьте файл PDF и попробуйте снова</span>
      </div>
    );
  }
  if (!pageImage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-stone-100 dark:bg-stone-800 rounded-xl gap-2">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-stone-500 text-sm">Загрузка превью...</span>
      </div>
    );
  }

  const currentPos = pos();
  const displayHeight = pageSize ? pageSize.height * scale : 400;

  return (
    <div className="space-y-3">
      {pageCount > 1 && onPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600 dark:text-stone-400">Страница превью:</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded text-sm font-medium ${
                  previewPage === p
                    ? "bg-amber-500 text-stone-900 dark:text-white"
                    : "bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600"
                }`}
              >
                {p}
              </button>
            ))}
            {pageCount > 10 && (
              <span className="text-xs text-stone-500 self-center ml-1">…{pageCount}</span>
            )}
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800"
        style={{ cursor: sigImg ? (isDragging ? "grabbing" : "grab") : "default" }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <img
          src={pageImage}
          alt="Превью страницы"
          className="block w-full"
          style={{ maxHeight: displayHeight, width: pageSize ? pageSize.width * scale : "auto" }}
          draggable={false}
        />
        {sigImg && pageSize && sigSize && currentPos && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: currentPos.x * scale,
              bottom: currentPos.y * scale,
              width: sigSize.width * scale,
              height: sigSize.height * scale,
            }}
          >
            <img
              src={sigImg}
              alt="Подпись"
              className="w-full h-full object-contain"
              style={{ pointerEvents: "none" }}
              draggable={false}
            />
          </div>
        )}
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Перетащите подпись мышью для изменения позиции
      </p>
    </div>
  );
}
