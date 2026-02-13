import Link from "next/link";
import { FileText, Shield, Zap } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">PDF Lite</span>
            </Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
              Бесплатный онлайн-инструмент для работы с PDF. Конвертируйте, объединяйте, сжимайте и редактируйте документы — всё в браузере, без загрузки на сервер.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white mb-3">Инструменты</h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><a href="#tools" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">PDF → Изображения</a></li>
              <li><a href="#tools" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">PDF → Word / Excel</a></li>
              <li><a href="#tools" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Объединить / Разделить</a></li>
              <li><a href="#tools" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Подпись онлайн</a></li>
              <li><a href="#tools" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Сжатие</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white mb-3">О сервисе</h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                Файлы не покидают ваш браузер
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Работает офлайн после загрузки
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            © {year} PDF Lite. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
