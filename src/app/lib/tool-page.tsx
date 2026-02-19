import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getToolByPath } from "@/app/tools-config";
import type { ToolPath } from "@/app/tools-config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstrumentPageClient } from "@/components/InstrumentPageClient";
import { SITE_NAME, getSiteUrl } from "./seo";

export async function getToolMetadata(path: ToolPath): Promise<Metadata> {
  const tool = getToolByPath(path);
  if (!tool) return { title: "Инструмент не найден" };
  const url = `${getSiteUrl()}/${path}`;
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url,
      type: "website",
      locale: "ru_RU",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.title,
      description: tool.description,
    },
  };
}

export function ToolPage({ path }: { path: ToolPath }) {
  const tool = getToolByPath(path);
  if (!tool) notFound();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-stone-500">Загрузка инструмента...</div>}>
          <InstrumentPageClient
            tool={{
              id: tool.id,
              slug: tool.slug,
              title: tool.title,
              description: tool.description,
              path: tool.path,
            }}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
