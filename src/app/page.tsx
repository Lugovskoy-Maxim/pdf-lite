"use client";

import { useState, useRef } from "react";
import { compressPDF, convertPDFToImages, addWatermark, mergePDFs, splitPDF, splitPDFIntoPages, rotatePDF, convertImagesToPDF, createZipFromImages } from "./utils/pdfUtils";
import { Upload, X, Download, Trash2, FileText, Shield, Zap, Image, Merge, SplitSquareVertical, RotateCw, FileDown, CheckCircle2, XCircle, ImagePlus, Shrink } from 'lucide-react';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function PDFTools() {
  const [activeTab, setActiveTab] = useState("pdfToImage");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [convertFormat, setConvertFormat] = useState("");
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [editTools, setEditTools] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [watermarkText, setWatermarkText] = useState("ВОДЯНОЙ ЗНАК");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [splitRange, setSplitRange] = useState("1");
  const [conversionResults, setConversionResults] = useState<{blob: Blob, url: string, name: string}[]>([]);
  const [compressResult, setCompressResult] = useState<{blob: Blob, url: string, originalSize: number, compressedSize: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setFileName(selectedFiles[0].name);
      setFile(selectedFiles[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setFileName(droppedFiles[0].name);
      setFile(droppedFiles[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClearFile = () => {
    setFile(null);
    setFiles(null);
    setFileName("");
    setConversionResults([]);
    setCompressResult(null);
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

  const handleEdit = async () => {
    if (!file) {
      showStatus('error', 'Пожалуйста, выберите PDF файл для редактирования');
      return;
    }

    if (editTools.length === 0) {
      showStatus('error', 'Пожалуйста, выберите инструменты редактирования');
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Редактирование файла...' });

    try {
      let resultFile: Blob = file;
      let resultName = fileName;

      if (editTools.includes("Водяной знак")) {
        resultFile = await addWatermark(new File([resultFile], resultName), watermarkText);
        resultName = `watermarked-${resultName}`;
      }
      if (editTools.includes("Повернуть")) {
        resultFile = await rotatePDF(new File([resultFile], resultName), rotateAngle);
        resultName = `rotated-${resultName}`;
      }

      const url = URL.createObjectURL(resultFile);
      setConversionResults([{ blob: resultFile, url, name: resultName }]);
      showStatus('success', `Редактирование ${fileName} завершено!`, 5000);
    } catch (error) {
      showStatus('error', 'Ошибка при редактировании файла: ' + (error as Error).message);
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
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 dark:from-amber-950/20 to-transparent" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200/30 dark:bg-amber-800/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-100/40 dark:bg-amber-900/20 rounded-full blur-3xl" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-white tracking-tight">
              Работайте с PDF
              <span className="block text-amber-600 dark:text-amber-400 mt-1">просто и быстро</span>
            </h1>
            <p className="mt-6 text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
              Конвертируйте, объединяйте, разделяйте и сжимайте PDF файлы онлайн. Без регистрации и без загрузки на сервер.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3" id="trust-badges">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium border border-emerald-200 dark:border-emerald-800">
                <Shield className="h-4 w-4" />
                Файлы остаются в браузере
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-sm font-medium border border-amber-200 dark:border-amber-800">
                <Zap className="h-4 w-4" />
                Работает бесплатно
              </div>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="py-8 md:py-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white">
                Выберите инструмент
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-400">
                Загрузите файлы и начните работу
              </p>
            </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-200 dark:border-stone-800 overflow-hidden">
          {/* Панель инструментов — горизонтальные вкладки */}
          <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 px-4 py-3">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">Выберите инструмент</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "pdfToImage" as const, icon: Image, label: "PDF в картинки" },
                { id: "imageToPdf" as const, icon: ImagePlus, label: "Картинки в PDF" },
                { id: "merge" as const, icon: Merge, label: "Объединить" },
                { id: "split" as const, icon: SplitSquareVertical, label: "Разделить" },
                { id: "edit" as const, icon: RotateCw, label: "Редактировать" },
                { id: "compress" as const, icon: Shrink, label: "Сжать" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700"
                  }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Основной контент */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              {/* Область загрузки */}
              <div
                className="flex-1 min-h-[200px] border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-8 text-center transition-colors hover:border-amber-400 dark:hover:border-amber-600"
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
                        : "PDF или изображения"}
                    </p>
                  </div>
                  <button
                    onClick={triggerFileInput}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Выбрать файлы
                  </button>
                  {(fileName || (files && files.length > 0)) && (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {files && files.length > 1 ? (
                          <>Выбрано: <span className="font-medium text-stone-700 dark:text-stone-300">{files.length} файлов</span></>
                        ) : (
                          <>Файл: <span className="font-medium text-stone-700 dark:text-stone-300 truncate max-w-[180px] inline-block align-bottom">{fileName}</span></>
                        )}
                      </p>
                      <button
                        onClick={handleClearFile}
                        className="p-1.5 rounded-md text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        title="Очистить"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Панель настроек */}
              <div className="lg:w-80 flex-shrink-0 space-y-4">
                
                {/* PDF → Изображения */}
                {activeTab === "pdfToImage" && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Формат вывода</h4>
                    <div className="flex gap-2">
                      {["JPG", "PNG"].map((format) => (
                        <button
                          key={format}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                            convertFormat === format
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                              : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                          }`}
                          onClick={() => setConvertFormat(format)}
                        >
                          <span className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-[10px] font-bold">{format[0]}</span>
                          {format}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleConvert}
                      disabled={isLoading || !file || !file.type.startsWith('application/pdf')}
                      className={`w-full mt-4 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                        file && file.type.startsWith('application/pdf')
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
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
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
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
                      className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
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
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
                        <div className="flex gap-2">
                          {([90, 180, 270] as const).map((angle) => (
                            <button
                              key={angle}
                              onClick={() => setRotateAngle(angle)}
                              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                rotateAngle === angle
                                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                                  : "border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
                              }`}
                            >
                              {angle}°
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
                      disabled={isLoading || editTools.length === 0}
                      className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
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
                        'Редактировать PDF'
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
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
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
                      className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
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

        {/* Features */}
        <section id="features" className="py-16 md:py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-stone-900 dark:text-white mb-12">
              Всё необходимое в одном месте
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Image, title: "Конвертация", desc: "PDF ↔ JPG, PNG, WebP" },
                { icon: Merge, title: "Объединение", desc: "Несколько PDF в один" },
                { icon: SplitSquareVertical, title: "Разделение", desc: "Извлечение страниц" },
                { icon: RotateCw, title: "Редактирование", desc: "Поворот, водяной знак" },
                { icon: FileDown, title: "Сжатие", desc: "Уменьшение размера файла" },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-6 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                    <f.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-stone-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

