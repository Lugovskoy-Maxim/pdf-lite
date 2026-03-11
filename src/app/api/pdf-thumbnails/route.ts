import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB — лимит для серверной обработки
const MAX_PAGES = 500;

/**
 * POST: multipart/form-data с полем "file" (PDF).
 * Возвращает { pageCount, thumbnails, widths, heights } или 501 если Python недоступен.
 */
export async function POST(request: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Нужен PDF файл" }, { status: 400 });
    }
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс. 20 МБ)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    tmpPath = join(tmpdir(), `pdf-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    await writeFile(tmpPath, buffer);

    const result = await runPythonThumbnails(tmpPath);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("python") || msg.includes("ENOENT") || msg.includes("spawn")) {
      return NextResponse.json(
        { error: "Серверная генерация превью недоступна (нужен Python + PyMuPDF)" },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (tmpPath) {
      try {
        await unlink(tmpPath);
      } catch {
        // ignore
      }
    }
  }
}

function runPythonThumbnails(pdfPath: string): Promise<{
  pageCount: number;
  thumbnails: string[];
  widths: number[];
  heights: number[];
}> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), "scripts", "pdf_thumbnails.py");
    const py = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(py, [scriptPath, pdfPath], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout) as {
            pageCount: number;
            thumbnails: string[];
            widths: number[];
            heights: number[];
          };
          if (data.pageCount > MAX_PAGES) {
            reject(new Error(`Слишком много страниц (макс. ${MAX_PAGES})`));
            return;
          }
          resolve(data);
        } catch (e) {
          reject(new Error("Неверный ответ от скрипта: " + stdout.slice(0, 200)));
        }
      } else {
        reject(new Error(stderr || `Скрипт завершился с кодом ${code}`));
      }
    });
  });
}
