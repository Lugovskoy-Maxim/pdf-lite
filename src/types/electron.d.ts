export {};

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      onUpdateAvailable: (cb: (info: { version: string }) => void) => void;
      onUpdateDownloaded: (cb: (info: unknown) => void) => void;
      onUpdateError: (cb: (msg: string) => void) => void;
      installUpdateAndQuit: () => void;
    };
  }
}
