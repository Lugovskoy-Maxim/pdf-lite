"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Upload, Download, Trash2, FileText, Image, X, CheckCircle2, XCircle, RotateCw, ChevronLeft, Shield, Clock, GripVertical, Eye } from "lucide-react";
import { TOOL_FORMATS, TOOLS } from "@/app/tools-config";
import type { ToolId } from "@/app/tools-config";
import { AdPlaceholder } from "./AdPlaceholder";
import { UserMemoryUsage } from "./UserMemoryUsage";
import { SignaturePad, SIGNATURE_COLORS } from "./SignaturePad";
import { SignaturePreview } from "./SignaturePreview";
import { PDFEditPreview } from "./PDFEditPreview";
import { PDFPageOrganizer, MAX_SERVER_FILE_SIZE, type OrganizerPageItem } from "./PDFPageOrganizer";
import { FileFormatIcon } from "./FileFormatIcon";
import { setPdfWorkerSrc } from "@/app/utils/pdfUtils";
import {
  compressPDF, convertPDFToImages, addWatermark, mergePDFs, splitPDF, splitPDFIntoPages,
  rotatePDF, rotatePDFPages, convertImagesToPDF, createZipFromImages, convertPDFToWord,
  convertPDFToExcel, addSignature, getPDFPageCount, extractTextFromPDF, organizePDFPages,
  convertImagesBetweenFormats, type OrganizePDFPageOperation, type SignaturePosition
} from "@/app/utils/pdfUtils";

type Tool = {
  id: ToolId;
  slug: string;
  title: string;
  description: string;
  path?: string;
};

type Props = {
  tool: Tool;
};

const IMAGE_FORMAT_OPTIONS = [
  { value: "JPG", title: "JPG" },
  { value: "PNG", title: "PNG" },
  { value: "WebP", title: "WebP" },
] as const;

const MAX_BATCH_FILES = 15;
const batchToolTabs = ["pdfToImage", "pdfToWord", "pdfToExcel", "pdfToZip", "extractText", "compress"] as const;
const SERVER_CAPABLE_TABS = ["compress", "merge", "split", "extractText", "organizePages"] as const;

export function InstrumentPageClient({ tool }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const formats = TOOL_FORMATS[tool.id];
  const toolTitle = formats ? `${formats.from} → ${formats.to}` : tool.title.split(" — ")[0];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [convertFormat, setConvertFormat] = useState("");
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editPageRotations, setEditPageRotations] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [watermarkText, setWatermarkText] = useState("ВОДЯНОЙ ЗНАК");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [splitRange, setSplitRange] = useState("1");
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition>("bottom-right");
  const [signatureColor, setSignatureColor] = useState("#1c1917");
  const [signaturePdfPosition, setSignaturePdfPosition] = useState<{ x: number; y: number } | null>(null);
  const [signaturePagesMode, setSignaturePagesMode] = useState<"all" | "select">("all");
  const [signaturePagesRange, setSignaturePagesRange] = useState("1");
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [signaturePreviewPage, setSignaturePreviewPage] = useState(1);
  const [organizerPages, setOrganizerPages] = useState<OrganizerPageItem[]>([]);
  const [processOnServer] = useState(false);
  const [conversionResults, setConversionResults] = useState<{blob: Blob, url: string, name: string}[]>([]);
  /** Секции по исходному PDF при конвертации нескольких PDF в картинки (для скачивания по одному) */
  const [conversionSections, setConversionSections] = useState<{ sourceName: string; files: { blob: Blob; url: string; name: string }[] }[] | null>(null);
  const [compressResult, setCompressResult] = useState<{blob: Blob, url: string, originalSize: number, compressedSize: number} | null>(null);
  const [extractedText, setExtractedText] = useState<{ fileName: string; pages: { pageNum: number; text: string }[] }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number; label?: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileListState, setFileListState] = useState<File[]>([]);
  const [previewFileIndex, setPreviewFileIndex] = useState<number | null>(null);
  const [pdfPreviewImage, setPdfPreviewImage] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [resultPreviewIndex, setResultPreviewIndex] = useState<number | null>(null);
  const [compressPreviewOpen, setCompressPreviewOpen] = useState(false);

  const activeTab = tool.id;

  const inputAccept = useMemo(() => {
    if (activeTab === "imageToPdf" || activeTab === "imageConverter") return ".jpg,.jpeg,.png,.webp";
    if (activeTab === "merge") return ".pdf";
    return ".pdf";
  }, [activeTab]);

  const fileList = fileListState;

  const pdfFilesList = useMemo(
    () => fileList.filter((f) => f.type === "application/pdf").slice(0, MAX_BATCH_FILES),
    [fileList]
  );
  const hasAtLeastOnePdf = pdfFilesList.length >= 1;
  const allowMultipleSelection =
    activeTab === "merge" ||
    activeTab === "imageToPdf" ||
    activeTab === "imageConverter" ||
    batchToolTabs.includes(activeTab as (typeof batchToolTabs)[number]);

  const selectedPdfFile = useMemo(
    () => fileList.find((f) => f.type === "application/pdf") ?? null,
    [fileList]
  );

  const imageFiles = useMemo(
    () => fileList.filter((f) => f.type.startsWith("image/")),
    [fileList]
  );

  const hasOnlyImages = fileList.length > 0 && imageFiles.length === fileList.length;
  const hasAtLeastTwoPdfFiles = fileList.filter((f) => f.type === "application/pdf").length >= 2;
  const showServerOption = SERVER_CAPABLE_TABS.includes(activeTab as (typeof SERVER_CAPABLE_TABS)[number]) && (activeTab === "merge" ? hasAtLeastTwoPdfFiles : hasAtLeastOnePdf);
  const mergeTotalSize = useMemo(() => {
    if (activeTab !== "merge") return 0;
    return fileListState.filter((f) => f.type === "application/pdf").reduce((s, f) => s + f.size, 0);
  }, [activeTab, fileListState]);
  const serverFileTooBig = showServerOption && (activeTab === "merge" ? mergeTotalSize > MAX_SERVER_FILE_SIZE : ((selectedPdfFile ?? pdfFilesList[0])?.size ?? 0) > MAX_SERVER_FILE_SIZE);

  useEffect(() => {
    const primary = fileListState[0] ?? null;
    setFile(primary);
    setFileName(primary?.name ?? "");
    if (!primary) {
      setPdfPageCount(0);
      setEditPageRotations([]);
      return;
    }
    if (primary.type.startsWith("application/pdf")) {
      getPDFPageCount(primary).then((n) => {
        setPdfPageCount(n);
        setEditPageRotations(Array(n).fill(0));
      });
    } else {
      setPdfPageCount(0);
      setEditPageRotations([]);
    }
  }, [fileListState]);

  useEffect(() => {
    if ((activeTab === "pdfToImage" || activeTab === "pdfToZip" || activeTab === "imageConverter") && !convertFormat) {
      setConvertFormat("PNG");
    }
  }, [activeTab, convertFormat]);

  useEffect(() => {
    if (fileListState.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls: (string | null)[] = fileListState.map((f) =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : null
    );
    setPreviewUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [fileListState]);

  useEffect(() => {
    setPdfPreviewImage(null);
    setPdfPreviewError(null);
    if (previewFileIndex == null) return;
    const f = fileListState[previewFileIndex];
    if (!f || f.type !== "application/pdf") return;
    let cancelled = false;
    setPdfPreviewLoading(true);
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        setPdfWorkerSrc(pdfjsLib);
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Не удалось создать canvas");
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        if (cancelled) return;
        setPdfPreviewImage(canvas.toDataURL("image/png"));
      } catch (err) {
        if (!cancelled) setPdfPreviewError(err instanceof Error ? err.message : "Ошибка предпросмотра PDF");
      } finally {
        if (!cancelled) setPdfPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewFileIndex, fileListState]);

  const parsePageSelection = (value: string, maxPage?: number) => {
    const pages = new Set<number>();
    const tokens = value.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    for (const token of tokens) {
      if (token.includes("-")) {
        const [rawStart, rawEnd] = token.split("-");
        const start = Number(rawStart);
        const end = Number(rawEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        for (let n = from; n <= to; n += 1) {
          if (n <= 0) continue;
          if (maxPage && n > maxPage) continue;
          pages.add(n);
        }
        continue;
      }
      const page = Number(token);
      if (!Number.isFinite(page) || page <= 0) continue;
      if (maxPage && page > maxPage) continue;
      pages.add(page);
    }
    return [...pages].sort((a, b) => a - b);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const clearConversionResults = () => {
    setConversionResults((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setConversionSections(null);
  };

  const clearCompressResult = () => {
    setCompressResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const replaceConversionResults = (next: { blob: Blob; url: string; name: string }[]) => {
    setConversionResults((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return next;
    });
    setConversionSections(null);
  };

  const replaceCompressResult = (next: { blob: Blob; url: string; originalSize: number; compressedSize: number } | null) => {
    setCompressResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return next;
    });
  };

  const showStatus = (type: 'success' | 'error', text: string, duration = 8000) => {
    setStatusMessage({ type, text });
    if (duration > 0) {
      setTimeout(() => setStatusMessage(null), duration);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFileListState((prev) => [...prev, ...Array.from(selectedFiles)]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFileListState((prev) => [...prev, ...Array.from(droppedFiles)]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClearFile = () => {
    setFileListState([]);
    setFile(null);
    setFiles(null);
    setFileName("");
    setPdfPageCount(0);
    setEditPageRotations([]);
    setOrganizerPages([]);
    clearConversionResults();
    clearCompressResult();
    setExtractedText(null);
    setSignaturePdfPosition(null);
    setPreviewFileIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setFileListState((prev) => prev.filter((_, i) => i !== index));
    if (previewFileIndex === index) setPreviewFileIndex(null);
    else if (previewFileIndex != null && previewFileIndex > index) setPreviewFileIndex(previewFileIndex - 1);
  };

  const handleReorderFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setFileListState((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    if (previewFileIndex === fromIndex) setPreviewFileIndex(toIndex);
    else if (previewFileIndex != null) {
      if (previewFileIndex < fromIndex && previewFileIndex >= toIndex) setPreviewFileIndex(previewFileIndex + 1);
      else if (previewFileIndex > fromIndex && previewFileIndex <= toIndex) setPreviewFileIndex(previewFileIndex - 1);
    }
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const handleSortByNameAsc = () => {
    setFileListState((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })));
  };
  const handleSortByNameDesc = () => {
    setFileListState((prev) => [...prev].sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" })));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleEditTool = (editTool: string) => {
    if (editTools.includes(editTool)) {
      setEditTools(editTools.filter(t => t !== editTool));
    } else {
      setEditTools([...editTools, editTool]);
    }
  };

  const downloadResult = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSectionAsZip = async (sectionIndex: number) => {
    if (!conversionSections?.[sectionIndex]) return;
    setIsLoading(true);
    try {
      const zipBlob = await createZipFromImages(conversionSections[sectionIndex].files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${conversionSections[sectionIndex].sourceName.replace(/\.pdf$/i, "")}-страницы.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteResult = (url: string, index: number) => {
    URL.revokeObjectURL(url);
    setConversionResults((prev) => prev.filter((_, i) => i !== index));
    if (conversionSections) {
      let flatIdx = 0;
      for (let s = 0; s < conversionSections.length; s++) {
        const section = conversionSections[s];
        const fileIdx = index - flatIdx;
        if (fileIdx >= 0 && fileIdx < section.files.length) {
          setConversionSections((prev) => {
            if (!prev) return null;
            const next = [...prev];
            next[s] = { ...next[s], files: next[s].files.filter((_, i) => i !== fileIdx) };
            if (next[s].files.length === 0) next.splice(s, 1);
            return next.length > 0 ? next : null;
          });
          break;
        }
        flatIdx += section.files.length;
      }
    }
  };

  const downloadCompressedFile = () => {
    if (!compressResult) return;
    const a = document.createElement('a');
    a.href = compressResult.url;
    a.download = `compressed-${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllAsZip = async () => {
    if (conversionResults.length === 0) return;
    setIsLoading(true);
    try {
      const zipBlob = await createZipFromImages(conversionResults);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace('.pdf', '')}-files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('success', `Архив скачан`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при создании архива: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPageRotations = editPageRotations.some((r) => r !== 0);
  const hasWatermark = editTools.includes("Водяной знак");
  const hasGlobalRotate = editTools.includes("Повернуть");
  const hasOrganizeChanges = useMemo(() => {
    const active = organizerPages.filter((p) => !p.deleted);
    if (active.length === 0) return false;
    return active.some((p, idx) => {
      if (p.kind === "blank") return true;
      if (p.sourceIndex !== idx) return true;
      if (p.rotation !== 0) return true;
      if (p.cropPercent > 0) return true;
      return false;
    });
  }, [organizerPages]);

  // Handler functions
  const handleConvert = async () => {
    if (pdfFilesList.length === 0) { showStatus('error', 'Выберите PDF файл(ы)'); return; }
    if (!convertFormat) { showStatus('error', 'Выберите формат'); return; }
    const ext = convertFormat.toLowerCase();
    setIsLoading(true);
    setConversionProgress({ current: 0, total: 0, label: "Подготовка..." });
    try {
      const allResults: { blob: Blob; url: string; name: string }[] = [];
      const sections: { sourceName: string; files: { blob: Blob; url: string; name: string }[] }[] = [];
      const total = pdfFilesList.length;
      for (let fIdx = 0; fIdx < total; fIdx++) {
        const pdfFile = pdfFilesList[fIdx];
        const baseName = pdfFile.name.replace(/\.pdf$/i, "");
        setConversionProgress({ current: fIdx, total, label: total > 1 ? `Файл ${fIdx + 1} из ${total}` : "Конвертация..." });
        const images = await convertPDFToImages(pdfFile, convertFormat, (current, tot, label) => {
          setConversionProgress({ current: fIdx * 100 + current, total: total * 100, label: total > 1 ? `Файл ${fIdx + 1}/${total}. ${label ?? ""}` : label });
        });
        const sectionFiles: { blob: Blob; url: string; name: string }[] = [];
        for (let i = 0; i < images.length; i++) {
          const name = total > 1 ? `${baseName}-стр${i + 1}.${ext}` : `page-${i + 1}.${ext}`;
          const item = { blob: images[i], url: URL.createObjectURL(images[i]), name };
          allResults.push(item);
          sectionFiles.push(item);
        }
        if (total > 1) sections.push({ sourceName: pdfFile.name, files: sectionFiles });
      }
      setConversionResults((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.url));
        return allResults;
      });
      setConversionSections(total > 1 ? sections : null);
      showStatus('success', total > 1 ? `Готово: ${total} файлов, ${allResults.length} изображений` : `Готово: ${allResults.length} страниц`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setConversionProgress(null);
    }
  };

  const handleImageConvert = async () => {
    if (!hasOnlyImages) { showStatus('error', 'Выберите изображения'); return; }
    setIsLoading(true);
    try {
      setConversionProgress({ current: 0, total: imageFiles.length, label: "Подготовка..." });
      const pdfBlob = await convertImagesToPDF(imageFiles, (current, total, label) => {
        setConversionProgress({ current, total, label: label ?? `${current} из ${total}` });
      });
      const url = URL.createObjectURL(pdfBlob);
      replaceConversionResults([{ blob: pdfBlob, url, name: `images.pdf` }]);
      showStatus('success', 'PDF создан', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setConversionProgress(null);
    }
  };

  const handleImageFormatConvert = async () => {
    if (!hasOnlyImages || !convertFormat) { showStatus('error', 'Выберите изображения и формат'); return; }
    setIsLoading(true);
    setConversionProgress({ current: 0, total: imageFiles.length, label: "Подготовка..." });
    try {
      const results = await convertImagesBetweenFormats(imageFiles, convertFormat, (current, total, label) => {
        setConversionProgress({ current, total, label: label ?? `${current} из ${total}` });
      });
      replaceConversionResults(results.map((item) => ({ blob: item.blob, url: URL.createObjectURL(item.blob), name: item.name })));
      showStatus('success', `Готово: ${results.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setConversionProgress(null);
    }
  };

  const handleCompress = async () => {
    if (pdfFilesList.length === 0) { showStatus('error', 'Выберите PDF файл(ы)'); return; }
    setIsLoading(true);
    try {
      if (pdfFilesList.length === 1) {
        const pdfFile = pdfFilesList[0];
        let compressedFile: Blob;
        if (processOnServer && pdfFile.size <= MAX_SERVER_FILE_SIZE) {
          const fd = new FormData(); fd.append("file", pdfFile); fd.append("compressionLevel", compressionLevel);
          const res = await fetch("/api/pdf/compress", { method: "POST", body: fd });
          compressedFile = res.ok ? await res.blob() : await compressPDF(pdfFile, compressionLevel);
        } else compressedFile = await compressPDF(pdfFile, compressionLevel);
        const url = URL.createObjectURL(compressedFile);
        replaceCompressResult({ blob: compressedFile, url, originalSize: pdfFile.size, compressedSize: compressedFile.size });
        showStatus('success', 'Сжатие завершено', 5000);
      } else {
        const results: { blob: Blob; url: string; name: string }[] = [];
        const total = pdfFilesList.length;
        for (let i = 0; i < total; i++) {
          const pdfFile = pdfFilesList[i];
          setConversionProgress({ current: i + 1, total, label: `Файл ${i + 1} из ${total}` });
          let compressedFile: Blob;
          if (processOnServer && pdfFile.size <= MAX_SERVER_FILE_SIZE) {
            const fd = new FormData(); fd.append("file", pdfFile); fd.append("compressionLevel", compressionLevel);
            const res = await fetch("/api/pdf/compress", { method: "POST", body: fd });
            compressedFile = res.ok ? await res.blob() : await compressPDF(pdfFile, compressionLevel);
          } else compressedFile = await compressPDF(pdfFile, compressionLevel);
          const baseName = pdfFile.name.replace(/\.pdf$/i, "");
          results.push({ blob: compressedFile, url: URL.createObjectURL(compressedFile), name: `compressed-${baseName}.pdf` });
        }
        replaceConversionResults(results);
        setConversionProgress(null);
        showStatus('success', `Сжато файлов: ${total}`, 5000);
      }
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!hasAtLeastTwoPdfFiles) { showStatus('error', 'Выберите минимум 2 PDF файла'); return; }
    const pdfFiles = fileListState.filter((f) => f.type === 'application/pdf');
    const totalSize = pdfFiles.reduce((s, f) => s + f.size, 0);
    setIsLoading(true);
    try {
      let mergedBlob: Blob;
      if (processOnServer && totalSize <= MAX_SERVER_FILE_SIZE) {
        const fd = new FormData();
        pdfFiles.forEach((f, i) => fd.append(`file${i}`, f));
        const res = await fetch("/api/pdf/merge", { method: "POST", body: fd });
        mergedBlob = res.ok ? await res.blob() : await mergePDFs(pdfFiles);
      } else mergedBlob = await mergePDFs(pdfFiles);
      const url = URL.createObjectURL(mergedBlob);
      replaceConversionResults([{ blob: mergedBlob, url, name: `merged.pdf` }]);
      showStatus('success', `Объединено ${pdfFiles.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplit = async () => {
    if (!selectedPdfFile) { showStatus('error', 'Выберите PDF файл'); return; }
    setIsLoading(true);
    try {
      let pdfBlobs: Blob[];
      if (processOnServer && selectedPdfFile.size <= MAX_SERVER_FILE_SIZE) {
        const fd = new FormData();
        fd.append("file", selectedPdfFile);
        fd.append("mode", splitMode);
        if (splitMode === "range") fd.append("range", splitRange);
        const res = await fetch("/api/pdf/split", { method: "POST", body: fd });
        if (res.ok) {
          const json = (await res.json()) as { files: string[] };
          pdfBlobs = json.files.map((b64) => {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return new Blob([bytes], { type: "application/pdf" });
          });
        } else {
          if (splitMode === 'all') pdfBlobs = await splitPDFIntoPages(selectedPdfFile);
          else {
            const parts = parsePageSelection(splitRange, pdfPageCount || undefined);
            if (parts.length === 0) { showStatus('error', 'Укажите страницы'); setIsLoading(false); return; }
            pdfBlobs = await splitPDF(selectedPdfFile, parts);
          }
        }
      } else {
        if (splitMode === 'all') pdfBlobs = await splitPDFIntoPages(selectedPdfFile);
        else {
          const parts = parsePageSelection(splitRange, pdfPageCount || undefined);
          if (parts.length === 0) { showStatus('error', 'Укажите страницы'); setIsLoading(false); return; }
          pdfBlobs = await splitPDF(selectedPdfFile, parts);
        }
      }
      replaceConversionResults(pdfBlobs.map((blob, i) => ({ blob, url: URL.createObjectURL(blob), name: `page-${i + 1}.pdf` })));
      showStatus('success', `Разделено на ${pdfBlobs.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToWord = async () => {
    if (pdfFilesList.length === 0) { showStatus('error', 'Выберите PDF файл(ы)'); return; }
    setIsLoading(true);
    try {
      const results: { blob: Blob; url: string; name: string }[] = [];
      const total = pdfFilesList.length;
      for (let i = 0; i < total; i++) {
        const pdfFile = pdfFilesList[i];
        if (total > 1) setConversionProgress({ current: i + 1, total, label: `Файл ${i + 1} из ${total}` });
        const blob = await convertPDFToWord(pdfFile);
        const baseName = pdfFile.name.replace(/\.pdf$/i, '');
        results.push({ blob, url: URL.createObjectURL(blob), name: `${baseName}.docx` });
      }
      replaceConversionResults(results);
      setConversionProgress(null);
      showStatus('success', total > 1 ? `Готово: ${total} файлов в Word` : 'Готово', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToExcel = async () => {
    if (pdfFilesList.length === 0) { showStatus('error', 'Выберите PDF файл(ы)'); return; }
    setIsLoading(true);
    try {
      const results: { blob: Blob; url: string; name: string }[] = [];
      const total = pdfFilesList.length;
      for (let i = 0; i < total; i++) {
        const pdfFile = pdfFilesList[i];
        if (total > 1) setConversionProgress({ current: i + 1, total, label: `Файл ${i + 1} из ${total}` });
        const blob = await convertPDFToExcel(pdfFile);
        const baseName = pdfFile.name.replace(/\.pdf$/i, '');
        results.push({ blob, url: URL.createObjectURL(blob), name: `${baseName}.xlsx` });
      }
      replaceConversionResults(results);
      setConversionProgress(null);
      showStatus('success', total > 1 ? `Готово: ${total} файлов в Excel` : 'Готово', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfToZip = async () => {
    if (pdfFilesList.length === 0) { showStatus("error", "Выберите PDF файл(ы)"); return; }
    const format = convertFormat || "PNG";
    const ext = format.toLowerCase();
    setIsLoading(true);
    setConversionProgress({ current: 0, total: pdfFilesList.length, label: "Подготовка..." });
    try {
      const results: { blob: Blob; url: string; name: string }[] = [];
      const total = pdfFilesList.length;
      for (let i = 0; i < total; i++) {
        const pdfFile = pdfFilesList[i];
        setConversionProgress({ current: i + 1, total, label: total > 1 ? `Файл ${i + 1} из ${total}` : `Страницы…` });
        const images = await convertPDFToImages(pdfFile, format, (pageNum, pageTotal) => {
          setConversionProgress({ current: (i * 100) + pageNum, total: total * 100, label: `Файл ${i + 1}/${total}, стр. ${pageNum}/${pageTotal}` });
        });
        const baseName = pdfFile.name.replace(/\.pdf$/i, "");
        const items = images.map((blob, p) => ({ blob, name: `page-${p + 1}.${ext}` }));
        const zipBlob = await createZipFromImages(items);
        results.push({ blob: zipBlob, url: URL.createObjectURL(zipBlob), name: `${baseName}-pages.zip` });
      }
      setConversionProgress(null);
      replaceConversionResults(results);
      showStatus("success", results.length > 1 ? `Готово: ${results.length} архивов` : "Готово", 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractText = async () => {
    if (pdfFilesList.length === 0) { showStatus("error", "Выберите PDF файл(ы)"); return; }
    setIsLoading(true);
    try {
      const total = pdfFilesList.length;
      const sections: { fileName: string; pages: { pageNum: number; text: string }[] }[] = [];
      for (let i = 0; i < total; i++) {
        const pdfFile = pdfFilesList[i];
        const fileLabel = total > 1 ? `Файл ${i + 1} из ${total}. ` : "";
        const onProgress = (cur: number, tot: number, msg: string) =>
          setConversionProgress({ current: i + 1, total, label: fileLabel + msg });
        if (total > 1) setConversionProgress({ current: i + 1, total, label: fileLabel + "Подготовка…" });
        let pages: { pageNum: number; text: string }[];
        if (processOnServer && pdfFile.size <= MAX_SERVER_FILE_SIZE) {
          const fd = new FormData(); fd.append("file", pdfFile);
          const res = await fetch("/api/pdf/extract-text", { method: "POST", body: fd });
          if (res.ok) { const data = (await res.json()) as { pages: { pageNum: number; text: string }[] }; pages = data.pages; }
          else pages = await extractTextFromPDF(pdfFile, { onProgress });
        } else pages = await extractTextFromPDF(pdfFile, { onProgress });
        sections.push({ fileName: pdfFile.name, pages });
      }
      setConversionProgress(null);
      setExtractedText(sections);
      showStatus("success", total > 1 ? `Текст извлечён из ${total} файлов` : "Текст извлечён", 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSignature = async () => {
    if (!selectedPdfFile || !signatureBlob) { showStatus('error', 'Выберите PDF и нарисуйте подпись'); return; }
    let pageNumbers: number[] | undefined;
    if (signaturePagesMode === "select" && signaturePagesRange.trim()) {
      pageNumbers = parsePageSelection(signaturePagesRange, pdfPageCount || undefined);
      if (pageNumbers.length === 0) { showStatus('error', 'Укажите страницы'); return; }
    }
    setIsLoading(true);
    try {
      const blob = await addSignature(selectedPdfFile, signatureBlob, {
        position: signaturePosition,
        customPosition: signaturePdfPosition ?? undefined,
        pageNumbers,
      });
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: `signed-${fileName}` }]);
      showStatus('success', 'Подпись добавлена', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPdfFile) { showStatus("error", "Выберите PDF файл"); return; }
    if (!hasPageRotations && !hasWatermark && !hasGlobalRotate) { showStatus("error", "Выберите действие"); return; }
    setIsLoading(true);
    try {
      let resultFile: Blob = selectedPdfFile;
      let resultName = fileName;
      if (hasPageRotations) {
        resultFile = await rotatePDFPages(new File([resultFile], resultName), editPageRotations);
        resultName = `rotated-${resultName}`;
      }
      if (hasGlobalRotate) {
        resultFile = await rotatePDF(new File([resultFile], resultName), rotateAngle);
        resultName = `rotated-${resultName}`;
      }
      if (hasWatermark) {
        resultFile = await addWatermark(new File([resultFile], resultName), watermarkText);
        resultName = `watermarked-${resultName}`;
      }
      const url = URL.createObjectURL(resultFile);
      replaceConversionResults([{ blob: resultFile, url, name: resultName }]);
      showStatus("success", "Готово", 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizePages = async () => {
    if (!selectedPdfFile) { showStatus("error", "Выберите PDF файл"); return; }
    const activePages = organizerPages.filter((p) => !p.deleted);
    if (activePages.length === 0) { showStatus("error", "Нет страниц для сохранения"); return; }
    const operations: OrganizePDFPageOperation[] = activePages.map((page) =>
      page.kind === "blank"
        ? { kind: "blank", width: page.width, height: page.height }
        : { kind: "source", sourceIndex: page.sourceIndex ?? 0, rotation: page.rotation, cropPercent: page.cropPercent }
    );
    setIsLoading(true);
    try {
      const blob = await organizePDFPages(selectedPdfFile, operations);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: `organized-${fileName}` }]);
      showStatus("success", "Готово", 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const relatedTools = TOOLS.filter(t => t.id !== tool.id).slice(0, 4);

  return (
    <>
      {/* Header */}
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-3 group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Все инструменты
          </Link>
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)]">
                {(tool.id === "pdfToImage" || tool.id === "imageToPdf") ? (
                  <span className="inline-flex items-center gap-3">
                    {tool.id === "pdfToImage" && (
                      <>
                        <FileFormatIcon extension="pdf" size="md" className="w-12 h-12" />
                        <span className="text-[var(--muted)] text-2xl">→</span>
                        <FileFormatIcon extension="jpg" size="md" className="w-12 h-12" />
                        <FileFormatIcon extension="png" size="md" className="w-12 h-12" />
                        <FileFormatIcon extension="webp" size="md" className="w-12 h-12" />
                      </>
                    )}
                    {tool.id === "imageToPdf" && (
                      <>
                        <FileFormatIcon extension="jpg" size="md" className="w-12 h-12" />
                        <FileFormatIcon extension="png" size="md" className="w-12 h-12" />
                        <FileFormatIcon extension="webp" size="md" className="w-12 h-12" />
                        <span className="text-[var(--muted)] text-2xl">→</span>
                        <FileFormatIcon extension="pdf" size="md" className="w-12 h-12" />
                      </>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <div className="icon-box icon-box-accent w-14 h-14 flex-shrink-0">
                      <img src={`/icons/${tool.id}.svg`} alt="" className="w-8 h-8" />
                    </div>
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)] leading-snug">
                {tool.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <div className="badge badge-success text-xs">
                  <Shield className="w-3 h-3" />
                  Локальная обработка
                </div>
                <div className="badge text-xs">
                  <Clock className="w-3 h-3" />
                  Быстро
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ad — над инструментом */}
      <section className="px-4 sm:px-6 pt-4 pb-2">
        <div className="max-w-6xl mx-auto">
          <AdPlaceholder size="banner" />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-8">
            {/* Tool Area — максимальная рабочая зона */}
            <div className="min-w-0">
              <div className="card p-6">
                {/* Upload Zone */}
                <div
                  className="upload-zone p-8 sm:p-12 text-center mb-6 min-h-[320px] sm:min-h-[380px] flex flex-col items-center justify-center"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept={inputAccept}
                    multiple={allowMultipleSelection}
                  />
                  <Upload className="w-8 h-8 text-[var(--muted)] mx-auto mb-3" />
                  <p className="text-[var(--foreground)] font-medium mb-1">
                    Перетащите файлы сюда
                  </p>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    или нажмите для выбора
                  </p>
                  <button onClick={triggerFileInput} className="btn btn-primary">
                    Выбрать файлы
                  </button>
                </div>

                {/* File List */}
                {fileList.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="text-sm text-[var(--muted)]">
                        Файлов: {fileList.length}
                        {batchToolTabs.includes(activeTab as (typeof batchToolTabs)[number]) &&
                          pdfFilesList.length > 0 &&
                          (pdfFilesList.length < fileList.filter((f) => f.type === "application/pdf").length ? (
                            <span className="ml-1">(обработаем первые {pdfFilesList.length})</span>
                          ) : pdfFilesList.length > 1 ? (
                            <span className="ml-1">— по очереди, макс. {MAX_BATCH_FILES}</span>
                          ) : null)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--muted)] mr-1">По имени:</span>
                        <button type="button" onClick={handleSortByNameAsc} className="btn btn-ghost btn-sm text-xs" title="По возрастанию (А→Я)">
                          А→Я
                        </button>
                        <button type="button" onClick={handleSortByNameDesc} className="btn btn-ghost btn-sm text-xs" title="По убыванию (Я→А)">
                          Я→А
                        </button>
                        <button onClick={handleClearFile} className="btn btn-ghost btn-sm ml-1">
                          <X className="w-4 h-4" />
                          Очистить
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-2">Добавить ещё: нажмите «Выбрать файлы» или перетащите в зону выше.</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {fileList.map((f, index) => {
                        const previewUrl = previewUrls[index] ?? null;
                        return (
                          <div
                            key={`${f.name}-${index}`}
                            className={`card p-1.5 min-w-0 relative group flex flex-col aspect-[210/297] ${draggedIndex === index ? "opacity-50" : ""} ${dropIndex === index ? "ring-2 ring-[var(--accent)]" : ""}`}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragOver={(e) => { e.preventDefault(); setDropIndex(index); }}
                            onDragLeave={() => setDropIndex(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedIndex != null) handleReorderFile(draggedIndex, index);
                              setDraggedIndex(null);
                              setDropIndex(null);
                            }}
                            onDragEnd={() => { setDraggedIndex(null); setDropIndex(null); }}
                          >
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setPreviewFileIndex(index); }}
                                className="p-1 rounded bg-[var(--background)]/90 hover:bg-[var(--surface)] border border-[var(--border)]"
                                title="Предпросмотр"
                              >
                                <Eye className="w-3.5 h-3.5 text-[var(--foreground)]" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                                className="p-1 rounded bg-[var(--background)]/90 hover:bg-red-100 dark:hover:bg-red-900/30 border border-[var(--border)]"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                            <div className="flex-1 min-h-0 relative bg-[var(--surface)] rounded flex items-center justify-center overflow-hidden cursor-move" title="Перетащите для изменения порядка">
                              {previewUrl ? (
                                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <FileFormatIcon file={f} size="md" />
                              )}
                              <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <GripVertical className="w-4 h-4 text-[var(--muted)]" />
                              </div>
                            </div>
                            <div className="mt-1 flex-shrink-0 min-w-0">
                              <p className="text-[10px] sm:text-xs text-[var(--foreground)] truncate pr-10" title={f.name}>{f.name}</p>
                              <p className="text-[10px] sm:text-xs text-[var(--muted)]">{formatFileSize(f.size)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Модальное окно предпросмотра */}
                    {previewFileIndex != null && fileList[previewFileIndex] && (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                        onClick={() => setPreviewFileIndex(null)}
                      >
                        <div className="bg-[var(--background)] rounded-xl shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                            <p className="text-sm font-medium truncate">{fileList[previewFileIndex].name}</p>
                            <button type="button" onClick={() => setPreviewFileIndex(null)} className="p-2 rounded-lg hover:bg-[var(--surface)]">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
                            {previewUrls[previewFileIndex] ? (
                              fileList[previewFileIndex].type.startsWith("image/") ? (
                                <img src={previewUrls[previewFileIndex]!} alt="" className="max-w-full max-h-[70vh] object-contain rounded" />
                              ) : (
                                <p className="text-[var(--muted)]">Превью доступно только для изображений.</p>
                              )
                            ) : fileList[previewFileIndex].type === "application/pdf" ? (
                              pdfPreviewLoading ? (
                                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                                  Загружаем предпросмотр…
                                </div>
                              ) : pdfPreviewError ? (
                                <p className="text-[var(--muted)]">{pdfPreviewError}</p>
                              ) : pdfPreviewImage ? (
                                <img src={pdfPreviewImage} alt="" className="max-w-full max-h-[70vh] object-contain rounded" />
                              ) : (
                                <p className="text-[var(--muted)]">Не удалось построить предпросмотр PDF.</p>
                              )
                            ) : (
                              <FileFormatIcon file={fileList[previewFileIndex]} size="md" className="w-16 h-16" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool-specific controls */}
                {activeTab === "edit" && file && file.type.startsWith("application/pdf") && pdfPageCount > 0 && (
                  <div className="mb-6">
                    <PDFEditPreview
                      pdfFile={file}
                      pageRotations={editPageRotations}
                      onPageRotationsChange={setEditPageRotations}
                      pageCount={pdfPageCount}
                    />
                  </div>
                )}

                {activeTab === "organizePages" && selectedPdfFile && (
                  <div className="mb-6">
                    <PDFPageOrganizer
                      pdfFile={selectedPdfFile}
                      pageCount={pdfPageCount}
                      onChange={setOrganizerPages}
                      useServerPreviews={processOnServer}
                    />
                  </div>
                )}

                {activeTab === "signature" && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Подпись</label>
                      <SignaturePad
                        onSignatureChange={(blob) => { setSignatureBlob(blob); if (!blob) setSignaturePdfPosition(null); }}
                        width={480}
                        height={200}
                        strokeColor={signatureColor}
                      />
                    </div>
                    {file && file.type.startsWith("application/pdf") && signatureBlob && (
                      <div>
                        <label className="text-sm text-[var(--muted)] mb-2 block">Предпросмотр</label>
                        <SignaturePreview
                          pdfFile={file}
                          signatureBlob={signatureBlob}
                          position={signaturePosition}
                          onPositionChange={(x, y) => setSignaturePdfPosition({ x, y })}
                          previewPage={signaturePreviewPage}
                          pageCount={pdfPageCount}
                          onPageChange={setSignaturePreviewPage}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Settings */}
                <div className="space-y-4">
                  {activeTab === "pdfToImage" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">В какой формат сохранить страницы</label>
                      <div className="flex flex-wrap gap-3">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn inline-flex items-center gap-2 px-4 py-2.5 text-base ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            <FileFormatIcon extension={format.value.toLowerCase()} size="md" />
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "imageConverter" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Конвертировать изображения в формат</label>
                      <div className="flex flex-wrap gap-3">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn inline-flex items-center gap-2 px-4 py-2.5 text-base ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            <FileFormatIcon extension={format.value.toLowerCase()} size="md" />
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "pdfToZip" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Формат картинок в архиве</label>
                      <div className="flex flex-wrap gap-3">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn inline-flex items-center gap-2 px-4 py-2.5 text-base ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            <FileFormatIcon extension={format.value.toLowerCase()} size="md" />
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "compress" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Насколько сильно сжимать PDF</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { level: "low", name: "Низкое" },
                          { level: "medium", name: "Среднее" },
                          { level: "high", name: "Высокое" },
                        ].map((c) => (
                          <button
                            key={c.level}
                            onClick={() => setCompressionLevel(c.level)}
                            className={`btn btn-sm ${compressionLevel === c.level ? "btn-primary" : "btn-secondary"}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "split" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-[var(--muted)] mb-2 block">Как разделить документ</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSplitMode("all")}
                            className={`btn btn-sm ${splitMode === "all" ? "btn-primary" : "btn-secondary"}`}
                          >
                            По страницам
                          </button>
                          <button
                            onClick={() => setSplitMode("range")}
                            className={`btn btn-sm ${splitMode === "range" ? "btn-primary" : "btn-secondary"}`}
                          >
                            Диапазон
                          </button>
                        </div>
                      </div>
                      {splitMode === "range" && (
                        <input
                          type="text"
                          value={splitRange}
                          onChange={(e) => setSplitRange(e.target.value)}
                          placeholder="1, 3, 5 или 1-5"
                          className="w-full"
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "signature" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-[var(--muted)] mb-2 block">На каких страницах поставить подпись</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSignaturePagesMode("all")}
                            className={`btn btn-sm ${signaturePagesMode === "all" ? "btn-primary" : "btn-secondary"}`}
                          >
                            Все
                          </button>
                          <button
                            onClick={() => setSignaturePagesMode("select")}
                            className={`btn btn-sm ${signaturePagesMode === "select" ? "btn-primary" : "btn-secondary"}`}
                          >
                            Выбрать
                          </button>
                        </div>
                        {signaturePagesMode === "select" && (
                          <input
                            type="text"
                            value={signaturePagesRange}
                            onChange={(e) => setSignaturePagesRange(e.target.value)}
                            placeholder="1, 3, 5 или 1-5"
                            className="w-full mt-2"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-[var(--muted)] mb-2 block">Цвет подписи</label>
                        <div className="flex gap-2">
                          {SIGNATURE_COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => setSignatureColor(c.value)}
                              className={`w-8 h-8 rounded border-2 ${signatureColor === c.value ? "border-[var(--foreground)]" : "border-transparent"}`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "edit" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-[var(--muted)] mb-2 block">Что сделать с документом</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleEditTool("Повернуть")}
                            className={`btn btn-sm ${editTools.includes("Повернуть") ? "btn-primary" : "btn-secondary"}`}
                          >
                            <RotateCw className="w-4 h-4" />
                            Повернуть
                          </button>
                          <button
                            onClick={() => toggleEditTool("Водяной знак")}
                            className={`btn btn-sm ${editTools.includes("Водяной знак") ? "btn-primary" : "btn-secondary"}`}
                          >
                            <FileText className="w-4 h-4" />
                            Водяной знак
                          </button>
                        </div>
                      </div>
                      {editTools.includes("Повернуть") && (
                        <div className="flex gap-2">
                          {([90, 180, 270] as const).map((angle) => (
                            <button
                              key={angle}
                              onClick={() => setRotateAngle(angle)}
                              className={`btn btn-sm ${rotateAngle === angle ? "btn-primary" : "btn-secondary"}`}
                            >
                              {angle}°
                            </button>
                          ))}
                        </div>
                      )}
                      {editTools.includes("Водяной знак") && (
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          placeholder="Текст водяного знака"
                          className="w-full"
                        />
                      )}
                    </div>
                  )}

                  {/* Обработка на сервере (до 20 МБ) — отключено */}

                  {/* Action Button */}
                  <div className="pt-4">
                    {activeTab === "pdfToImage" && (
                      <button onClick={handleConvert} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : pdfFilesList.length > 1 ? `Конвертировать ${pdfFilesList.length} файлов` : "Конвертировать"}
                      </button>
                    )}
                    {activeTab === "imageToPdf" && (
                      <button onClick={handleImageConvert} disabled={isLoading || !hasOnlyImages} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Создать PDF"}
                      </button>
                    )}
                    {activeTab === "imageConverter" && (
                      <button onClick={handleImageFormatConvert} disabled={isLoading || !hasOnlyImages} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : `Конвертировать`}
                      </button>
                    )}
                    {activeTab === "pdfToWord" && (
                      <button onClick={handlePDFToWord} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : pdfFilesList.length > 1 ? `В Word (${pdfFilesList.length} файлов)` : "Сохранить как Word"}
                      </button>
                    )}
                    {activeTab === "pdfToExcel" && (
                      <button onClick={handlePDFToExcel} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : pdfFilesList.length > 1 ? `В Excel (${pdfFilesList.length} файлов)` : "Сохранить как Excel"}
                      </button>
                    )}
                    {activeTab === "pdfToZip" && (
                      <button onClick={handlePdfToZip} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : pdfFilesList.length > 1 ? `Скачать ${pdfFilesList.length} ZIP` : "Скачать как ZIP"}
                      </button>
                    )}
                    {activeTab === "extractText" && (
                      <button onClick={handleExtractText} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Извлечение..." : pdfFilesList.length > 1 ? `Извлечь из ${pdfFilesList.length} файлов` : "Извлечь текст"}
                      </button>
                    )}
                    {activeTab === "merge" && (
                      <button onClick={handleMerge} disabled={isLoading || !hasAtLeastTwoPdfFiles} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Объединить PDF"}
                      </button>
                    )}
                    {activeTab === "split" && (
                      <button onClick={handleSplit} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Разделить PDF"}
                      </button>
                    )}
                    {activeTab === "compress" && (
                      <button onClick={handleCompress} disabled={isLoading || !hasAtLeastOnePdf} className="btn btn-primary w-full">
                        {isLoading ? "Сжатие..." : pdfFilesList.length > 1 ? `Сжать ${pdfFilesList.length} файлов` : "Сжать PDF"}
                      </button>
                    )}
                    {activeTab === "signature" && (
                      <button onClick={handleAddSignature} disabled={isLoading || !selectedPdfFile || !signatureBlob} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Добавить подпись"}
                      </button>
                    )}
                    {activeTab === "edit" && (
                      <button onClick={handleEdit} disabled={isLoading || (!hasPageRotations && !hasWatermark && !hasGlobalRotate)} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Применить"}
                      </button>
                    )}
                    {activeTab === "organizePages" && (
                      <button onClick={handleOrganizePages} disabled={isLoading || !selectedPdfFile || !hasOrganizeChanges} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Применить"}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <UserMemoryUsage />
                  </div>
                </div>

                {/* Прогресс выполнения — во всех инструментах при загрузке */}
                {isLoading && (
                  <div className="mt-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {conversionProgress?.label ?? "Обработка..."}
                      </span>
                    </div>
                    {conversionProgress && conversionProgress.total > 0 && (
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
                          style={{ width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Status Message */}
                {statusMessage && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${statusMessage.type === 'success' ? 'status-success' : 'status-error'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span className="text-sm">{statusMessage.text}</span>
                  </div>
                )}

                {/* Results */}
                {conversionResults.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-[var(--foreground)]">Результаты</h3>
                      {(conversionSections?.length ? conversionSections.length > 1 : conversionResults.length > 1) && (
                        <button onClick={downloadAllAsZip} disabled={isLoading} className="btn btn-sm btn-secondary">
                          <Download className="w-4 h-4" />
                          Скачать все
                        </button>
                      )}
                    </div>
                    {conversionSections && conversionSections.length > 0 ? (
                      <div className="space-y-6">
                        {conversionSections.map((section, sectionIndex) => {
                          const flatStart = conversionSections.slice(0, sectionIndex).reduce((acc, s) => acc + s.files.length, 0);
                          return (
                            <div key={sectionIndex} className="rounded-lg border border-[var(--border)] overflow-hidden">
                              <div className="flex items-center justify-between p-3 bg-[var(--surface)] border-b border-[var(--border)]">
                                <span className="text-sm font-medium text-[var(--foreground)] truncate" title={section.sourceName}>{section.sourceName}</span>
                                <button onClick={() => downloadSectionAsZip(sectionIndex)} disabled={isLoading} className="btn btn-sm btn-secondary">
                                  <Download className="w-4 h-4" />
                                  Скачать
                                </button>
                              </div>
                              <div className="p-2 space-y-2">
                                {section.files.map((result, fileIndex) => {
                                  const flatIndex = flatStart + fileIndex;
                                  const isImage = result.blob.type.startsWith("image/");
                                  const ext = result.name.split(".").pop()?.toLowerCase() ?? "";
                                  return (
                                    <div key={fileIndex} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg gap-3">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-14 h-14 rounded-lg bg-[var(--background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                          {isImage ? (
                                            <img src={result.url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <FileFormatIcon extension={ext} size="md" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm text-[var(--foreground)] truncate" title={result.name}>{result.name}</p>
                                          <p className="text-xs text-[var(--muted)]">{formatFileSize(result.blob.size)}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => setResultPreviewIndex(flatIndex)} className="btn btn-icon-sm btn-ghost" title="Предпросмотр">
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => downloadResult(result.url, result.name)} className="btn btn-icon-sm btn-ghost" title="Скачать">
                                          <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteResult(result.url, flatIndex)} className="btn btn-icon-sm btn-ghost" title="Удалить">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conversionResults.map((result, index) => {
                          const isImage = result.blob.type.startsWith("image/");
                          const ext = result.name.split(".").pop()?.toLowerCase() ?? "";
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-14 h-14 rounded-lg bg-[var(--background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {isImage ? (
                                    <img src={result.url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <FileFormatIcon extension={ext} size="md" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-[var(--foreground)] truncate" title={result.name}>{result.name}</p>
                                  <p className="text-xs text-[var(--muted)]">{formatFileSize(result.blob.size)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => setResultPreviewIndex(index)} className="btn btn-icon-sm btn-ghost" title="Предпросмотр">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => downloadResult(result.url, result.name)} className="btn btn-icon-sm btn-ghost" title="Скачать">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteResult(result.url, index)} className="btn btn-icon-sm btn-ghost" title="Удалить">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Модальное окно предпросмотра результата конвертации */}
                {resultPreviewIndex != null && conversionResults[resultPreviewIndex] && (() => {
                  const result = conversionResults[resultPreviewIndex!];
                  const isPdf = result.blob.type === "application/pdf";
                  const isImage = result.blob.type.startsWith("image/");
                  return (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                      onClick={() => setResultPreviewIndex(null)}
                    >
                      <div className="bg-[var(--background)] rounded-xl shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                          <p className="text-sm font-medium truncate">{result.name}</p>
                          <button type="button" onClick={() => setResultPreviewIndex(null)} className="p-2 rounded-lg hover:bg-[var(--surface)]">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
                          {isImage ? (
                            <img src={result.url} alt="" className="max-w-full max-h-[70vh] object-contain rounded" />
                          ) : isPdf ? (
                            <iframe src={result.url} title={result.name} className="w-full min-h-[70vh] rounded border-0" style={{ height: "70vh" }} />
                          ) : (
                            <p className="text-[var(--muted)]">Предпросмотр недоступен.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Extracted Text */}
                {extractedText && extractedText.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-[var(--foreground)]">Текст</h3>
                      <button
                        onClick={() => {
                          const full = extractedText
                            .map((section) =>
                              [
                                `=== ${section.fileName} ===`,
                                ...section.pages.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`),
                              ].join("\n\n")
                            )
                            .join("\n\n\n");
                          void navigator.clipboard.writeText(full);
                          showStatus("success", "Скопировано", 3000);
                        }}
                        className="btn btn-sm btn-secondary"
                      >
                        Копировать
                      </button>
                    </div>
                    <textarea
                      readOnly
                      className="w-full h-48 p-3 text-sm font-mono bg-[var(--surface)] rounded-lg resize-none border border-[var(--border)]"
                      value={extractedText
                        .map((section) =>
                          [
                            `=== ${section.fileName} ===`,
                            ...section.pages.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`),
                          ].join("\n\n")
                        )
                        .join("\n\n\n")}
                    />
                  </div>
                )}

                {/* Compress Result — размеры, просмотр, загрузка */}
                {compressResult && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-[var(--foreground)]">Результат</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setCompressPreviewOpen(true)} className="btn btn-sm btn-secondary" title="Предпросмотр">
                          <Eye className="w-4 h-4" />
                          Просмотр
                        </button>
                        <button onClick={downloadCompressedFile} className="btn btn-sm btn-primary">
                          <Download className="w-4 h-4" />
                          Скачать
                        </button>
                        <button onClick={() => { clearCompressResult(); setCompressPreviewOpen(false); }} className="btn btn-icon-sm btn-ghost">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-[var(--surface)] rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-[var(--muted)]">Было</p>
                          <p className="text-sm font-medium text-[var(--foreground)]">{formatFileSize(compressResult.originalSize)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">Стало</p>
                          <p className="text-sm font-medium text-[var(--foreground)]">{formatFileSize(compressResult.compressedSize)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">Экономия</p>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {((1 - compressResult.compressedSize / compressResult.originalSize) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Модальное окно предпросмотра сжатого PDF */}
                {compressPreviewOpen && compressResult && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCompressPreviewOpen(false)}>
                    <div className="bg-[var(--background)] rounded-xl shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                        <p className="text-sm font-medium truncate">Сжатый PDF</p>
                        <button type="button" onClick={() => setCompressPreviewOpen(false)} className="p-2 rounded-lg hover:bg-[var(--surface)]">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
                        <iframe src={compressResult.url} title="Сжатый PDF" className="w-full rounded border-0" style={{ height: "70vh" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar — под рабочей зоной */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Ad */}
              <div>
                <AdPlaceholder size="rectangle" />
              </div>

              {/* Related Tools */}
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">Другие инструменты</h3>
                <div className="space-y-2">
                  {relatedTools.map((t) => (
                    <Link
                      key={t.id}
                      href={`/${t.path}`}
                      className="block p-3 rounded-lg border border-[var(--border)] hover:border-[var(--foreground)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                          <img src={`/icons/${t.id}.svg`} alt="" className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-[var(--foreground)]">{t.title.split(" — ")[0]}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--success-light)] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[var(--success)]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Безопасность</h4>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  Все файлы обрабатываются локально в вашем браузере и никогда не загружаются на сервер.
                </p>
              </div>
              
              {/* Format info */}
              {formats && (
                <div className="card p-4">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">О форматах</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-[3rem] h-8 px-2 rounded bg-[var(--surface)] flex items-center justify-center text-xs font-bold text-[var(--muted)]">
                        {formats.from}
                      </div>
                      <span className="text-sm text-[var(--muted)]">Исходный формат</span>
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="min-w-[3rem] h-8 px-2 rounded bg-[var(--accent)] flex items-center justify-center text-xs font-bold text-white">
                        {formats.to}
                      </div>
                      <span className="text-sm text-[var(--foreground)]">Результат</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
