"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Upload, Settings2, Download, FileText, ShieldCheck, Clock3 } from "lucide-react";
import { PDFToolsPanel } from "./PDFToolsPanel";
import { TOOL_FORMATS } from "@/app/tools-config";
import type { ToolId } from "@/app/tools-config";

type Tool = {
  id: ToolId;
  slug: string;
  title: string;
  description: string;
  path?: string;
};

type Props = {
  tool: Tool;
};

const TAB_IDS = ["tool", "howto"] as const;

const ICON_BADGE_STYLES: Record<string, string> = {
  pdfToImage: "bg-sky-100 dark:bg-sky-900/40",
  imageToPdf: "bg-rose-100 dark:bg-rose-900/40",
  imageConverter: "bg-pink-100 dark:bg-pink-900/40",
  pdfToWord: "bg-blue-100 dark:bg-blue-900/40",
  pdfToExcel: "bg-emerald-100 dark:bg-emerald-900/40",
  organizePages: "bg-indigo-100 dark:bg-indigo-900/40",
  merge: "bg-orange-100 dark:bg-orange-900/40",
  split: "bg-violet-100 dark:bg-violet-900/40",
  signature: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
  edit: "bg-cyan-100 dark:bg-cyan-900/40",
  compress: "bg-lime-100 dark:bg-lime-900/40",
  pdfToZip: "bg-amber-100 dark:bg-amber-900/40",
  extractText: "bg-teal-100 dark:bg-teal-900/40",
};

function getIconBadgeStyle(toolId: string) {
  return ICON_BADGE_STYLES[toolId] ?? "bg-amber-100 dark:bg-amber-900/40";
}

export function InstrumentPageClient({ tool }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TAB_IDS)[number]>(() => {
    const tab = searchParams.get("tab");
    return TAB_IDS.includes(tab as (typeof TAB_IDS)[number]) ? (tab as (typeof TAB_IDS)[number]) : "tool";
  });
  const contentRef = useRef<HTMLElement | null>(null);
  const formats = TOOL_FORMATS[tool.id];
  const toolTitle = formats ? `Конвертер ${formats.from} в ${formats.to}` : tool.title.split(" — ")[0];

  useEffect(() => {
    const tab = searchParams.get("tab");
    const nextTab = TAB_IDS.includes(tab as (typeof TAB_IDS)[number]) ? (tab as (typeof TAB_IDS)[number]) : "tool";
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  const setTab = (tab: (typeof TAB_IDS)[number]) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "tool") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      {/* Шапка страницы: хлебные крошки + заголовок */}
      <section className="border-b border-stone-200 dark:border-stone-800 bg-gradient-to-b from-amber-50/70 to-transparent dark:from-amber-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10">
          <nav aria-label="Хлебные крошки" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 flex-wrap">
              <li>
                <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Главная
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </li>
              <li className="text-stone-700 dark:text-stone-300 font-medium" aria-current="page">
                {toolTitle}
              </li>
            </ol>
          </nav>
          <div className="flex gap-4 items-start">
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${getIconBadgeStyle(tool.id)}`}>
              <img
                src={`/icons/${tool.id}.svg`}
                alt=""
                className="w-8 h-8 object-contain"
                width={56}
                height={56}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
                {toolTitle}
              </h1>
              <p className="mt-2 text-stone-600 dark:text-stone-400 leading-relaxed">
                {tool.description}
              </p>
              {formats && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {formats.from}
                  </span>
                  <span className="text-stone-400" aria-hidden>→</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {formats.to}
                  </span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Обработка локально
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
                  <Clock3 className="h-3.5 w-3.5" />1-2 минуты
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("tool");
                    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`btn-ui inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors ${
                    activeTab === "tool"
                      ? "border-amber-500 bg-amber-500 text-stone-900"
                      : "btn-secondary border-stone-200 text-stone-700 hover:text-amber-600 dark:text-stone-200 dark:hover:text-amber-400"
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                  Открыть инструмент
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("howto");
                    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`btn-ui inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors ${
                    activeTab === "howto"
                      ? "border-amber-500 bg-amber-500 text-stone-900"
                      : "btn-secondary border-stone-200 text-stone-700 hover:text-amber-600 dark:text-stone-200 dark:hover:text-amber-400"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Как пользоваться
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Вкладки */}
      <section className="sticky top-16 z-10 bg-stone-50/95 backdrop-blur dark:bg-stone-900/70 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1" role="tablist" aria-label="Разделы страницы">
            {[
              { id: "tool" as const, label: "Инструмент", icon: Settings2 },
              { id: "howto" as const, label: "Как пользоваться", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                onClick={() => setTab(tab.id)}
                className={`btn-ui flex items-center gap-2 rounded-t-lg border-b-2 -mb-px px-5 py-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset ${
                  activeTab === tab.id
                    ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-stone-950"
                    : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Контент вкладок */}
      <section ref={contentRef} className="py-8 md:py-12 px-4 sm:px-6 scroll-mt-28" aria-live="polite">
        <div className="max-w-5xl mx-auto">
          {activeTab === "tool" && (
            <div id="tool-panel" role="tabpanel" aria-labelledby="tool-tab" className="space-y-6">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Загрузите файл, выберите параметры и получите готовый результат прямо в этом блоке.
              </p>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none min-h-[520px]">
                <PDFToolsPanel initialTab={tool.id} singleToolMode />
              </div>
            </div>
          )}

          {activeTab === "howto" && (
            <div id="howto-panel" role="tabpanel" aria-labelledby="howto-tab" className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Нужно сразу начать? Переключитесь на вкладку "Инструмент" и загрузите документ.
              </div>
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-10">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-8">
                Как пользоваться
              </h2>
              <ol className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Загрузите файл(ы)",
                    desc: "Выберите файлы с компьютера или перетащите их в область загрузки на этой странице.",
                    icon: Upload,
                  },
                  {
                    step: 2,
                    title: "Настройте параметры",
                    desc: "При необходимости выберите формат, уровень сжатия или другие опции в панели справа.",
                    icon: Settings2,
                  },
                  {
                    step: 3,
                    title: "Скачайте результат",
                    desc: "Нажмите кнопку обработки, дождитесь завершения и скачайте готовый файл.",
                    icon: Download,
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-lg font-bold text-amber-600 dark:text-amber-400">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-stone-600 dark:text-stone-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* О форматах — только для конвертеров */}
      {formats && activeTab === "tool" && (
        <section className="py-10 px-4 sm:px-6 bg-stone-50/80 dark:bg-stone-900/30 border-t border-stone-200 dark:border-stone-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-5">
              О форматах
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6">
                <h3 className="font-semibold text-stone-900 dark:text-white">
                  {formats.from}
                </h3>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Портативный формат документов. PDF сочетает текст, векторную и растровую графику. Поддерживается всеми платформами.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6">
                <h3 className="font-semibold text-stone-900 dark:text-white">
                  {formats.to}
                </h3>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Целевой формат. Файлы обрабатываются в браузере, без загрузки на сервер.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
