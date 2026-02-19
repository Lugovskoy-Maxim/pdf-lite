"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { compressPDF, convertPDFToImages, addWatermark, mergePDFs, splitPDF, splitPDFIntoPages, rotatePDF, rotatePDFPages, convertImagesToPDF, createZipFromImages, convertPDFToWord, convertPDFToExcel, addSignature, getPDFPageCount, extractTextFromPDF, type SignaturePosition } from "./utils/pdfUtils";
import { Upload, X, Download, Trash2, FileText, Shield, Zap, Image, RotateCw, CheckCircle2, XCircle, Shrink, ChevronRight } from 'lucide-react';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SignaturePad, SIGNATURE_COLORS } from "../components/SignaturePad";
import { SignaturePreview } from "../components/SignaturePreview";
import { PDFEditPreview } from "../components/PDFEditPreview";
import { TOOLS, TOOL_CATEGORIES, getToolById } from "./tools-config";

const TAB_IDS = ["pdfToImage", "imageToPdf", "pdfToWord", "pdfToExcel", "merge", "split", "signature", "edit", "compress", "pdfToZip", "extractText"] as const;

const IMAGE_FORMAT_OPTIONS = [
  { value: "JPG", title: "JPG", hint: "Меньше размер", icon: "/icons/format-jpg.svg" },
  { value: "PNG", title: "PNG", hint: "Без потерь", icon: "/icons/format-png.svg" },
  { value: "WebP", title: "WebP", hint: "Современный", icon: "/icons/format-webp.svg" },
] as const;

const TOOL_BUTTON_LABELS: Record<string, string> = {
  pdfToImage: "PDF в картинки",
  imageToPdf: "Картинки в PDF",
  pdfToWord: "PDF в Word",
  pdfToExcel: "PDF в Excel",
  merge: "Объединить",
  split: "Разделить",
  signature: "Подпись",
  edit: "Редактировать",
  compress: "Сжать",
  pdfToZip: "PDF в ZIP",
  extractText: "Извлечь текст",
};

const ICON_BADGE_STYLES: Record<string, string> = {
  pdfToImage: "bg-sky-100 dark:bg-sky-900/40",
  imageToPdf: "bg-rose-100 dark:bg-rose-900/40",
  pdfToWord: "bg-blue-100 dark:bg-blue-900/40",
  pdfToExcel: "bg-emerald-100 dark:bg-emerald-900/40",
  merge: "bg-orange-100 dark:bg-orange-900/40",
  split: "bg-violet-100 dark:bg-violet-900/40",
  signature: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
  edit: "bg-cyan-100 dark:bg-cyan-900/40",
  compress: "bg-lime-100 dark:bg-lime-900/40",
  pdfToZip: "bg-amber-100 dark:bg-amber-900/40",
  extractText: "bg-teal-100 dark:bg-teal-900/40",
};

function getIconBadgeStyle(toolId: string) {
  return ICON_BADGE_STYLES[toolId] ?? "bg-amber-100 dark:bg-amber-900/40";
}

function getToolButtonLabel(toolId: string, fallbackTitle: string) {
  return TOOL_BUTTON_LABELS[toolId] ?? fallbackTitle;
}

function PDFToolsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolFromUrl = useMemo(() => searchParams.get("tool"), [searchParams]);
  const standalone = searchParams.get("standalone") === "1";
  const initialTabFromUrl = useMemo(() => {
    if (toolFromUrl && TAB_IDS.includes(toolFromUrl as (typeof TAB_IDS)[number])) return toolFromUrl;
    return null;
  }, [toolFromUrl]);

  const [activeTab, setActiveTab] = useState<string>(initialTabFromUrl ?? "pdfToImage");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Редирект ?tool=xxx на отдельную страницу инструмента (только когда не standalone и не в iframe)
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setFileName(selectedFiles[0].name);
      const f = selectedFiles[0];
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
      setFiles(droppedFiles);
      setFileName(droppedFiles[0].name);
      const f = droppedFiles[0];
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
    setConversionResults([]);
    setCompressResult(null);
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
    if (!files || files.length === 0) {
      showStatus('error', 'Пожалуйста, выберите изображения для конвертации');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация изображений в PDF...' });
    
    try {
      const pdfBlob = await convertImagesToPDF(Array.from(files));
      
      // Создание ссылки для скачивания и сохранение результата в состоянии
      const url = URL.createObjectURL(pdfBlob);
      const resultName = files.length > 1
        ? `converted-${files.length}-images.pdf`
        : fileName.replace(/\.[^/.]+$/, ".pdf");
      
      // Сохраняем результат в состоянии conversionResults для отображения
      setConversionResults([{
        blob: pdfBlob,
        url,
        name: resultName
      }]);
      
      showStatus('success', `Конвертация завершена!`, 10000);
    } catch (error) {
      showStatus('error', 'Ошибка при конвертации изображений: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!file) {
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
      const images = await convertPDFToImages(file, convertFormat);
      
      // Сохраняем результаты конвертации в состоянии
      const results = images.map((blob, index) => ({
        blob,
        url: URL.createObjectURL(blob),
        name: `page-${index + 1}.${convertFormat.toLowerCase()}`
      }));
      
      setConversionResults(results);
      showStatus('success', `Конвертация завершена! ${images.length} страниц(а) обработано`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при конвертации файла: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!file) {
      showStatus('error', 'Пожалуйста, выберите PDF файл для сжатия');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Сжатие файла...' });
    setCompressResult(null);
    
    try {
      const compressedFile = await compressPDF(file, compressionLevel);
      
      // Сохраняем результат для отображения
      const url = URL.createObjectURL(compressedFile);
      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      
      setCompressResult({
        blob: compressedFile,
        url,
        originalSize,
        compressedSize,
      });
      
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
    if (!file || !file.type.startsWith('application/pdf')) {
      showStatus('error', 'Выберите PDF файл для разделения');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Разделение PDF...' });
    try {
      let pdfBlobs: Blob[];
      if (splitMode === 'all') {
        pdfBlobs = await splitPDFIntoPages(file);
      } else {
        const parts = splitRange.split(/[,\s]+/).flatMap((p) => {
          if (p.includes('-')) {
            const [a, b] = p.split('-').map(Number);
            return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
          }
          return [parseInt(p, 10)];
        }).filter((n) => !isNaN(n) && n > 0);
        if (parts.length === 0) {
          showStatus('error', 'Укажите номера страниц (например: 1,3,5 или 1-5)');
          setIsLoading(false);
          return;
        }
        pdfBlobs = await splitPDF(file, [...new Set(parts)].sort((a, b) => a - b));
      }
      const results = pdfBlobs.map((blob, i) => ({
        blob,
        url: URL.createObjectURL(blob),
        name: `page-${i + 1}.pdf`,
      }));
      setConversionResults(results);
      showStatus('success', `Разделено на ${pdfBlobs.length} файлов`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при разделении: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToWord = async () => {
    if (!file || !file.type.startsWith('application/pdf')) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация в Word...' });
    try {
      const blob = await convertPDFToWord(file);
      const url = URL.createObjectURL(blob);
      setConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.docx') }]);
      showStatus('success', 'Конвертация в Word завершена', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFToExcel = async () => {
    if (!file || !file.type.startsWith('application/pdf')) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Конвертация в Excel...' });
    try {
      const blob = await convertPDFToExcel(file);
      const url = URL.createObjectURL(blob);
      setConversionResults([{ blob, url, name: fileName.replace(/\.pdf$/i, '.xlsx') }]);
      showStatus('success', 'Конвертация в Excel завершена', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfToZip = async () => {
    if (!file || !file.type.startsWith("application/pdf")) {
      showStatus("error", "Выберите PDF файл");
      return;
    }
    const format = convertFormat || "PNG";
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Создание архива..." });
    try {
      const images = await convertPDFToImages(file, format);
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
    if (!file || !file.type.startsWith("application/pdf")) {
      showStatus("error", "Выберите PDF файл");
      return;
    }
    setIsLoading(true);
    setStatusMessage({ type: "success", text: "Извлечение текста..." });
    try {
      const pages = await extractTextFromPDF(file);
      setExtractedText(pages);
      showStatus("success", "Текст извлечён", 5000);
    } catch (error) {
      showStatus("error", "Ошибка: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSignature = async () => {
    if (!file || !file.type.startsWith('application/pdf')) {
      showStatus('error', 'Выберите PDF файл');
      return;
    }
    if (!signatureBlob) {
      showStatus('error', 'Нарисуйте подпись в поле ниже');
      return;
    }
    let pageNumbers: number[] | undefined;
    if (signaturePagesMode === "select" && signaturePagesRange.trim()) {
      const parts = signaturePagesRange.split(/[,\s]+/).flatMap((p) => {
        if (p.includes("-")) {
          const [a, b] = p.split("-").map(Number);
          const start = Math.min(a || 1, b || 1);
          const end = Math.max(a || 1, b || 1);
          return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        return [parseInt(p, 10)];
      }).filter((n) => !isNaN(n) && n > 0);
      pageNumbers = [...new Set(parts)].sort((a, b) => a - b);
      if (pageNumbers.length === 0) {
        showStatus('error', 'Укажите номера страниц (например: 1, 3, 5 или 1-5)');
        return;
      }
    }
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Добавление подписи...' });
    try {
      const blob = await addSignature(file, signatureBlob, {
        position: signaturePosition,
        customPosition: signaturePdfPosition ?? undefined,
        pageNumbers,
      });
      const url = URL.createObjectURL(blob);
      setConversionResults([{ blob, url, name: `signed-${fileName}` }]);
      showStatus('success', 'Подпись добавлена на все страницы', 5000);
    } catch (error) {
      showStatus('error', 'Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPageRotations = editPageRotations.some((r) => r !== 0);
  const hasWatermark = editTools.includes("Водяной знак");
  const hasGlobalRotate = editTools.includes("Повернуть");

  const handleEdit = async () => {
    if (!file || !file.type.startsWith("application/pdf")) {
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
      let resultFile: Blob = file;
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
      setConversionResults([{ blob: resultFile, url, name: resultName }]);
      showStatus("success", `Редактирование ${fileName} завершено!`, 5000);
    } catch (error) {
      showStatus("error", "Ошибка при редактировании файла: " + (error as Error).message);
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
    if (compressResult) {
      URL.revokeObjectURL(compressResult.url);
      setCompressResult(null);
    }
  };

  const downloadAllAsZip = async () => {
    if (conversionResults.length === 0) return;
    
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Создание архива...' });
    
    try {
      const zipBlob = await createZipFromImages(conversionResults);
      
      // Скачивание архива
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
        <section className="relative py-14 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/70 dark:from-amber-950/25 via-transparent to-transparent" aria-hidden />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 dark:text-white tracking-tight leading-tight text-balance">
              Онлайн-инструменты для PDF
            </h1>
            <p className="mt-5 text-base md:text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed text-balance">
              Объединяйте, сжимайте, конвертируйте и редактируйте PDF без установки. Всё в браузере и бесплатно.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-sm font-medium border border-stone-200 dark:border-stone-700 shadow-sm">
                <Shield className="h-4 w-4 text-emerald-500" />
                Файлы не покидают браузер
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-900 text-sm font-medium shadow-sm">
                <Zap className="h-4 w-4" />
                Бесплатно
              </span>
            </div>
          </div>
        </section>

        {/* Категории и сетка инструментов */}
        <section id="tools" className="py-4 px-4 sm:px-6 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {TOOL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 ${
                    categoryFilter === cat.id
                      ? "bg-amber-500 text-stone-900 shadow-md shadow-amber-500/25"
                      : "bg-white dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTools.map((tool) => {
                const title = tool.title.split(" — ")[0];
                return (
                  <Link
                    key={tool.id}
                    href={`/${tool.path}`}
                    className="group relative text-left p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 block focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 focus:border-transparent"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden ring-1 ring-inset ring-white/70 dark:ring-stone-700 ${getIconBadgeStyle(tool.id)}`}
                    >
                      <img
                        src={`/icons/${tool.id}.svg`}
                        alt=""
                        className="w-8 h-8 object-contain"
                        width={56}
                        height={56}
                      />
                    </div>
                    <h3 className="font-semibold text-stone-900 dark:text-white text-lg">{title}</h3>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-snug">
                      {tool.shortDescription}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-amber-600 dark:text-amber-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      Открыть
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
        </>
        )}

        {/* Блок работы с инструментом — только standalone для страницы инструмента */}
        {standalone && (
        <section className="py-8 md:py-12 px-4 sm:px-6 pt-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h2 id="tools-heading" className="text-2xl font-bold text-stone-900 dark:text-white">
                Работа с файлами
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-400">
                Загрузите файл, настройте параметры и получите результат за пару кликов.
              </p>
              {activeToolMeta && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${getIconBadgeStyle(activeToolMeta.id)}`}>
                    <img src={`/icons/${activeToolMeta.id}.svg`} alt="" className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {activeToolMeta.title.split(" — ")[0]}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{activeToolMeta.shortDescription}</p>
                  </div>
                </div>
              )}
            </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg shadow-stone-200/40 dark:shadow-none border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 px-4 sm:px-6 py-4">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">Инструменты</p>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTab(tool.id)}
                  className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 ${
                    activeTab === tool.id
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-stone-900 dark:text-stone-100 shadow-sm"
                      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                  }`}
                >
                  <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${getIconBadgeStyle(tool.id)}`}>
                    <img src={`/icons/${tool.id}.svg`} alt="" className="h-4 w-4 object-contain" />
                  </span>
                  <span>{getToolButtonLabel(tool.id, tool.title.split(" — ")[0])}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Основной контент */}
          <div className="p-6">
            <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {[
                { step: "1", label: "Загрузите файл" },
                { step: "2", label: "Настройте параметры" },
                { step: "3", label: "Скачайте результат" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-stone-900 dark:text-white">
                    {item.step}
                  </span>
                  <span className="font-medium text-stone-700 dark:text-stone-200">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              {/* Область загрузки + подпись (при выборе вкладки Подпись) */}
              <div className="flex-1 flex flex-col gap-4">
              <div
                className={`border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl text-center transition-colors hover:border-amber-400 dark:hover:border-amber-600 ${
                  activeTab === "signature" ? "min-h-[120px] p-6" : "min-h-[200px] p-8"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                />
                <div className="space-y-4">
                  <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                    <Upload className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 dark:text-white">
                      Перетащите сюда или нажмите для выбора
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      {activeTab === "merge"
                        ? "PDF файлы (2 и более)"
                        : activeTab === "imageToPdf"
                        ? "JPG, PNG, WebP"
                        : activeTab === "signature" || activeTab === "pdfToWord" || activeTab === "pdfToExcel" || activeTab === "pdfToZip" || activeTab === "extractText"
                        ? "PDF файл"
                        : "PDF или изображения"}
                    </p>
                  </div>
                  <button
                    onClick={triggerFileInput}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-stone-900 dark:text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Выбрать файлы
                  </button>
                  {fileList.length > 0 && (
                    <div className="mt-4 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                          Загружено файлов: {fileList.length}
                        </span>
                        <button
                          onClick={handleClearFile}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Удалить все"
                        >
                          <X className="h-4 w-4" />
                          Очистить
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1">
                        {fileList.map((f, index) => {
                          const isPdf = f.type.startsWith("application/pdf");
                          const previewUrl = previewUrls[index] ?? null;
                          return (
                            <div
                              key={`${f.name}-${index}`}
                              className="relative group rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="aspect-square flex items-center justify-center bg-stone-100 dark:bg-stone-800 min-h-[80px]">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : isPdf ? (
                                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                                    <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                    <Image className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2 border-t border-stone-100 dark:border-stone-700">
                                <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate" title={f.name}>
                                  {f.name}
                                </p>
                                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                                  {formatFileSize(f.size)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeTab === "edit" && file && file.type.startsWith("application/pdf") && pdfPageCount > 0 && (
                <PDFEditPreview
                  pdfFile={file}
                  pageRotations={editPageRotations}
                  onPageRotationsChange={setEditPageRotations}
                  pageCount={pdfPageCount}
                />
              )}

              {activeTab === "signature" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/50 p-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Область для подписи (прозрачный фон PNG)</h4>
                    <SignaturePad
                      onSignatureChange={(blob) => { setSignatureBlob(blob); if (!blob) setSignaturePdfPosition(null); }}
                      width={560}
                      height={240}
                      strokeColor={signatureColor}
                    />
                  </div>
                  {file && file.type.startsWith("application/pdf") && signatureBlob && (
                    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/50 p-4">
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Предпросмотр — перетащите подпись</h4>
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
              </div>

              {/* Панель настроек */}
              <div className="lg:w-80 flex-shrink-0 space-y-4">
                
                {/* PDF → Изображения */}
                {activeTab === "pdfToImage" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Формат вывода</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {IMAGE_FORMAT_OPTIONS.map((format) => (
                        <button
                          key={format.value}
                          type="button"
                          className={`relative rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            convertFormat === format.value
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                              : "border-stone-200 dark:border-stone-600 bg-white/70 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                          onClick={() => setConvertFormat(format.value)}
                        >
                          {convertFormat === format.value && (
                            <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-amber-600 dark:text-amber-300" />
                          )}
                          <div className="flex items-center gap-2">
                            <img src={format.icon} alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{format.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{format.hint}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleConvert}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf')}
                      className={`w-full mt-4 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('application/pdf')
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading && file?.type.startsWith('application/pdf') ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Обработка...
                        </>
                      ) : (
                        <>Конвертировать в {convertFormat || 'формат'}</>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Картинки → PDF */}
                {activeTab === "imageToPdf" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">Соберёт все изображения в один PDF-документ</p>
                    <button
                      onClick={handleImageConvert}
                      disabled={isLoading || !file || !file.type.startsWith('image/')}
                      className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('image/')
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading && file && file.type.startsWith('image/') ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Конвертация...
                        </>
                      ) : (
                        'Создать PDF'
                      )}
                    </button>
                  </div>
                )}

                {/* PDF в Word */}
                {activeTab === "pdfToWord" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                      Извлечёт текст из PDF и создаст документ Word. Работает с текстовыми PDF (не со сканами).
                    </p>
                    <button
                      onClick={handlePDFToWord}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf')}
                      className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('application/pdf')
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <><span className="animate-spin">⏳</span> Конвертация...</>
                      ) : (
                        'Сохранить как Word (.docx)'
                      )}
                    </button>
                  </div>
                )}

                {/* PDF в Excel */}
                {activeTab === "pdfToExcel" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                      Извлечёт текст и создаст таблицу Excel (каждая страница — отдельный лист).
                    </p>
                    <button
                      onClick={handlePDFToExcel}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf')}
                      className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('application/pdf')
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <><span className="animate-spin">⏳</span> Конвертация...</>
                      ) : (
                        'Сохранить как Excel (.xlsx)'
                      )}
                    </button>
                  </div>
                )}

                {/* PDF в ZIP */}
                {activeTab === "pdfToZip" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Формат изображений в архиве</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {IMAGE_FORMAT_OPTIONS.map((format) => (
                        <button
                          key={format.value}
                          type="button"
                          className={`relative rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            convertFormat === format.value
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                              : "border-stone-200 dark:border-stone-600 bg-white/70 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                          onClick={() => setConvertFormat(format.value)}
                        >
                          {convertFormat === format.value && (
                            <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-amber-600 dark:text-amber-300" />
                          )}
                          <div className="flex items-center gap-2">
                            <img src={format.icon} alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{format.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{format.hint}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handlePdfToZip}
                      disabled={isLoading || !file || !file.type.startsWith("application/pdf")}
                      className={`w-full mt-4 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith("application/pdf")
                          ? "bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white"
                          : "bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed"
                      }`}
                    >
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Создание архива...</>
                      ) : (
                        <>Скачать страницы как ZIP</>
                      )}
                    </button>
                  </div>
                )}

                {/* Извлечь текст */}
                {activeTab === "extractText" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                      Извлечёт текст со всех страниц. Подходит для текстовых PDF (не для сканов).
                    </p>
                    <button
                      onClick={handleExtractText}
                      disabled={isLoading || !file || !file.type.startsWith("application/pdf")}
                      className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith("application/pdf")
                          ? "bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white"
                          : "bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed"
                      }`}
                    >
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Извлечение...</>
                      ) : (
                        "Извлечь текст"
                      )}
                    </button>
                  </div>
                )}

                {/* Подпись */}
                {activeTab === "signature" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white">Страницы для подписи</h4>
                    <div className="space-y-2">
                      {[
                        { mode: "all" as const, label: "Все страницы" },
                        { mode: "select" as const, label: "Выбрать страницы" },
                      ].map((opt) => (
                        <label key={opt.mode} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={signaturePagesMode === opt.mode}
                            onChange={() => setSignaturePagesMode(opt.mode)}
                            className="rounded border-stone-300"
                          />
                          <span className="text-sm text-stone-700 dark:text-stone-300">{opt.label}</span>
                        </label>
                      ))}
                      {signaturePagesMode === "select" && (
                        <input
                          type="text"
                          value={signaturePagesRange}
                          onChange={(e) => setSignaturePagesRange(e.target.value)}
                          placeholder="1, 3, 5 или 1-5"
                          className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800"
                        />
                      )}
                      {pdfPageCount > 0 && (
                        <p className="text-xs text-stone-500">Всего страниц: {pdfPageCount}</p>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white pt-2">Позиция по умолчанию</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "bottom-right" as const, label: "Справа внизу" },
                        { id: "bottom-left" as const, label: "Слева внизу" },
                        { id: "top-right" as const, label: "Справа вверху" },
                        { id: "top-left" as const, label: "Слева вверху" },
                        { id: "center" as const, label: "По центру" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setSignaturePosition(pos.id)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                            signaturePosition === pos.id
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                              : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white pt-2">Цвет подписи</h4>
                    <div className="flex flex-wrap gap-2">
                      {SIGNATURE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setSignatureColor(c.value)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            signatureColor === c.value
                              ? "border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800"
                              : "border-stone-200 dark:border-stone-600 hover:border-stone-400"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleAddSignature}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf') || !signatureBlob}
                      className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('application/pdf') && signatureBlob
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <><span className="animate-spin">⏳</span> Добавление подписи...</>
                      ) : (
                        'Добавить подпись в PDF'
                      )}
                    </button>
                  </div>
                )}

                {/* Сжатие */}
                {activeTab === "compress" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Уровень сжатия</h4>
                    <div className="flex gap-2">
                      {[
                        { level: "low", name: "Низкое", size: "~80%" },
                        { level: "medium", name: "Среднее", size: "~60%" },
                        { level: "high", name: "Высокое", size: "~40%" },
                      ].map((compression) => (
                        <button
                          key={compression.level}
                          onClick={() => setCompressionLevel(compression.level)}
                          className={`flex-1 flex flex-col items-center p-2.5 rounded-lg border text-center transition-colors ${
                            compressionLevel === compression.level
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                              : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          <span className="text-xs font-medium text-stone-900 dark:text-white block">{compression.name}</span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400">{compression.size}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCompress}
                      disabled={isLoading}
                      className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-stone-900 dark:text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Сжатие...
                        </>
                      ) : (
                        'Сжать PDF'
                      )}
                    </button>
                  </div>
                )}
                
                {/* Объединить */}
                {activeTab === "merge" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                      Объединит выбранные PDF в один документ (порядок — по списку файлов)
                    </p>
                    <button
                      onClick={handleMerge}
                      disabled={isLoading || !files || Array.from(files).filter((f) => f.type === 'application/pdf').length < 2}
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-stone-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Объединение...
                        </>
                      ) : (
                        'Объединить PDF'
                      )}
                    </button>
                  </div>
                )}

                {/* Разделить */}
                {activeTab === "split" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white">Способ разделения</h4>
                    <div className="flex gap-2">
                      {[
                        { mode: "all" as const, name: "По страницам" },
                        { mode: "range" as const, name: "Диапазон" },
                      ].map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setSplitMode(opt.mode)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                            splitMode === opt.mode
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                              : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                    {splitMode === "range" && (
                      <div>
                        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                          Номера страниц
                        </label>
                        <input
                          type="text"
                          value={splitRange}
                          onChange={(e) => setSplitRange(e.target.value)}
                          placeholder="1, 3, 5 или 1-5"
                          className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    <button
                      onClick={handleSplit}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf')}
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-stone-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Разделение...
                        </>
                      ) : (
                        'Разделить PDF'
                      )}
                    </button>
                  </div>
                )}

                {/* Редактировать */}
                {activeTab === "edit" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white">Действия</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      В превью слева поворачивайте страницы по одной. Здесь — поворот всех или водяной знак.
                    </p>
                    <div className="flex gap-2">
                      {[
                        { tool: "Повернуть", icon: RotateCw },
                        { tool: "Водяной знак", icon: FileText },
                      ].map(({ tool, icon: Icon }) => (
                        <button
                          key={tool}
                          onClick={() => toggleEditTool(tool)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                            editTools.includes(tool)
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                              : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tool}
                        </button>
                      ))}
                    </div>
                    
                    {editTools.includes("Повернуть") && (
                      <div>
                        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">Угол поворота</label>
                        <div className="grid grid-cols-3 gap-2">
                          {([90, 180, 270] as const).map((angle) => (
                            <button
                              key={angle}
                              type="button"
                              onClick={() => setRotateAngle(angle)}
                              className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                                rotateAngle === angle
                                  ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                  : "border-stone-200 dark:border-stone-600 bg-white/70 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                                <RotateCw className="h-3.5 w-3.5" />
                                {angle}°
                              </div>
                              <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                                {angle === 90 ? "вправо" : angle === 180 ? "перевернуть" : "влево"}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {editTools.includes("Водяной знак") && (
                      <div>
                        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Текст</label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={handleEdit}
                      disabled={isLoading || (!hasPageRotations && !hasWatermark && !hasGlobalRotate)}
                      className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 disabled:opacity-60 text-stone-900 dark:text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Редактирование...
                        </>
                      ) : (
                        "Редактировать PDF"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Сообщение о статусе */}
            {statusMessage && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                <span className="font-medium">{statusMessage.text}</span>
              </div>
            )}

            {/* Результаты конвертации */}
            {conversionResults.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Результаты конвертации
                  </h3>
                  <button
                    onClick={downloadAllAsZip}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-stone-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Скачать все (ZIP)
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conversionResults.map((result, index) => (
                    <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {result.name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {result.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {(result.blob.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadResult(result.url, result.name)}
                          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteResult(result.url, index)}
                          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Извлечённый текст */}
            {extractedText && extractedText.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Извлечённый текст
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const full = extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n");
                      void navigator.clipboard.writeText(full);
                      showStatus("success", "Текст скопирован в буфер обмена", 3000);
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Копировать всё
                  </button>
                </div>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <textarea
                    readOnly
                    className="w-full h-64 p-4 text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border-0 resize-none font-mono"
                    value={extractedText.map((p) => `--- Страница ${p.pageNum} ---\n${p.text}`).join("\n\n")}
                  />
                </div>
              </div>
            )}

            {/* Результаты сжатия */}
            {compressResult && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Результат сжатия
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={downloadCompressedFile}
                      className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-stone-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Скачать
                    </button>
                    <button
                      onClick={deleteCompressResult}
                      className="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                      title="Удалить результат"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center mr-3">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        PDF
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {`compressed-${fileName}`}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Исходный размер: {(compressResult.originalSize / 1024).toFixed(2)} KB
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Сжатый размер: {(compressResult.compressedSize / 1024).toFixed(2)} KB
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Экономия: {((1 - compressResult.compressedSize / compressResult.originalSize) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
          </div>
        </section>
        )}

        {/* Features — только на главной */}
        {!standalone && (
        <section id="features" className="py-16 md:py-24 px-4 sm:px-6 bg-stone-50/50 dark:bg-stone-900/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white">
                Быстрый и понятный процесс
              </h2>
              <p className="mt-4 text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
                Без лишних шагов: выберите нужный инструмент, загрузите файл и получите готовый результат.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-7">
                <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-5">
                  Почему это удобно
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Shield,
                      title: "Конфиденциально",
                      desc: "Документы обрабатываются в браузере, без отправки на сервер.",
                    },
                    {
                      icon: Zap,
                      title: "Быстро",
                      desc: "Минимум настроек и понятные действия без лишних экранов.",
                    },
                    {
                      icon: FileText,
                      title: "Все базовые задачи",
                      desc: "Конвертация, сжатие, объединение, подпись и редактирование PDF.",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Предсказуемый результат",
                      desc: "Единый интерфейс и одинаковый сценарий работы для всех инструментов.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 p-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center mb-3">
                        <item.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">{item.title}</p>
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-7">
                <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-5">
                  Как начать
                </h3>
                <ol className="space-y-3">
                  {[
                    "Откройте нужный инструмент из списка выше",
                    "Загрузите файл и при необходимости задайте параметры",
                    "Скачайте обработанный документ",
                  ].map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="inline-flex h-6 w-6 mt-0.5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-stone-900 dark:text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm text-stone-700 dark:text-stone-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </aside>
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
          <span className="text-stone-500">Загрузка...</span>
        </main>
        <Footer />
      </div>
    }>
      <PDFToolsContent />
    </Suspense>
  );
}