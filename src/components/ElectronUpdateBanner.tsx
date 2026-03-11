"use client";

import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";

export function ElectronUpdateBanner() {
  const [isElectron, setIsElectron] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setIsElectron(true);

    window.electronAPI.getAppVersion().then(setVersion);

    window.electronAPI.onUpdateAvailable(() => {
      setUpdateError(null);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateReady(true);
      setUpdateError(null);
    });

    window.electronAPI.onUpdateError((msg) => {
      setUpdateError(msg);
    });
  }, []);

  if (!isElectron) return null;

  const handleInstall = () => {
    window.electronAPI?.installUpdateAndQuit();
  };

  const dismissError = () => setUpdateError(null);

  return (
    <>
      {updateReady && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-emerald-600 text-white text-sm"
          role="alert"
        >
          <span>Доступна новая версия. Перезапустите приложение для установки.</span>
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Перезапустить
          </button>
        </div>
      )}
      {updateError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-amber-600 text-white text-sm"
          role="alert"
        >
          <span>Ошибка обновления: {updateError}</span>
          <button
            type="button"
            onClick={dismissError}
            className="p-1 rounded hover:bg-white/20"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {version && (
        <span className="sr-only" aria-hidden>
          Версия приложения: {version}
        </span>
      )}
    </>
  );
}
