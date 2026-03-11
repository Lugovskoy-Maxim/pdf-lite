import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/** POST: formData с file (PDF) и compressionLevel (low | medium | high). Сервер поддерживает только low. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const compressionLevel = (formData.get("compressionLevel") as string) || "low";
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
    const newPdfDoc = await PDFDocument.create();
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(page);
    }
    const useObjectStreams = true;
    const bytes = await newPdfDoc.save({
      useObjectStreams,
      addDefaultPage: false,
      objectsPerTick: 50,
      updateFieldAppearances: true,
    });
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="compressed.pdf"',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
