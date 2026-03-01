import { describe, it, expect, beforeAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  setPdfWorkerSrc,
  getImageMimeAndExtension,
  mergePDFs,
  splitPDF,
  splitPDFIntoPages,
  rotatePDF,
  rotatePDFPages,
  organizePDFPages,
  addWatermark,
} from "./pdfUtils";

function blobToFile(blob: Blob, name: string, type: string): File {
  return new File([blob], name, { type });
}

async function createMinimalPdf(pagesCount: number): Promise<{ blob: Blob; file: File }> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pagesCount; i++) {
    doc.addPage([595, 841]);
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  return { blob, file: blobToFile(blob, "test.pdf", "application/pdf") };
}

describe("pdfUtils", () => {
  describe("setPdfWorkerSrc", () => {
    it("does not set workerSrc when window is undefined (Node)", () => {
      const mock = { GlobalWorkerOptions: {} };
      setPdfWorkerSrc(mock as any);
      expect(mock.GlobalWorkerOptions.workerSrc).toBeUndefined();
    });
  });

  describe("getImageMimeAndExtension", () => {
    it("returns jpeg for JPG", () => {
      expect(getImageMimeAndExtension("JPG")).toEqual({
        mime: "image/jpeg",
        ext: "jpg",
        quality: 0.92,
      });
    });
    it("returns jpeg for JPEG", () => {
      expect(getImageMimeAndExtension("JPEG")).toEqual({
        mime: "image/jpeg",
        ext: "jpg",
        quality: 0.92,
      });
    });
    it("returns webp for WebP", () => {
      expect(getImageMimeAndExtension("WebP")).toEqual({
        mime: "image/webp",
        ext: "webp",
        quality: 0.9,
      });
    });
    it("returns png for PNG or unknown", () => {
      expect(getImageMimeAndExtension("PNG")).toEqual({ mime: "image/png", ext: "png" });
      expect(getImageMimeAndExtension("gif")).toEqual({ mime: "image/png", ext: "png" });
    });
  });

  describe("mergePDFs", () => {
    it("merges multiple PDFs into one", async () => {
      const { file: f1 } = await createMinimalPdf(1);
      const { file: f2 } = await createMinimalPdf(2);
      const result = await mergePDFs([f1, f2]);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/pdf");
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(3);
    });
    it("returns single-page PDF when one file", async () => {
      const { file } = await createMinimalPdf(1);
      const result = await mergePDFs([file]);
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(1);
    });
  });

  describe("splitPDF", () => {
    it("splits by given page numbers", async () => {
      const { file } = await createMinimalPdf(3);
      const blobs = await splitPDF(file, [1, 3]);
      expect(blobs).toHaveLength(2);
      const doc1 = await PDFDocument.load(await blobs[0].arrayBuffer());
      const doc3 = await PDFDocument.load(await blobs[1].arrayBuffer());
      expect(doc1.getPageCount()).toBe(1);
      expect(doc3.getPageCount()).toBe(1);
    });
    it("filters invalid page numbers and uses only valid", async () => {
      const { file } = await createMinimalPdf(2);
      const blobs = await splitPDF(file, [1, 99, 2]);
      expect(blobs).toHaveLength(2);
    });
    it("throws when no valid page numbers", async () => {
      const { file } = await createMinimalPdf(2);
      await expect(splitPDF(file, [])).rejects.toThrow("Нет допустимых номеров страниц");
      await expect(splitPDF(file, [0, -1])).rejects.toThrow("Нет допустимых номеров страниц");
      await expect(splitPDF(file, [10, 20])).rejects.toThrow("Нет допустимых номеров страниц");
    });
  });

  describe("splitPDFIntoPages", () => {
    it("returns one blob per page", async () => {
      const { file } = await createMinimalPdf(4);
      const blobs = await splitPDFIntoPages(file);
      expect(blobs).toHaveLength(4);
      for (const b of blobs) {
        const doc = await PDFDocument.load(await b.arrayBuffer());
        expect(doc.getPageCount()).toBe(1);
      }
    });
  });

  describe("rotatePDF", () => {
    it("rotates all pages", async () => {
      const { file } = await createMinimalPdf(2);
      const result = await rotatePDF(file, 90);
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(2);
      const p1 = doc.getPage(0);
      expect(p1.getRotation().angle).toBe(90);
    });
  });

  describe("rotatePDFPages", () => {
    it("applies per-page rotations", async () => {
      const { file } = await createMinimalPdf(2);
      const result = await rotatePDFPages(file, [90, 180]);
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPage(0).getRotation().angle).toBe(90);
      expect(doc.getPage(1).getRotation().angle).toBe(180);
    });
  });

  describe("organizePDFPages", () => {
    it("reorders and adds blank page", async () => {
      const { file } = await createMinimalPdf(2);
      const result = await organizePDFPages(file, [
        { kind: "source", sourceIndex: 1, rotation: 0, cropPercent: 0 },
        { kind: "blank", width: 595.28, height: 841.89 },
        { kind: "source", sourceIndex: 0, rotation: 0, cropPercent: 0 },
      ]);
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(3);
    });
    it("skips invalid source indices", async () => {
      const { file } = await createMinimalPdf(1);
      const result = await organizePDFPages(file, [
        { kind: "source", sourceIndex: 0, rotation: 0, cropPercent: 0 },
        { kind: "source", sourceIndex: 99, rotation: 0, cropPercent: 0 },
      ]);
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(1);
    });
    it("throws when operations empty", async () => {
      const { file } = await createMinimalPdf(1);
      await expect(organizePDFPages(file, [])).rejects.toThrow("Нет страниц для сохранения");
    });
  });

  describe("addWatermark", () => {
    it("returns PDF with same page count", async () => {
      const { file } = await createMinimalPdf(2);
      const result = await addWatermark(file, "TEST");
      const doc = await PDFDocument.load(await result.arrayBuffer());
      expect(doc.getPageCount()).toBe(2);
    });
  });
});
