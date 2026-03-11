import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "forPDF — конвертация, объединение и сжатие PDF онлайн",
    short_name: "forPDF",
    description:
      "Онлайн-инструменты для PDF: конвертация, объединение, разделение, сжатие, подпись и редактирование. Быстро и бесплатно.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#1c1917",
    orientation: "any",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
