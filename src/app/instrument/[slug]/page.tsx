import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getToolBySlug, TOOLS } from "../../tools-config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PDFToolsPanel } from "@/components/PDFToolsPanel";
import { FileText } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Инструмент не найден" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdf-lite.vercel.app";
  const url = `${baseUrl}/instrument/${tool.slug}`;

  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url,
      type: "website",
      locale: "ru_RU",
    },
  };
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export default async function InstrumentPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-10 md:py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 mb-6 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Все инструменты
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white">
              {tool.title.split(" — ")[0]}
            </h1>
            <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-2xl">
              {tool.description}
            </p>
          </div>
        </section>
        <section className="pb-12 md:pb-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <PDFToolsPanel initialTab={tool.id} singleToolMode />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
