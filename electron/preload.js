const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  onUpdateAvailable: (cb) => {
    ipcRenderer.on("update-available", (_e, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on("update-downloaded", (_e, info) => cb(info));
  },
  onUpdateError: (cb) => {
    ipcRenderer.on("update-error", (_e, msg) => cb(msg));
  },
  installUpdateAndQuit: () => ipcRenderer.send("install-update-and-quit"),
});
