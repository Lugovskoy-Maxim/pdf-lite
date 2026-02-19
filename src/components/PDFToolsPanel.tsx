"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  initialTab?: string;
  singleToolMode?: boolean;
};

/**
 * Панель инструментов PDF. В режиме singleToolMode отображает iframe с одним инструментом
 * (standalone=1 — только форма без шапки, футера и вкладок других инструментов).
 */
export function PDFToolsPanel({ initialTab = "pdfToImage", singleToolMode }: Props) {
  const iframeSrc = `/?standalone=1&tool=${encodeURIComponent(initialTab)}#tools`;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [iframeHeight, setIframeHeight] = useState(900);

  const syncIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const bodyHeight = doc.body?.scrollHeight ?? 0;
    const rootHeight = doc.documentElement?.scrollHeight ?? 0;
    const nextHeight = Math.max(bodyHeight, rootHeight, 720);
    setIframeHeight(nextHeight);
  }, []);

  const handleIframeLoad = useCallback(() => {
    cleanupRef.current?.();
    syncIframeHeight();

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return;

    const onResize = () => syncIframeHeight();
    const observer = new ResizeObserver(onResize);
    if (doc.body) observer.observe(doc.body);
    observer.observe(doc.documentElement);
    win.addEventListener("resize", onResize);

    const intervalId = window.setInterval(onResize, 600);
    cleanupRef.current = () => {
      observer.disconnect();
      win.removeEventListener("resize", onResize);
      window.clearInterval(intervalId);
    };
  }, [syncIframeHeight]);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  if (singleToolMode) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <iframe
          ref={iframeRef}
          title="Инструмент"
          src={iframeSrc}
          onLoad={handleIframeLoad}
          className="block w-full border-0 rounded-xl"
          style={{ height: `${iframeHeight}px` }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    );
  }

  return null;
}
