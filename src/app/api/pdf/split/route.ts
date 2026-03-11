import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

function parsePageSelection(value: string, maxPage: number): number[] {
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
        if (n <= 0 || n > maxPage) continue;
        pages.add(n);
      }
      continue;
    }
    const page = Number(token);
    if (!Number.isFinite(page) || page <= 0 || page > maxPage) continue;
    pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

/** POST: formData с file (PDF), mode: "all" | "range", range?: string (например "1,3,5-7"). */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as string) || "all";
    const range = (formData.get("range") as string) || "";
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Нужен PDF файл" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс. 20 МБ)" },
        { status: 400 }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();
    let pageNumbers: number[];
    if (mode === "all") {
      pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
    } else {
      pageNumbers = parsePageSelection(range, pageCount);
      if (pageNumbers.length === 0) {
        return NextResponse.json(
          { error: "Укажите номера страниц (например: 1,3,5 или 1-5)" },
          { status: 400 }
        );
      }
    }
    const pdfsBase64: string[] = [];
    for (const pageNum of pageNumbers) {
      const newPdfDoc = await PDFDocument.create();
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
      newPdfDoc.addPage(copiedPage);
      const bytes = await newPdfDoc.save();
      pdfsBase64.push(Buffer.from(bytes).toString("base64"));
    }
    return NextResponse.json({ files: pdfsBase64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
