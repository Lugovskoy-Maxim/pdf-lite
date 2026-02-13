"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Eraser } from "lucide-react";

const SIGNATURE_COLORS = [
  { name: "Чёрный", value: "#1c1917" },
  { name: "Синий", value: "#1d4ed8" },
  { name: "Красный", value: "#dc2626" },
  { name: "Тёмно-синий", value: "#0f172a" },
];

interface SignaturePadProps {
  onSignatureChange: (blob: Blob | null) => void;
  width?: number;
  height?: number;
  strokeColor?: string;
}

export function SignaturePad({
  onSignatureChange,
  width = 520,
  height = 220,
  strokeColor = "#1c1917",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawnRef = useRef(false);
  const colorRef = useRef(strokeColor);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const point = getPoint(e);
      if (!ctx || !point) return;
      ctx.strokeStyle = colorRef.current;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      hasDrawnRef.current = true;
    },
    [isDrawing, getPoint]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const point = getPoint(e);
      if (!ctx || !point) return;
      ctx.strokeStyle = colorRef.current;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      setIsDrawing(true);
    },
    [getPoint]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;
    canvas.toBlob(
      (blob) => {
        onSignatureChange(blob);
      },
      "image/png",
      1
    );
  }, [onSignatureChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onSignatureChange(null);
  }, [onSignatureChange]);

  useEffect(() => {
    colorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [strokeColor]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full max-w-full border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl cursor-crosshair touch-none"
        style={{
          maxHeight: height,
          backgroundImage: "linear-gradient(45deg, #e7e5e4 25%, transparent 25%), linear-gradient(-45deg, #e7e5e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e5e4 75%), linear-gradient(-45deg, transparent 75%, #e7e5e4 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          backgroundColor: "#fafaf9",
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
      >
        <Eraser className="h-4 w-4" />
        Очистить
      </button>
    </div>
  );
}

export { SIGNATURE_COLORS };
