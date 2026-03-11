import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/** POST: formData с file (PDF). Возвращает { pages: { pageNum, text }[] }. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
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
    const pdfjsLib = await import("pdfjs-dist");
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const result: { pageNum: number; text: string }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      result.push({ pageNum: i, text });
    }
    return NextResponse.json({ pages: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
