import Link from "next/link";
import { FileText, Shield, Zap } from "lucide-react";
import { TOOLS } from "@/app/tools-config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-950 rounded-lg">
              <div className="w-9 h-9 rounded-xl bg-amber-500 dark:bg-amber-600 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-stone-900 dark:text-white">PDF Lite</span>
            </Link>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
              Бесплатные онлайн-инструменты для PDF: объединение, сжатие, конвертация и редактирование. Без установки, файлы остаются в браузере.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-stone-900 dark:text-white mb-4">Инструменты</h4>
            <ul className="space-y-2.5 text-sm text-stone-600 dark:text-stone-400 md:columns-2 md:gap-6">
              {TOOLS.map((tool) => (
                <li key={tool.id} className="break-inside-avoid">
                  <Link href={`/${tool.path}`} className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-block">
                    {tool.title.split(" — ")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-stone-900 dark:text-white mb-4">О сервисе</h4>
            <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                Файлы не покидают браузер
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </span>
                Работает офлайн
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500 dark:text-stone-500">
            © {year} PDF Lite
          </p>
        </div>
      </div>
    </footer>
  );
}
