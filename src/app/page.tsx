"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { compressPDF, convertPDFToImages, addWatermark, mergePDFs, splitPDF, splitPDFIntoPages, rotatePDF, rotatePDFPages, convertImagesToPDF, createZipFromImages, convertPDFToWord, convertPDFToExcel, addSignature, getPDFPageCount, extractTextFromPDF, organizePDFPages, convertImagesBetweenFormats, type OrganizePDFPageOperation, type SignaturePosition } from "./utils/pdfUtils";
import { Upload, X, Download, Trash2, FileText, Image, RotateCw, CheckCircle2, XCircle, ArrowRight, Shield, Zap, Globe, Sparkles } from 'lucide-react';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AdPlaceholder } from "../components/AdPlaceholder";
import { SignaturePad, SIGNATURE_COLORS } from "../components/SignaturePad";
import { SignaturePreview } from "../components/SignaturePreview";
import { PDFEditPreview } from "../components/PDFEditPreview";
import { PDFPageOrganizer, type OrganizerPageItem } from "../components/PDFPageOrganizer";
import { TOOLS, TOOL_CATEGORIES, getToolById } from "./tools-config";

const TAB_IDS = ["pdfToImage", "imageToPdf", "imageConverter", "pdfToWord", "pdfToExcel", "organizePages", "merge", "split", "signature", "edit", "compress", "pdfToZip", "extractText"] as const;

const IMAGE_FORMAT_OPTIONS = [
  { value: "JPG", title: "JPG" },
  { value: "PNG", title: "PNG" },
  { value: "WebP", title: "WebP" },
] as const;

type PDFToolsContentProps = {
  forcedTool?: string;
  forcedStandalone?: boolean;
};

export function PDFToolsContent({ forcedTool, forcedStandalone = false }: PDFToolsContentProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolFromQuery = useMemo(() => searchParams.get("tool"), [searchParams]);
  const toolFromUrl = forcedTool ?? toolFromQuery;
  const standalone = forcedStandalone || searchParams.get("standalone") === "1";
  const initialTabFromUrl = useMemo(() => {
    if (toolFromUrl && TAB_IDS.includes(toolFromUrl as (typeof TAB_IDS)[number])) return toolFromUrl;
    return null;
  }, [toolFromUrl]);

  const [activeTab, setActiveTab] = useState<string>(initialTabFromUrl ?? "pdfToImage");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (standalone || !initialTabFromUrl) return;
    const tool = getToolById(initialTabFromUrl);
    if (tool?.path && typeof window !== "undefined" && window.self === window.top) {
      router.replace(`/${tool.path}`, { scroll: true });
    }
  }, [initialTabFromUrl, router, standalone]);

  useEffect(() => {
    if (initialTabFromUrl) setActiveTab(initialTabFromUrl);
  }, [initialTabFromUrl]);

  const filteredTools = useMemo(() => {
    if (categoryFilter === "all") return [...TOOLS];
    return TOOLS.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);
  const activeToolMeta = useMemo(() => getToolById(activeTab), [activeTab]);

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
  const allowMultipleSelection = activeTab === "merge" || activeTab === "imageToPdf" || activeTab === "imageConverter";
  const inputAccept = useMemo(() => {
    if (activeTab === "imageToPdf" || activeTab === "imageConverter") return ".jpg,.jpeg,.png,.webp";
    if (activeTab === "merge") return ".pdf";
    if (activeTab === "pdfToImage" || activeTab === "pdfToWord" || activeTab === "pdfToExcel" || activeTab === "pdfToZip" || activeTab === "extractText" || activeTab === "signature" || activeTab === "edit" || activeTab === "split" || activeTab === "compress" || activeTab === "organizePages") {
      return ".pdf";
    }
    return ".pdf,.jpg,.jpeg,.png,.webp";
  }, [activeTab]);

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

  useEffect(() => {
    if ((activeTab === "pdfToImage" || activeTab === "pdfToZip" || activeTab === "imageConverter") && !convertFormat) {
      setConvertFormat("PNG");
    }
    setStatusMessage(null);
    setExtractedText(null);
    setConversionResults((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setCompressResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, [activeTab]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const list = Array.from(selectedFiles);
      const primaryFile =
        activeTab === "imageToPdf" || activeTab === "imageConverter"
          ? list[0]
          : list.find((f) => f.type === "application/pdf") ?? list[0];
      setFiles(selectedFiles);
      setFileName(primaryFile.name);
      const f = primaryFile;
      setFile(f);
      if (f.type.startsWith("application/pdf")) {
        getPDFPageCount(f).then((n) => {
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
      const primaryFile =
        activeTab === "imageToPdf" || activeTab === "imageConverter"
          ? list[0]
          : list.find((f) => f.type === "application/pdf") ?? list[0];
      setFiles(droppedFiles);
      setFileName(primaryFile.name);
      const f = primaryFile;
      setFile(f);
      if (f.type.startsWith("application/pdf")) {
        getPDFPageCount(f).then((n) => {
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

  const showStatus = (type: 'success' | 'error', text: string, duration = 8000) => {
    setStatusMessage({ type, text });
    if (duration > 0) {
      setTimeout(() => setStatusMessage(null), duration);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImageConvert = async () => {
    if (imageFiles.length === 0) {
      showStatus('error', 'Пожалуйста, выберите изображения для конвертации');
      return;
    }
    if (!hasOnlyImages) {
      showStatus('error', 'Для этого инструмента нужны только изображения (JPG, PNG, WebP)');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация изображений в PDF...' });
    try {
      const pdfBlob = await convertImagesToPDF(imageFiles);
      const url = URL.createObjectURL(pdfBlob);
      const resultName = imageFiles.length > 1
        ? `converted-${imageFiles.length}-images.pdf`
        : fileName.replace(/\.[^/.]+$/, ".pdf");
      replaceConversionResults([{ blob: pdfBlob, url, name: resultName }]);
      showStatus('success', `Конвертация завершена!`, 10000);
    } catch (error) {
      showStatus('error', 'Ошибка при конвертации изображений: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageFormatConvert = async () => {
    if (imageFiles.length === 0) {
      showStatus("error", "Пожалуйста, выберите изображения для конвертации");
      return;
    }
    if (!hasOnlyImages) {
      showStatus("error", "Для этого инструмента нужны только изображения (JPG, PNG, WebP)");
      return;
    }
    if (!convertFormat) {
      showStatus("error", "Выберите формат вывода");
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Конвертация изображений..." });
    try {
      const results = await convertImagesBetweenFormats(imageFiles, convertFormat);
      if (results.length === 0) {
        showStatus("error", "Не удалось конвертировать выбранные файлы");
        return;
      }
      replaceConversionResults(
        results.map((item) => ({
          blob: item.blob,
          url: URL.createObjectURL(item.blob),
          name: item.name,
        }))
      );
      showStatus("success", `Готово: обработано ${results.length} изображений`, 6000);
    } catch (error) {
      showStatus("error", "Ошибка при конвертации изображений: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedPdfFile) {
      showStatus('error', 'Пожалуйста, выберите PDF файл для конвертации');
      return;
    }
    if (!convertFormat) {
      showStatus('error', 'Пожалуйста, выберите формат для конвертации');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация...' });
    try {
      const images = await convertPDFToImages(selectedPdfFile, convertFormat);
      const results = images.map((blob, index) => ({
        blob,
        url: URL.createObjectURL(blob),
        name: `page-${index + 1}.${convertFormat.toLowerCase()}`
      }));
      replaceConversionResults(results);
      showStatus('success', `Конвертация завершена! ${images.length} страниц(а) обработано`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при конвертации файла: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!selectedPdfFile) {
      showStatus('error', 'Пожалуйста, выберите PDF файл для сжатия');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Сжатие файла...' });
    clearCompressResult();
    try {
      const compressedFile = await compressPDF(selectedPdfFile, compressionLevel);
      const url = URL.createObjectURL(compressedFile);
      const originalSize = selectedPdfFile.size;
      const compressedSize = compressedFile.size;
      replaceCompressResult({ blob: compressedFile, url, originalSize, compressedSize });
      showStatus('success', `Сжатие завершено!`, 10000);
    } catch (error) {
      showStatus('error', 'Ошибка при сжатии файла: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!files || files.length < 2) {
      showStatus('error', 'Выберите минимум 2 PDF файла для объединения');
      return;
    }
    const pdfFiles = Array.from(files).filter((f) => f.type === 'application/pdf');
    if (pdfFiles.length < 2) {
      showStatus('error', 'Для объединения нужны минимум 2 PDF файла');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Объединение PDF...' });
    try {
      const mergedBlob = await mergePDFs(pdfFiles);
      const url = URL.createObjectURL(mergedBlob);
      setConversionResults([{ blob: mergedBlob, url, name: `merged-${pdfFiles.length}-files.pdf` }]);
      showStatus('success', `Объединено ${pdfFiles.length} PDF файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при объединении: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplit = async () => {
    if (!selectedPdfFile) {
      showStatus('error', 'Выберите PDF файл для разделения');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Разделение PDF...' });
    try {
      let pdfBlobs: Blob[];
      if (splitMode === 'all') {
        pdfBlobs = await splitPDFIntoPages(selectedPdfFile);
      } else {
        const parts = parsePageSelection(splitRange, pdfPageCount || undefined);
        if (parts.length === 0) {
          showStatus('error', 'Укажите номера страниц (например: 1,3,5 или 1-5)');
          setIsLoading(false);
          return;
        }
        pdfBlobs = await splitPDF(selectedPdfFile, parts);
      }
      const results = pdfBlobs.map((blob, i) => ({
        blob,
        url: URL.createObjectURL(blob),
        name: `page-${i + 1}.pdf`,
      }));
      replaceConversionResults(results);
      showStatus('success', `Разделено на ${pdfBlobs.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при разделении: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToWord = async () => {
    if (!selectedPdfFile) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация в Word...' });
    try {
      const blob = await convertPDFToWord(selectedPdfFile);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.docx') }]);
      showStatus('success', 'Конвертация в Word завершена', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToExcel = async () => {
    if (!selectedPdfFile) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация в Excel...' });
    try {
      const blob = await convertPDFToExcel(selectedPdfFile);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.xlsx') }]);
      showStatus('success', 'Конвертация в Excel завершена', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfToZip = async () => {
    if (!selectedPdfFile) {
      showStatus("error", "Выберите PDF файл");
      return;
    }
    const format = convertFormat || "PNG";
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Создание архива..." });
    try {
      const images = await convertPDFToImages(selectedPdfFile, format);
      const items = images.map((blob, i) => ({
        blob,
        name: `page-${i + 1}.${format.toLowerCase()}`,
      }));
      const zipBlob = await createZipFromImages(items);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.pdf$/i, "")}-pages.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus("success", `Архив со ${images.length} страниц(ой) скачан`, 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractText = async () => {
    if (!selectedPdfFile) {
      showStatus("error", "Выберите PDF файл");
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Извлечение текста..." });
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
    if (!selectedPdfFile) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    if (!signatureBlob) {
      showStatus('error', 'Нарисуйте подпись в поле ниже');
      return;
    }
    let pageNumbers: number[] | undefined;
    if (signaturePagesMode === "select" && signaturePagesRange.trim()) {
      pageNumbers = parsePageSelection(signaturePagesRange, pdfPageCount || undefined);
      if (pageNumbers.length === 0) {
        showStatus('error', 'Укажите номера страниц (например: 1, 3, 5 или 1-5)');
        return;
      }
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Добавление подписи...' });
    try {
      const blob = await addSignature(selectedPdfFile, signatureBlob, {
        position: signaturePosition,
        customPosition: signaturePdfPosition ?? undefined,
        pageNumbers,
      });
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: `signed-${fileName}` }]);
      showStatus(
        'success',
        pageNumbers && pageNumbers.length > 0
          ? `Подпись добавлена на ${pageNumbers.length} стр.`
          : 'Подпись добавлена на все страницы',
        5000
      );
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
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

  const handleEdit = async () => {
    if (!selectedPdfFile) {
      showStatus("error", "Пожалуйста, выберите PDF файл для редактирования");
      return;
    }
    if (!hasPageRotations && !hasWatermark && !hasGlobalRotate) {
      showStatus("error", "Поверните страницы в превью и/или выберите водяной знак или поворот всех");
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Редактирование файла..." });
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
      showStatus("success", `Редактирование ${fileName} завершено!`, 5000);
    } catch (error) {
      showStatus("error", "Ошибка при редактировании файла: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizePages = async () => {
    if (!selectedPdfFile) {
      showStatus("error", "Выберите PDF файл");
      return;
    }
    const activePages = organizerPages.filter((p) => !p.deleted);
    if (activePages.length === 0) {
      showStatus("error", "После удаления не осталось страниц для сохранения");
      return;
    }
    const operations: OrganizePDFPageOperation[] = activePages.map((page) =>
      page.kind === "blank"
        ? { kind: "blank", width: page.width, height: page.height }
        : { kind: "source", sourceIndex: page.sourceIndex ?? 0, rotation: page.rotation, cropPercent: page.cropPercent }
    );
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Организация страниц..." });
    try {
      const blob = await organizePDFPages(selectedPdfFile, operations);
      const url = URL.createObjectURL(blob);
      replaceConversionResults([{ blob, url, name: `organized-${fileName}` }]);
      showStatus("success", `Готово: ${activePages.length} стр. в новом порядке`, 6000);
    } catch (error) {
      showStatus("error", "Ошибка при организации страниц: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEditTool = (tool: string) => {
    if (editTools.includes(tool)) {
      setEditTools(editTools.filter(t => t !== tool));
    } else {
      setEditTools([...editTools, tool]);
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

  const deleteCompressResult = () => {
    clearCompressResult();
  };

  const downloadAllAsZip = async () => {
    if (conversionResults.length === 0) return;
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Создание архива...' });
    try {
      const zipBlob = await createZipFromImages(conversionResults);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace('.pdf', '')}-images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('success', `Архив с ${conversionResults.length} изображением(ями) скачан!`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при создании архива: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!standalone && <Header />}
      <main className="flex-1">
        {!standalone && (
        <>
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--surface)] via-transparent to-transparent" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-[var(--accent)] opacity-5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-[var(--accent-light)] opacity-5 rounded-full blur-3xl" />
          
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)] mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              Все файлы обрабатываются локально
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--foreground)] tracking-tight leading-tight animate-fade-in-up">
              Инструменты для{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] bg-clip-text text-transparent">
                PDF
              </span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
              Конвертируйте, объединяйте и редактируйте PDF прямо в браузере. 
              <span className="text-[var(--foreground)] font-medium"> Бесплатно</span> и без регистрации.
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up">
              <a href="#tools" className="btn btn-primary btn-lg">
                Начать работу
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[var(--success)]" />
                </div>
                <span>Безопасно</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <span>Быстро</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <span>Работает офлайн</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ad Banner - Top */}
        <section className="pb-8 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <AdPlaceholder size="leaderboard" />
          </div>
        </section>

        {/* Category Filter */}
        <section id="tools" className="px-4 sm:px-6 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                Выберите инструмент
              </h2>
              <p className="mt-2 text-[var(--muted)]">
                {TOOLS.length} инструментов для работы с PDF
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {TOOL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`btn btn-sm ${
                    categoryFilter === cat.id
                      ? "btn-primary"
                      : "btn-secondary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            {/* Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool, index) => {
                const title = tool.title.split(" — ")[0];
                return (
                  <Link
                    key={tool.id}
                    href={`/${tool.path}`}
                    className="tool-card group block"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="icon-box icon-box-accent w-12 h-12 flex-shrink-0">
                        <img
                          src={`/icons/${tool.id}.svg`}
                          alt=""
                          className="w-6 h-6 object-contain"
                          width={24}
                          height={24}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{title}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                          {tool.shortDescription}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[var(--accent)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ad Banner - Middle */}
        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <AdPlaceholder size="banner" />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24 px-4 sm:px-6 bg-[var(--surface)]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                Почему PDF Lite
              </h2>
              <p className="mt-2 text-[var(--muted)]">
                Всё, что нужно для работы с PDF
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  icon: Shield, 
                  title: "Локальная обработка", 
                  desc: "Файлы обрабатываются в вашем браузере и никогда не загружаются на сервер. Полная конфиденциальность.",
                  color: "var(--success)"
                },
                { 
                  icon: Zap, 
                  title: "Бесплатно навсегда", 
                  desc: "Все инструменты доступны без ограничений, подписок и скрытых платежей.",
                  color: "var(--accent)"
                },
                { 
                  icon: Globe, 
                  title: "Работает везде", 
                  desc: "Не нужно ничего устанавливать. Работает в любом современном браузере, даже офлайн.",
                  color: "var(--muted)"
                },
              ].map((item) => (
                <div key={item.title} className="feature-card text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--background)] shadow-sm mb-4">
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-semibold text-lg text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "13+", label: "Инструментов" },
                { value: "100%", label: "Бесплатно" },
                { value: "0", label: "Загрузок на сервер" },
                { value: "∞", label: "Файлов в день" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-bold text-[var(--foreground)]">{stat.value}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* How it works */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                Как это работает
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Выберите инструмент", desc: "Найдите нужный инструмент в списке выше" },
                { step: "2", title: "Загрузите файл", desc: "Перетащите файл или выберите с устройства" },
                { step: "3", title: "Скачайте результат", desc: "Получите обработанный файл за секунды" },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[var(--border)] to-transparent -translate-x-1/2" />
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)]">{item.title}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        </>
        )}

        {/* Tool Workspace - Standalone Mode */}
        {standalone && (
        <section className="py-8 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {activeToolMeta && (
              <div className="mb-6">
                <h2 className="text-xl font-medium text-[var(--foreground)]">
                  {activeToolMeta.title.split(" — ")[0]}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activeToolMeta.shortDescription}
                </p>
              </div>
            )}

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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <div className="card p-4">
                    <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Подпись</h4>
                    <SignaturePad
                      onSignatureChange={(blob) => { setSignatureBlob(blob); if (!blob) setSignaturePdfPosition(null); }}
                      width={560}
                      height={240}
                      strokeColor={signatureColor}
                    />
                  </div>
                  {file && file.type.startsWith("application/pdf") && signatureBlob && (
                    <div className="card p-4">
                      <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Предпросмотр</h4>
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

              {/* Settings Panel */}
              <div className="space-y-4">
                {/* PDF to Image */}
                {activeTab === "pdfToImage" && (
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
                )}

                {/* Image Converter */}
                {activeTab === "imageConverter" && (
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
                )}

                {/* PDF to ZIP */}
                {activeTab === "pdfToZip" && (
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
                )}

                {/* Compress */}
                {activeTab === "compress" && (
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
                )}

                {/* Split */}
                {activeTab === "split" && (
                  <div className="space-y-3">
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

                {/* Signature Settings */}
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
                      <label className="text-sm text-[var(--muted)] mb-2 block">Цвет</label>
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

                {/* Edit Settings */}
                {activeTab === "edit" && (
                  <div className="space-y-4">
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

                {/* Action Buttons */}
                <div className="pt-4">
                  {activeTab === "pdfToImage" && (
                    <button onClick={handleConvert} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Обработка..." : `Конвертировать в ${convertFormat || "формат"}`}
                    </button>
                  )}
                  {activeTab === "imageToPdf" && (
                    <button onClick={handleImageConvert} disabled={isLoading || !hasOnlyImages} className="btn btn-primary w-full">
                      {isLoading ? "Конвертация..." : "Создать PDF"}
                    </button>
                  )}
                  {activeTab === "imageConverter" && (
                    <button onClick={handleImageFormatConvert} disabled={isLoading || !hasOnlyImages} className="btn btn-primary w-full">
                      {isLoading ? "Конвертация..." : `Конвертировать в ${convertFormat || "формат"}`}
                    </button>
                  )}
                  {activeTab === "pdfToWord" && (
                    <button onClick={handlePDFToWord} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Конвертация..." : "Сохранить как Word"}
                    </button>
                  )}
                  {activeTab === "pdfToExcel" && (
                    <button onClick={handlePDFToExcel} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Конвертация..." : "Сохранить как Excel"}
                    </button>
                  )}
                  {activeTab === "pdfToZip" && (
                    <button onClick={handlePdfToZip} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Создание архива..." : "Скачать как ZIP"}
                    </button>
                  )}
                  {activeTab === "extractText" && (
                    <button onClick={handleExtractText} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Извлечение..." : "Извлечь текст"}
                    </button>
                  )}
                  {activeTab === "merge" && (
                    <button onClick={handleMerge} disabled={isLoading || !hasAtLeastTwoPdfFiles} className="btn btn-primary w-full">
                      {isLoading ? "Объединение..." : "Объединить PDF"}
                    </button>
                  )}
                  {activeTab === "split" && (
                    <button onClick={handleSplit} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Разделение..." : "Разделить PDF"}
                    </button>
                  )}
                  {activeTab === "compress" && (
                    <button onClick={handleCompress} disabled={isLoading || !selectedPdfFile} className="btn btn-primary w-full">
                      {isLoading ? "Сжатие..." : "Сжать PDF"}
                    </button>
                  )}
                  {activeTab === "signature" && (
                    <button onClick={handleAddSignature} disabled={isLoading || !selectedPdfFile || !signatureBlob} className="btn btn-primary w-full">
                      {isLoading ? "Добавление..." : "Добавить подпись"}
                    </button>
                  )}
                  {activeTab === "edit" && (
                    <button onClick={handleEdit} disabled={isLoading || (!hasPageRotations && !hasWatermark && !hasGlobalRotate)} className="btn btn-primary w-full">
                      {isLoading ? "Редактирование..." : "Применить изменения"}
                    </button>
                  )}
                  {activeTab === "organizePages" && (
                    <button onClick={handleOrganizePages} disabled={isLoading || !selectedPdfFile || !hasOrganizeChanges} className="btn btn-primary w-full">
                      {isLoading ? "Сохранение..." : "Применить изменения"}
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
                    <button onClick={downloadAllAsZip} disabled={isLoading} className="btn btn-sm btn-secondary">
                      <Download className="w-4 h-4" />
                      Скачать все (ZIP)
                    </button>
                  </div>
                  <div className="space-y-2">
                    {conversionResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--background)] rounded flex items-center justify-center text-xs font-medium text-[var(--muted)]">
                            {result.name.split('.').pop()?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-[var(--foreground)]">{result.name}</p>
                            <p className="text-xs text-[var(--muted)]">{(result.blob.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
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
                    <h3 className="font-medium text-[var(--foreground)]">Извлечённый текст</h3>
                    <button
                      onClick={() => {
                        const full = extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n");
                        void navigator.clipboard.writeText(full);
                        showStatus("success", "Текст скопирован", 3000);
                      }}
                      className="btn btn-sm btn-secondary"
                    >
                      Копировать
                    </button>
                  </div>
                  <textarea
                    readOnly
                    className="w-full h-48 p-3 text-sm font-mono bg-[var(--surface)] rounded-lg resize-none"
                    value={extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n")}
                  />
                </div>
              )}

              {/* Compress Result */}
              {compressResult && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[var(--foreground)]">Результат сжатия</h3>
                    <div className="flex gap-2">
                      <button onClick={downloadCompressedFile} className="btn btn-sm btn-primary">
                        <Download className="w-4 h-4" />
                        Скачать
                      </button>
                      <button onClick={deleteCompressResult} className="btn btn-icon-sm btn-ghost">
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

            {/* Ad - Sidebar position on tool page */}
            <div className="mt-8">
              <AdPlaceholder size="rectangle" className="mx-auto" />
            </div>
          </div>
        </section>
        )}
      </main>
      {!standalone && <Footer />}
    </div>
  );
}

export default function PDFTools() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <span className="text-[var(--muted)]">Загрузка...</span>
        </main>
        <Footer />
      </div>
    }>
      <PDFToolsContent />
    </Suspense>
  );
}
