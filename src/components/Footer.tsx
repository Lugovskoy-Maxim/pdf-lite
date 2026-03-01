import Link from "next/link";
import { FileText, Shield, Zap, Heart } from "lucide-react";
import { TOOLS } from "@/app/tools-config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-[var(--foreground)]">PDF Lite</span>
            </Link>
            <p className="text-sm text-[var(--muted)] leading-relaxed max-w-xs">
              Бесплатные онлайн-инструменты для работы с PDF. Все файлы обрабатываются локально в вашем браузере.
            </p>
            
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="badge badge-success">
                <Shield className="w-3 h-3" />
                Безопасно
              </div>
              <div className="badge badge-accent">
                <Zap className="w-3 h-3" />
                Быстро
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Конвертация</h4>
            <ul className="space-y-2.5 text-sm text-[var(--muted)]">
              {TOOLS.filter(t => ["pdfToImage", "imageToPdf", "imageConverter", "pdfToWord", "pdfToExcel"].includes(t.id)).map((tool) => (
                <li key={tool.id}>
                  <Link 
                    href={`/${tool.path}`} 
                    className="hover:text-[var(--foreground)] hover:translate-x-0.5 inline-block transition-all"
                  >
                    {tool.title.split(" — ")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Редактирование</h4>
            <ul className="space-y-2.5 text-sm text-[var(--muted)]">
              {TOOLS.filter(t => ["merge", "split", "compress", "organizePages", "edit", "signature"].includes(t.id)).map((tool) => (
                <li key={tool.id}>
                  <Link 
                    href={`/${tool.path}`} 
                    className="hover:text-[var(--foreground)] hover:translate-x-0.5 inline-block transition-all"
                  >
                    {tool.title.split(" — ")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Другое</h4>
            <ul className="space-y-2.5 text-sm text-[var(--muted)]">
              {TOOLS.filter(t => ["pdfToZip", "extractText"].includes(t.id)).map((tool) => (
                <li key={tool.id}>
                  <Link 
                    href={`/${tool.path}`} 
                    className="hover:text-[var(--foreground)] hover:translate-x-0.5 inline-block transition-all"
                  >
                    {tool.title.split(" — ")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="divider my-8" />
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--muted)]">
            © {year} PDF Lite. Все инструменты бесплатны.
          </p>
          <p className="text-sm text-[var(--muted)] flex items-center gap-1.5">
            Сделано с <Heart className="w-4 h-4 text-red-500 fill-current" /> для удобства
          </p>
        </div>
      </div>
    </footer>
  );
}
