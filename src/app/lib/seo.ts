export const SITE_NAME = "forPDF";
export const DEFAULT_TITLE = "forPDF — конвертация, объединение и сжатие PDF онлайн";
export const DEFAULT_DESCRIPTION =
  "Онлайн-инструменты для PDF: конвертация, объединение, разделение, сжатие, подпись и редактирование. Быстро и бесплатно, без установки.";
export const DEFAULT_KEYWORDS =
  "pdf онлайн, конвертер pdf, объединить pdf, разделить pdf, сжать pdf, редактировать pdf";

export function getSiteUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdf-lite.vercel.app";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}
