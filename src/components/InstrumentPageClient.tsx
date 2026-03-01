"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Upload, Download, Trash2, FileText, Image, X, CheckCircle2, XCircle, RotateCw, ChevronLeft, Shield, Clock } from "lucide-react";
import { TOOL_FORMATS, TOOLS } from "@/app/tools-config";
import type { ToolId } from "@/app/tools-config";
import { AdPlaceholder } from "./AdPlaceholder";
import { SignaturePad, SIGNATURE_COLORS } from "./SignaturePad";
import { SignaturePreview } from "./SignaturePreview";
import { PDFEditPreview } from "./PDFEditPreview";
import { PDFPageOrganizer, type OrganizerPageItem } from "./PDFPageOrganizer";
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
  const [conversionResults, setConversionResults] = useState<{blob: Blob, url: string, name: string}[]>([]);
  const [compressResult, setCompressResult] = useState<{blob: Blob, url: string, originalSize: number, compressedSize: number} | null>(null);
  const [extractedText, setExtractedText] = useState<{ pageNum: number; text: string }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);

  const activeTab = tool.id;
  const allowMultipleSelection = activeTab === "merge" || activeTab === "imageToPdf" || activeTab === "imageConverter";
  
  const inputAccept = useMemo(() => {
    if (activeTab === "imageToPdf" || activeTab === "imageConverter") return ".jpg,.jpeg,.png,.webp";
    if (activeTab === "merge") return ".pdf";
    return ".pdf";
  }, [activeTab]);

  const fileList = useMemo(() => {
    if (files && files.length > 0) return Array.from(files);
    if (file) return [file];
    return [];
  }, [files, file]);

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

  useEffect(() => {
    if ((activeTab === "pdfToImage" || activeTab === "pdfToZip" || activeTab === "imageConverter") && !convertFormat) {
      setConvertFormat("PNG");
    }
  }, [activeTab, convertFormat]);

  useEffect(() => {
    const list = files && files.length > 0 ? Array.from(files) : file ? [file] : [];
    if (list.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls: (string | null)[] = list.map((f) =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : null
    );
    setPreviewUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files, file]);

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
      const list = Array.from(selectedFiles);
      const primaryFile = activeTab === "imageToPdf" || activeTab === "imageConverter"
        ? list[0]
        : list.find((f) => f.type === "application/pdf") ?? list[0];
      setFiles(selectedFiles);
      setFileName(primaryFile.name);
      setFile(primaryFile);
      if (primaryFile.type.startsWith("application/pdf")) {
        getPDFPageCount(primaryFile).then((n) => {
          setPdfPageCount(n);
          setEditPageRotations(Array(n).fill(0));
        });
      } else {
        setPdfPageCount(0);
        setEditPageRotations([]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const list = Array.from(droppedFiles);
      const primaryFile = activeTab === "imageToPdf" || activeTab === "imageConverter"
        ? list[0]
        : list.find((f) => f.type === "application/pdf") ?? list[0];
      setFiles(droppedFiles);
      setFileName(primaryFile.name);
      setFile(primaryFile);
      if (primaryFile.type.startsWith("application/pdf")) {
        getPDFPageCount(primaryFile).then((n) => {
          setPdfPageCount(n);
          setEditPageRotations(Array(n).fill(0));
        });
      } else {
        setPdfPageCount(0);
        setEditPageRotations([]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClearFile = () => {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const deleteResult = (url: string, index: number) => {
    URL.revokeObjectURL(url);
    setConversionResults(prev => prev.filter((_, i) => i !== index));
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
    if (!selectedPdfFile) { showStatus('error', 'Выберите PDF файл'); return; }
    if (!convertFormat) { showStatus('error', 'Выберите формат'); return; }
    setIsLoading(true);
    try {
      const images = await convertPDFToImages(selectedPdfFile, convertFormat);
      const results = images.map((blob, index) => ({
        blob, url: URL.createObjectURL(blob), name: `page-${index + 1}.${convertFormat.toLowerCase()}`
      }));
      replaceConversionResults(results);
      showStatus('success', `Готово: ${images.length} страниц`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageConvert = async () => {
    if (!hasOnlyImages) { showStatus('error', 'Выберите изображения'); return; }
    setIsLoading(true);
    try {
      const pdfBlob = await convertImagesToPDF(imageFiles);
      const url = URL.createObjectURL(pdfBlob);
      replaceConversionResults([{ blob: pdfBlob, url, name: `images.pdf` }]);
      showStatus('success', 'PDF создан', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageFormatConvert = async () => {
    if (!hasOnlyImages || !convertFormat) { showStatus('error', 'Выберите изображения и формат'); return; }
    setIsLoading(true);
    try {
      const results = await convertImagesBetweenFormats(imageFiles, convertFormat);
      replaceConversionResults(results.map((item) => ({ blob: item.blob, url: URL.createObjectURL(item.blob), name: item.name })));
      showStatus('success', `Готово: ${results.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!selectedPdfFile) { showStatus('error', 'Выберите PDF файл'); return; }
    setIsLoading(true);
    try {
      const compressedFile = await compressPDF(selectedPdfFile, compressionLevel);
      const url = URL.createObjectURL(compressedFile);
      replaceCompressResult({ blob: compressedFile, url, originalSize: selectedPdfFile.size, compressedSize: compressedFile.size });
      showStatus('success', 'Сжатие завершено', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!hasAtLeastTwoPdfFiles) { showStatus('error', 'Выберите минимум 2 PDF файла'); return; }
    setIsLoading(true);
    try {
      const pdfFiles = Array.from(files!).filter((f) => f.type === 'application/pdf');
      const mergedBlob = await mergePDFs(pdfFiles);
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
      if (splitMode === 'all') {
        pdfBlobs = await splitPDFIntoPages(selectedPdfFile);
      } else {
        const parts = parsePageSelection(splitRange, pdfPageCount || undefined);
        if (parts.length === 0) { showStatus('error', 'Укажите страницы'); setIsLoading(false); return; }
        pdfBlobs = await splitPDF(selectedPdfFile, parts);
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
    if (!selectedPdfFile) { showStatus('error', 'Выберите PDF файл'); return; }
    setIsLoading(true);
    try {
      const blob = await convertPDFToWord(selectedPdfFile);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.docx') }]);
      showStatus('success', 'Готово', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToExcel = async () => {
    if (!selectedPdfFile) { showStatus('error', 'Выберите PDF файл'); return; }
    setIsLoading(true);
    try {
      const blob = await convertPDFToExcel(selectedPdfFile);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.xlsx') }]);
      showStatus('success', 'Готово', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfToZip = async () => {
    if (!selectedPdfFile) { showStatus("error", "Выберите PDF файл"); return; }
    const format = convertFormat || "PNG";
    setIsLoading(true);
    try {
      const images = await convertPDFToImages(selectedPdfFile, format);
      const items = images.map((blob, i) => ({ blob, name: `page-${i + 1}.${format.toLowerCase()}` }));
      const zipBlob = await createZipFromImages(items);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.pdf$/i, "")}-pages.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus("success", `Архив скачан`, 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractText = async () => {
    if (!selectedPdfFile) { showStatus("error", "Выберите PDF файл"); return; }
    setIsLoading(true);
    try {
      const pages = await extractTextFromPDF(selectedPdfFile);
      setExtractedText(pages);
      showStatus("success", "Текст извлечён", 5000);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Все инструменты
          </Link>
          
          <div className="flex items-start gap-4">
            <div className="icon-box icon-box-accent w-14 h-14 flex-shrink-0">
              <img src={`/icons/${tool.id}.svg`} alt="" className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                {toolTitle}
              </h1>
              <p className="mt-2 text-[var(--muted)] leading-relaxed">
                {tool.description}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="badge badge-success">
                  <Shield className="w-3 h-3" />
                  Локальная обработка
                </div>
                <div className="badge">
                  <Clock className="w-3 h-3" />
                  Быстро
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tool Area */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                {/* Upload Zone */}
                <div
                  className="upload-zone p-8 text-center mb-6"
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
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[var(--muted)]">
                        Файлов: {fileList.length}
                      </span>
                      <button onClick={handleClearFile} className="btn btn-ghost btn-sm">
                        <X className="w-4 h-4" />
                        Очистить
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {fileList.map((f, index) => {
                        const isPdf = f.type.startsWith("application/pdf");
                        const previewUrl = previewUrls[index] ?? null;
                        return (
                          <div key={`${f.name}-${index}`} className="card p-3">
                            <div className="aspect-square bg-[var(--surface)] rounded flex items-center justify-center mb-2">
                              {previewUrl ? (
                                <img src={previewUrl} alt="" className="w-full h-full object-cover rounded" />
                              ) : isPdf ? (
                                <FileText className="w-8 h-8 text-[var(--muted)]" />
                              ) : (
                                <Image className="w-8 h-8 text-[var(--muted)]" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--foreground)] truncate">{f.name}</p>
                            <p className="text-xs text-[var(--muted)]">{formatFileSize(f.size)}</p>
                          </div>
                        );
                      })}
                    </div>
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
                      <label className="text-sm text-[var(--muted)] mb-2 block">Формат</label>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn btn-sm ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "imageConverter" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Формат</label>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn btn-sm ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "pdfToZip" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Формат изображений</label>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => setConvertFormat(format.value)}
                            className={`btn btn-sm ${convertFormat === format.value ? "btn-primary" : "btn-secondary"}`}
                          >
                            {format.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "compress" && (
                    <div>
                      <label className="text-sm text-[var(--muted)] mb-2 block">Уровень сжатия</label>
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
                        <label className="text-sm text-[var(--muted)] mb-2 block">Режим</label>
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
                        <label className="text-sm text-[var(--muted)] mb-2 block">Страницы</label>
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
                        <label className="text-sm text-[var(--muted)] mb-2 block">Действия</label>
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

                  {/* Action Button */}
                  <div className="pt-4">
                    {activeTab === "pdfToImage" && (
                      <button onClick={handleConvert} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : `Конвертировать`}
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
                      <button onClick={handlePDFToWord} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Сохранить как Word"}
                      </button>
                    )}
                    {activeTab === "pdfToExcel" && (
                      <button onClick={handlePDFToExcel} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Сохранить как Excel"}
                      </button>
                    )}
                    {activeTab === "pdfToZip" && (
                      <button onClick={handlePdfToZip} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Скачать как ZIP"}
                      </button>
                    )}
                    {activeTab === "extractText" && (
                      <button onClick={handleExtractText} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Извлечь текст"}
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
                      <button onClick={handleCompress} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                        {isLoading ? "Обработка..." : "Сжать PDF"}
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
                </div>

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
                      {conversionResults.length > 1 && (
                        <button onClick={downloadAllAsZip} disabled={isLoading} className="btn btn-sm btn-secondary">
                          <Download className="w-4 h-4" />
                          Скачать все
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {conversionResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-[var(--background)] rounded flex items-center justify-center text-xs font-medium text-[var(--muted)] flex-shrink-0">
                              {result.name.split('.').pop()?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-[var(--foreground)] truncate">{result.name}</p>
                              <p className="text-xs text-[var(--muted)]">{formatFileSize(result.blob.size)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => downloadResult(result.url, result.name)} className="btn btn-icon-sm btn-ghost">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteResult(result.url, index)} className="btn btn-icon-sm btn-ghost">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Text */}
                {extractedText && extractedText.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-[var(--foreground)]">Текст</h3>
                      <button
                        onClick={() => {
                          const full = extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n");
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
                      value={extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n")}
                    />
                  </div>
                )}

                {/* Compress Result */}
                {compressResult && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-[var(--foreground)]">Результат</h3>
                      <div className="flex gap-2">
                        <button onClick={downloadCompressedFile} className="btn btn-sm btn-primary">
                          <Download className="w-4 h-4" />
                          Скачать
                        </button>
                        <button onClick={() => clearCompressResult()} className="btn btn-icon-sm btn-ghost">
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
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ad */}
              <AdPlaceholder size="rectangle" />

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

      {/* Bottom Ad */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <AdPlaceholder size="banner" />
        </div>
      </section>
    </>
  );
}
