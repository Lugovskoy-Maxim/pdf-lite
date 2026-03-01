import { PDFDocument, rgb, degrees } from 'pdf-lib';

/** Устанавливает workerSrc для pdfjs-dist в браузере (нужно вызвать до getDocument). Экспорт для компонентов. */
export function setPdfWorkerSrc(pdfjsLib: { GlobalWorkerOptions: { workerSrc?: string } }) {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

// Функция для сжатия PDF
export async function compressPDF(file: File, compressionLevel: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  // Определение настроек сжатия в зависимости от уровня
  const compressionSettings = {
    low: { quality: 0.8, maxWidth: 2400, maxHeight: 2400, useObjectStreams: true },
    medium: { quality: 0.6, maxWidth: 1600, maxHeight: 1600, useObjectStreams: true },
    high: { quality: 0.4, maxWidth: 1200, maxHeight: 1200, useObjectStreams: true },
  };
  
  const settings = compressionSettings[compressionLevel as keyof typeof compressionSettings] || compressionSettings.medium;
  
  // Создание нового PDF с оптимизацией
  const newPdfDoc = await PDFDocument.create();
  
  // Копирование страниц
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const [existingPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
    newPdfDoc.addPage(existingPage);
  }
  
  // Если нужно сжать изображения, используем метод с пересозданием PDF через canvas
  if (compressionLevel !== 'low') {
    return await compressPDFWithImages(file, settings);
  }
  
  // Сохранение с сжатием объектов в потоки
  const compressedPdfBytes = await newPdfDoc.save({
    useObjectStreams: settings.useObjectStreams,
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: true,
  });
  
  return new Blob([new Uint8Array(compressedPdfBytes)], { type: 'application/pdf' });
}

// Вспомогательная функция для сжатия PDF с пересозданием через изображения
async function compressPDFWithImages(file: File, settings: { quality: number; maxWidth: number; maxHeight: number; useObjectStreams: boolean }): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Сжатие изображений доступно только в браузере');
  }
  
  const arrayBuffer = await file.arrayBuffer();
  
  // Динамический импорт pdf.js для избежания проблем SSR
  const pdfjsLib = await import('pdfjs-dist');
  setPdfWorkerSrc(pdfjsLib);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
  
  const newPdfDoc = await PDFDocument.create();
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    
    // Ограничиваем размер если нужно
    let finalWidth = viewport.width;
    let finalHeight = viewport.height;
    
    if (finalWidth > settings.maxWidth || finalHeight > settings.maxHeight) {
      const scale = Math.min(
        settings.maxWidth / finalWidth,
        settings.maxHeight / finalHeight
      );
      finalWidth *= scale;
      finalHeight *= scale;
    }
    
    // Создаем canvas для рендеринга страницы
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      continue;
    }
    
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // Рендерим страницу PDF на canvas
    await page.render({
      canvasContext: ctx,
      viewport: page.getViewport({ scale: finalWidth / viewport.width }),
      canvas: canvas,
    }).promise;
    
    // Конвертируем в JPEG с сжатием
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', settings.quality);
    });
    
    if (blob) {
      const image = await newPdfDoc.embedJpg(await blob.arrayBuffer());
      const page = newPdfDoc.addPage([finalWidth, finalHeight]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: finalWidth,
        height: finalHeight,
      });
    }
  }
  
  const compressedPdfBytes = await newPdfDoc.save({
    useObjectStreams: settings.useObjectStreams,
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: true,
  });
  
  return new Blob([new Uint8Array(compressedPdfBytes)], { type: 'application/pdf' });
}

// Функция для конвертации PDF в изображения с использованием pdf.js
export async function convertPDFToImages(file: File, format: string): Promise<Blob[]> {
  const images: Blob[] = [];
  
  // Проверяем, что мы на клиенте (не на сервере)
  if (typeof window === 'undefined') {
    return images;
  }
  
  try {
    // Динамический импорт pdf.js для избежания проблем SSR
    const pdfjsLib = await import('pdfjs-dist');
    setPdfWorkerSrc(pdfjsLib);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
    
    // Обрабатываем каждую страницу
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 }); // Масштаб 2 для лучшего качества
      
      // Создаем canvas для рендеринга страницы
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        continue;
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Рендерим страницу PDF на canvas
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      
      // Конвертируем в нужный формат (JPG, PNG, WebP)
      const mimeMap: Record<string, string> = {
        JPG: 'image/jpeg',
        PNG: 'image/png',
        WebP: 'image/webp',
      };
      const mime = mimeMap[format] || 'image/png';
      const quality = format === 'JPG' ? 0.9 : undefined;
      const blobPromise = new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mime, quality);
      });
      
      const blob = await blobPromise;
      if (blob) {
        images.push(blob);
      }
    }
  } catch (error) {
    console.error('Ошибка при конвертации PDF в изображения:', error);
    throw error;
  }
  
  return images;
}

// Функция для создания ZIP архива из изображений
export async function createZipFromImages(images: {blob: Blob, name: string}[]): Promise<Blob> {
  // Динамический импорт JSZip для избежания проблем SSR
  const JSZip = (await import('jszip')).default;
  
  const zip = new JSZip();
  
  for (const image of images) {
    const arrayBuffer = await image.blob.arrayBuffer();
    zip.file(image.name, arrayBuffer);
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

export function getImageMimeAndExtension(format: string): { mime: string; ext: string; quality?: number } {
  const normalized = format.toUpperCase();
  if (normalized === "JPG" || normalized === "JPEG") {
    return { mime: "image/jpeg", ext: "jpg", quality: 0.92 };
  }
  if (normalized === "WEBP") {
    return { mime: "image/webp", ext: "webp", quality: 0.9 };
  }
  return { mime: "image/png", ext: "png" };
}

// Конвертация изображений между JPG / PNG / WebP через canvas.
export async function convertImagesBetweenFormats(
  files: File[],
  outputFormat: "JPG" | "PNG" | "WebP" | string
): Promise<{ blob: Blob; name: string }[]> {
  if (typeof window === "undefined") {
    throw new Error("Конвертация изображений доступна только в браузере");
  }

  const { mime, ext, quality } = getImageMimeAndExtension(outputFormat);
  const results: { blob: Blob; name: string }[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      continue;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mime, quality);
    });
    if (!blob) continue;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    results.push({
      blob,
      name: `${baseName}.${ext}`,
    });
  }

  return results;
}

// Конвертация WebP в PNG через canvas (для pdf-lib, который не поддерживает WebP)
async function convertWebPToPng(arrayBuffer: ArrayBuffer): Promise<Blob> {
  const blob = new Blob([arrayBuffer], { type: 'image/webp' });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion failed'))), 'image/png');
  });
}

// Функция для конвертации изображений в PDF
export async function convertImagesToPDF(files: File[]): Promise<Blob> {
  const newPdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      continue; // Пропускаем не изображения
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    let image;
    try {
      // Пытаемся встроить как JPEG
      image = await newPdfDoc.embedJpg(arrayBuffer);
    } catch {
      try {
        // Если не удалось, пробуем как PNG
        image = await newPdfDoc.embedPng(arrayBuffer);
      } catch {
        try {
          // Поддержка WebP через canvas (браузер)
          if (typeof window !== 'undefined' && file.type === 'image/webp') {
            const pngBlob = await convertWebPToPng(arrayBuffer);
            image = await newPdfDoc.embedPng(await pngBlob.arrayBuffer());
          } else {
            throw new Error('Unsupported format');
          }
        } catch {
          console.warn(`Не удалось обработать изображение: ${file.name}. Формат не поддерживается или файл поврежден.`);
          continue;
        }
      }
    }
    
    // Создаем новую страницу с размерами, соответствующими изображению
    const page = newPdfDoc.addPage([image.width, image.height]);
    
    // Добавляем изображение на всю страницу
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  const pdfBytes = await newPdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

// Функция для редактирования PDF (добавление водяного знака)
export async function addWatermark(file: File, watermarkText: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const pages = pdfDoc.getPages();
  const fontSize = 50;
  // Приблизительная ширина текста (примерно 0.6 * fontSize на символ)
  const textWidth = watermarkText.length * fontSize * 0.6;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      color: rgb(0.75, 0.75, 0.75),
      opacity: 0.4,
      rotate: degrees(-45),
    });
  }
  
  const modifiedPdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
}

// Функция для объединения PDF
export async function mergePDFs(files: File[]): Promise<Blob> {
  const newPdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    
    copiedPages.forEach((page) => {
      newPdfDoc.addPage(page);
    });
  }
  
  const mergedPdfBytes = await newPdfDoc.save();
  return new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
}

// Функция для поворота страниц PDF (все страницы на один угол)
export async function rotatePDF(file: File, angle: 90 | 180 | 270): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    page.setRotation(degrees(angle));
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/** Поворот страниц PDF по отдельности. rotations[i] — угол для страницы i (0, 90, 180, 270). */
export async function rotatePDFPages(file: File, rotations: number[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  for (let i = 0; i < pages.length; i++) {
    const angle = rotations[i] ?? 0;
    if (angle !== 0) {
      pages[i].setRotation(degrees(angle as 0 | 90 | 180 | 270));
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

// Функция для разделения PDF на отдельные страницы
export async function splitPDF(file: File, pageNumbers: number[]): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const pdfs: Blob[] = [];

  const validPages = pageNumbers.filter((n) => Number.isFinite(n) && n >= 1 && n <= pageCount);
  if (validPages.length === 0) {
    throw new Error('Нет допустимых номеров страниц (ожидаются числа от 1 до ' + pageCount + ')');
  }

  for (const pageNum of validPages) {
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
    newPdfDoc.addPage(copiedPage);

    const pdfBytes = await newPdfDoc.save();
    pdfs.push(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }));
  }

  return pdfs;
}

// Разделение PDF на отдельные страницы (1 PDF на страницу)
export async function splitPDFIntoPages(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i);
  return splitPDF(file, pageNumbers.map((n) => n + 1));
}

// Извлечение текста из PDF (pdf.js) — экспорт для инструмента «Извлечь текст»
export async function extractTextFromPDF(file: File): Promise<{ pageNum: number; text: string }[]> {
  if (typeof window === 'undefined') throw new Error('Доступно только в браузере');
  const pdfjsLib = await import('pdfjs-dist');
  setPdfWorkerSrc(pdfjsLib);
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
  const result: { pageNum: number; text: string }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    result.push({ pageNum: i, text });
  }
  return result;
}

// PDF → Word (извлечение текста + создание .docx)
export async function convertPDFToWord(file: File): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx');
  const pages = await extractTextFromPDF(file);
  const children: InstanceType<typeof Paragraph>[] = [];
  pages.forEach((p, idx) => {
    if (p.text.trim()) {
      children.push(new Paragraph({ children: [new TextRun(p.text)] }));
    }
    if (idx < pages.length - 1) children.push(new Paragraph({ children: [new PageBreak()] }));
  });
  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun('Текст не найден. PDF может содержать только изображения.')] }));
  }
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

// PDF → Excel (извлечение текста, каждая страница = лист)
export async function convertPDFToExcel(file: File): Promise<Blob> {
  const XLSX = await import('xlsx');
  const pages = await extractTextFromPDF(file);
  const wb = XLSX.utils.book_new();
  pages.forEach((p, idx) => {
    const lines = p.text.split(/\r?\n/).filter(Boolean);
    const data = lines.map((line) => [line]);
    const ws = XLSX.utils.aoa_to_sheet(data.length ? data : [['Текст не найден']]);
    XLSX.utils.book_append_sheet(wb, ws, `Страница ${idx + 1}`);
  });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export type SignaturePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

// Получить количество страниц PDF
export async function getPDFPageCount(file: File): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const pdfjsLib = await import('pdfjs-dist');
  setPdfWorkerSrc(pdfjsLib);
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer } as any).promise;
  return pdf.numPages;
}

// Добавление подписи в PDF (PNG с прозрачным фоном, выбор позиции и страниц)
export async function addSignature(
  file: File,
  signatureBlob: Blob,
  options?: {
    width?: number;
    position?: SignaturePosition;
    customPosition?: { x: number; y: number }; // PDF coordinates (bottom-left origin)
    pageNumbers?: number[]; // 1-based, if not set = all pages
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const sigArrayBuffer = await signatureBlob.arrayBuffer();
  let image;
  try {
    image = await pdfDoc.embedPng(sigArrayBuffer);
  } catch {
    try {
      image = await pdfDoc.embedJpg(sigArrayBuffer);
    } catch {
      throw new Error('Подпись должна быть в формате PNG (с прозрачным фоном) или JPEG');
    }
  }
  const sigWidth = options?.width ?? 140;
  const sigHeight = (image.height / image.width) * sigWidth;
  const margin = 40;
  const allPages = pdfDoc.getPages();
  const pageIndices = options?.pageNumbers
    ? options.pageNumbers.filter((n) => n >= 1 && n <= allPages.length).map((n) => n - 1)
    : allPages.map((_, i) => i);

  pageIndices.forEach((idx) => {
    const page = allPages[idx];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    let x: number;
    let y: number;
    if (options?.customPosition) {
      x = options.customPosition.x;
      y = options.customPosition.y;
    } else {
      switch (options?.position ?? 'bottom-right') {
        case 'bottom-right':
          x = pageWidth - sigWidth - margin;
          y = margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'top-right':
          x = pageWidth - sigWidth - margin;
          y = pageHeight - sigHeight - margin;
          break;
        case 'top-left':
          x = margin;
          y = pageHeight - sigHeight - margin;
          break;
        case 'center':
          x = (pageWidth - sigWidth) / 2;
          y = (pageHeight - sigHeight) / 2;
          break;
        default:
          x = pageWidth - sigWidth - margin;
          y = margin;
      }
    }
    page.drawImage(image, { x, y, width: sigWidth, height: sigHeight });
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

export type OrganizePDFPageOperation =
  | {
      kind: 'source';
      sourceIndex: number;
      rotation: 0 | 90 | 180 | 270;
      cropPercent: number;
    }
  | {
      kind: 'blank';
      width: number;
      height: number;
    };

/**
 * Организация страниц PDF: сортировка, поворот, удаление, обрезка и добавление пустых страниц.
 * Итоговый порядок определяется массивом operations.
 */
export async function organizePDFPages(
  file: File,
  operations: OrganizePDFPageOperation[]
): Promise<Blob> {
  if (operations.length === 0) {
    throw new Error('Нет страниц для сохранения');
  }

  const arrayBuffer = await file.arrayBuffer();
  const sourceDoc = await PDFDocument.load(arrayBuffer);
  const targetDoc = await PDFDocument.create();
  const sourceCount = sourceDoc.getPageCount();

  for (const operation of operations) {
    if (operation.kind === 'blank') {
      const width = Math.max(10, operation.width || 595.28);
      const height = Math.max(10, operation.height || 841.89);
      targetDoc.addPage([width, height]);
      continue;
    }

    if (operation.sourceIndex < 0 || operation.sourceIndex >= sourceCount) {
      continue;
    }

    const [copiedPage] = await targetDoc.copyPages(sourceDoc, [operation.sourceIndex]);
    copiedPage.setRotation(degrees(operation.rotation));

    const normalizedCrop = Math.min(Math.max(operation.cropPercent || 0, 0), 45);
    if (normalizedCrop > 0) {
      const { width, height } = copiedPage.getSize();
      const cropX = (width * normalizedCrop) / 100;
      const cropY = (height * normalizedCrop) / 100;
      const croppedWidth = width - cropX * 2;
      const croppedHeight = height - cropY * 2;
      if (croppedWidth > 4 && croppedHeight > 4) {
        copiedPage.setCropBox(cropX, cropY, croppedWidth, croppedHeight);
      }
    }

    targetDoc.addPage(copiedPage);
  }

  const bytes = await targetDoc.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}