#!/usr/bin/env python3
"""
Генерация превью страниц PDF в формате JSON для органайзера страниц.
Использование: python scripts/pdf_thumbnails.py <путь_к_pdf>
Вывод: JSON с полями pageCount, thumbnails (data URL), widths, heights.
Требуется: pip install pymupdf
"""

import json
import sys
import base64

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.stderr.write("Установите PyMuPDF: pip install pymupdf\n")
    sys.exit(2)

# Масштаб превью (~0.24 как в PDFPageOrganizer THUMB_SCALE)
THUMB_SCALE = 0.24


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Использование: pdf_thumbnails.py <путь_к_pdf>\n")
        sys.exit(1)

    pdf_path = sys.argv[1]
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        sys.stderr.write(f"Ошибка открытия PDF: {e}\n")
        sys.exit(3)

    try:
        page_count = len(doc)
        if page_count == 0:
            print(json.dumps({"pageCount": 0, "thumbnails": [], "widths": [], "heights": []}))
            return

        thumbnails = []
        widths = []
        heights = []

        for i in range(page_count):
            page = doc[i]
            rect = page.rect
            w_pt = rect.width
            h_pt = rect.height
            widths.append(round(w_pt, 2))
            heights.append(round(h_pt, 2))

            mat = fitz.Matrix(THUMB_SCALE, THUMB_SCALE)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("jpeg", quality=85)
            b64 = base64.b64encode(img_bytes).decode("ascii")
            data_url = f"data:image/jpeg;base64,{b64}"
            thumbnails.append(data_url)

        out = {
            "pageCount": page_count,
            "thumbnails": thumbnails,
            "widths": widths,
            "heights": heights,
        }
        print(json.dumps(out))
    finally:
        doc.close()


if __name__ == "__main__":
    main()
