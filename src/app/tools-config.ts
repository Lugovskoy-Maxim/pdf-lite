/** Категории инструментов в стиле iLovePDF */
export const TOOL_CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "organize", label: "Организовать PDF" },
  { id: "optimize", label: "Оптимизация PDF" },
  { id: "toPdf", label: "Конвертировать в PDF" },
  { id: "fromPdf", label: "Преобразовать из PDF" },
  { id: "edit", label: "Редактировать PDF" },
  { id: "security", label: "Защита PDF" },
] as const;

/** URL-путь для страницы инструмента (англ., через дефис) */
export const TOOL_PATHS = [
  "pdf-to-image",
  "images-to-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "merge-pdf",
  "split-pdf",
  "sign-pdf",
  "edit-pdf",
  "compress-pdf",
  "pdf-to-zip",
  "extract-text-from-pdf",
] as const;

export type ToolPath = (typeof TOOL_PATHS)[number];

export const TOOLS = [
  {
    id: "pdfToImage",
    slug: "pdf-v-kartinki",
    path: "pdf-to-image" as const,
    category: "fromPdf" as const,
    shortDescription: "Извлекайте страницы PDF в JPG, PNG или WebP. Конвертируйте каждую страницу в изображение.",
    title: "PDF в картинки — конвертировать PDF в JPG, PNG, WebP онлайн",
    description: "Бесплатно конвертируйте PDF в изображения (JPG, PNG, WebP). Извлечение страниц PDF в картинки без регистрации. Файлы обрабатываются в браузере.",
    keywords: "pdf в картинки, pdf в jpg, pdf в png, конвертер pdf в изображения, извлечь страницы pdf",
  },
  {
    id: "imageToPdf",
    slug: "kartinki-v-pdf",
    path: "images-to-pdf" as const,
    category: "toPdf" as const,
    shortDescription: "Объединяйте JPG, PNG и WebP в один PDF. Регулируйте порядок и ориентацию.",
    title: "Картинки в PDF — объединить JPG, PNG в один PDF онлайн",
    description: "Создайте PDF из изображений JPG, PNG, WebP. Объединение нескольких картинок в один PDF файл бесплатно и без загрузки на сервер.",
    keywords: "картинки в pdf, jpg в pdf, png в pdf, создать pdf из фото, объединить изображения в pdf",
  },
  {
    id: "pdfToWord",
    slug: "pdf-v-word",
    path: "pdf-to-word" as const,
    category: "fromPdf" as const,
    shortDescription: "Конвертируйте PDF в редактируемые DOC и DOCX. Точность почти 100%.",
    title: "PDF в Word — конвертировать PDF в DOCX онлайн бесплатно",
    description: "Конвертация PDF в Word (DOCX) онлайн. Извлечение текста из PDF в редактируемый документ. Работает с текстовыми PDF.",
    keywords: "pdf в word, pdf в docx, конвертер pdf в word, преобразовать pdf в документ word",
  },
  {
    id: "pdfToExcel",
    slug: "pdf-v-excel",
    path: "pdf-to-excel" as const,
    category: "fromPdf" as const,
    shortDescription: "Извлекайте данные из PDF в таблицы Excel. Каждая страница — отдельный лист.",
    title: "PDF в Excel — конвертировать PDF в XLSX онлайн",
    description: "Конвертация PDF в Excel (XLSX). Извлечение таблиц и текста из PDF в таблицу Excel. Каждая страница — отдельный лист.",
    keywords: "pdf в excel, pdf в xlsx, конвертер pdf в excel, таблица из pdf",
  },
  {
    id: "merge",
    slug: "obedinit-pdf",
    path: "merge-pdf" as const,
    category: "organize" as const,
    shortDescription: "Объединяйте PDF файлы в любом порядке. Быстро и просто.",
    title: "Объединить PDF — соединить несколько PDF в один файл онлайн",
    description: "Объединение нескольких PDF файлов в один документ. Бесплатное слияние PDF онлайн. Порядок страниц по выбору файлов.",
    keywords: "объединить pdf, соединить pdf, слить pdf в один, объединение pdf файлов",
  },
  {
    id: "split",
    slug: "razdelit-pdf",
    path: "split-pdf" as const,
    category: "organize" as const,
    shortDescription: "Выбирайте диапазон страниц или сохраняйте каждую страницу отдельным PDF.",
    title: "Разделить PDF — извлечь страницы из PDF онлайн",
    description: "Разделение PDF на отдельные страницы или по диапазонам. Извлечение нужных страниц из PDF в отдельные файлы бесплатно.",
    keywords: "разделить pdf, извлечь страницы из pdf, разбить pdf на страницы, вырезать страницы pdf",
  },
  {
    id: "signature",
    slug: "podpis-pdf",
    path: "sign-pdf" as const,
    category: "security" as const,
    shortDescription: "Подписывайте PDF сами или запрашивайте подписи. Электронная подпись онлайн.",
    title: "Подпись PDF — подписать документ PDF онлайн",
    description: "Добавление электронной подписи в PDF онлайн. Нарисуйте подпись и разместите на страницах документа. Без регистрации.",
    keywords: "подпись pdf, подписать pdf онлайн, электронная подпись в pdf, добавить подпись в документ",
  },
  {
    id: "edit",
    slug: "redaktirovat-pdf",
    path: "edit-pdf" as const,
    category: "edit" as const,
    shortDescription: "Поворот страниц, водяной знак. Редактируйте PDF в браузере.",
    title: "Редактировать PDF — поворот, водяной знак онлайн",
    description: "Редактирование PDF: поворот страниц на 90°, 180°, 270°, добавление водяного знака. Все операции в браузере.",
    keywords: "редактировать pdf, повернуть pdf, водяной знак на pdf, изменить pdf онлайн",
  },
  {
    id: "compress",
    slug: "szhat-pdf",
    path: "compress-pdf" as const,
    category: "optimize" as const,
    shortDescription: "Уменьшайте размер PDF с сохранением качества. Оптимизация файлов.",
    title: "Сжать PDF — уменьшить размер PDF файла онлайн",
    description: "Сжатие PDF для уменьшения размера файла. Выберите уровень сжатия (низкий, средний, высокий). Обработка в браузере.",
    keywords: "сжать pdf, уменьшить pdf, уменьшить размер pdf, сжатие pdf онлайн",
  },
  {
    id: "pdfToZip",
    slug: "pdf-v-zip",
    path: "pdf-to-zip" as const,
    category: "fromPdf" as const,
    shortDescription: "Конвертируйте страницы в изображения и скачайте одним ZIP-архивом.",
    title: "PDF в ZIP — скачать страницы PDF как архив с картинками",
    description: "Конвертируйте страницы PDF в изображения и скачайте одним ZIP-архивом. Форматы JPG, PNG или WebP. Удобно для извлечения всех страниц.",
    keywords: "pdf в zip, pdf страницы в архив, скачать pdf как картинки zip, извлечь страницы pdf в архив",
  },
  {
    id: "extractText",
    slug: "izvlech-tekst-iz-pdf",
    path: "extract-text-from-pdf" as const,
    category: "fromPdf" as const,
    shortDescription: "Извлекайте текст со всех страниц. Копируйте и используйте в других документах.",
    title: "Извлечь текст из PDF — скопировать текст из PDF онлайн",
    description: "Бесплатное извлечение текста из PDF. Получите текст со всех страниц в одном месте. Подходит для текстовых PDF.",
    keywords: "извлечь текст из pdf, скопировать текст из pdf, pdf в текст, вытащить текст из pdf",
  },
] as const;

/** Для конвертеров: подписи форматов как на Convertio (исходный → целевой) */
export const TOOL_FORMATS: Record<string, { from: string; to: string }> = {
  pdfToImage: { from: "PDF", to: "JPG / PNG / WebP" },
  imageToPdf: { from: "JPG / PNG / WebP", to: "PDF" },
  pdfToWord: { from: "PDF", to: "DOC (WORD)" },
  pdfToExcel: { from: "PDF", to: "XLSX (EXCEL)" },
  pdfToZip: { from: "PDF", to: "ZIP" },
};

export type ToolId = (typeof TOOLS)[number]["id"];
export type ToolSlug = (typeof TOOLS)[number]["slug"];

export function getToolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug) ?? null;
}

export function getToolById(id: string) {
  return TOOLS.find((t) => t.id === id) ?? null;
}

export function getToolByPath(path: string) {
  return TOOLS.find((t) => t.path === path) ?? null;
}
