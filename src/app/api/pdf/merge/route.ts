import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 MB суммарно

/** POST: formData с полями file0, file1, ... (PDF файлы). */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    let i = 0;
    while (true) {
      const f = formData.get(`file${i}`);
      if (!f || !(f instanceof File)) break;
      if (f.type !== "application/pdf") {
        return NextResponse.json(
          { error: `Файл ${i + 1}: нужен PDF` },
          { status: 400 }
        );
      }
      files.push(f);
      i++;
    }
    if (files.length < 2) {
      return NextResponse.json(
        { error: "Нужно минимум 2 PDF файла" },
        { status: 400 }
      );
    }
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: "Суммарный размер файлов не более 20 МБ" },
        { status: 400 }
      );
    }
    const newPdfDoc = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => newPdfDoc.addPage(page));
    }
    const bytes = await newPdfDoc.save();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
