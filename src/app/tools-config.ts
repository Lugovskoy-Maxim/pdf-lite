export const TOOLS = [
  {
    id: "pdfToImage",
    slug: "pdf-v-kartinki",
    title: "PDF в картинки — конвертировать PDF в JPG, PNG, WebP онлайн",
    description: "Бесплатно конвертируйте PDF в изображения (JPG, PNG, WebP). Извлечение страниц PDF в картинки без регистрации. Файлы обрабатываются в браузере.",
    keywords: "pdf в картинки, pdf в jpg, pdf в png, конвертер pdf в изображения, извлечь страницы pdf",
  },
  {
    id: "imageToPdf",
    slug: "kartinki-v-pdf",
    title: "Картинки в PDF — объединить JPG, PNG в один PDF онлайн",
    description: "Создайте PDF из изображений JPG, PNG, WebP. Объединение нескольких картинок в один PDF файл бесплатно и без загрузки на сервер.",
    keywords: "картинки в pdf, jpg в pdf, png в pdf, создать pdf из фото, объединить изображения в pdf",
  },
  {
    id: "pdfToWord",
    slug: "pdf-v-word",
    title: "PDF в Word — конвертировать PDF в DOCX онлайн бесплатно",
    description: "Конвертация PDF в Word (DOCX) онлайн. Извлечение текста из PDF в редактируемый документ. Работает с текстовыми PDF.",
    keywords: "pdf в word, pdf в docx, конвертер pdf в word, преобразовать pdf в документ word",
  },
  {
    id: "pdfToExcel",
    slug: "pdf-v-excel",
    title: "PDF в Excel — конвертировать PDF в XLSX онлайн",
    description: "Конвертация PDF в Excel (XLSX). Извлечение таблиц и текста из PDF в таблицу Excel. Каждая страница — отдельный лист.",
    keywords: "pdf в excel, pdf в xlsx, конвертер pdf в excel, таблица из pdf",
  },
  {
    id: "merge",
    slug: "obedinit-pdf",
    title: "Объединить PDF — соединить несколько PDF в один файл онлайн",
    description: "Объединение нескольких PDF файлов в один документ. Бесплатное слияние PDF онлайн. Порядок страниц по выбору файлов.",
    keywords: "объединить pdf, соединить pdf, слить pdf в один, объединение pdf файлов",
  },
  {
    id: "split",
    slug: "razdelit-pdf",
    title: "Разделить PDF — извлечь страницы из PDF онлайн",
    description: "Разделение PDF на отдельные страницы или по диапазонам. Извлечение нужных страниц из PDF в отдельные файлы бесплатно.",
    keywords: "разделить pdf, извлечь страницы из pdf, разбить pdf на страницы, вырезать страницы pdf",
  },
  {
    id: "signature",
    slug: "podpis-pdf",
    title: "Подпись PDF — подписать документ PDF онлайн",
    description: "Добавление электронной подписи в PDF онлайн. Нарисуйте подпись и разместите на страницах документа. Без регистрации.",
    keywords: "подпись pdf, подписать pdf онлайн, электронная подпись в pdf, добавить подпись в документ",
  },
  {
    id: "edit",
    slug: "redaktirovat-pdf",
    title: "Редактировать PDF — поворот, водяной знак онлайн",
    description: "Редактирование PDF: поворот страниц на 90°, 180°, 270°, добавление водяного знака. Все операции в браузере.",
    keywords: "редактировать pdf, повернуть pdf, водяной знак на pdf, изменить pdf онлайн",
  },
  {
    id: "compress",
    slug: "szhat-pdf",
    title: "Сжать PDF — уменьшить размер PDF файла онлайн",
    description: "Сжатие PDF для уменьшения размера файла. Выберите уровень сжатия (низкий, средний, высокий). Обработка в браузере.",
    keywords: "сжать pdf, уменьшить pdf, уменьшить размер pdf, сжатие pdf онлайн",
  },
] as const;

export type ToolId = (typeof TOOLS)[number]["id"];
export type ToolSlug = (typeof TOOLS)[number]["slug"];

export function getToolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug) ?? null;
}

export function getToolById(id: string) {
  return TOOLS.find((t) => t.id === id) ?? null;
}
