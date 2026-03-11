"use client";

import { FileIcon, defaultStyles } from "react-file-icon";

function getExtensionFromFile(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  const name = file.name.toLowerCase();
  if (name.endsWith(".webp") || file.type.includes("webp")) return "webp";
  if (name.endsWith(".png") || file.type.includes("png")) return "png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || file.type.includes("jpeg")) return "jpg";
  if (name.endsWith(".gif")) return "gif";
  const match = name.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "document";
}

const webpStyle = { type: "image" as const };

type FileFormatIconProps = {
  /** Файл — расширение берётся из типа и имени */
  file?: File;
  /** Или явное расширение (pdf, jpg, png, webp и т.д.) */
  extension?: string;
  /** Размер: sm для кнопок, md для карточек и списков */
  size?: "sm" | "md";
  className?: string;
};

export function FileFormatIcon({ file, extension, size = "md", className = "" }: FileFormatIconProps) {
  const ext = extension ?? (file ? getExtensionFromFile(file) : "document");
  const style = (defaultStyles as Record<string, { type?: string; labelColor?: string }>)[ext] ?? (ext === "webp" ? webpStyle : { type: "document" });
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-9 h-9";
  return (
    <div className={`inline-flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}>
      <FileIcon extension={ext} {...style} />
    </div>
  );
}
