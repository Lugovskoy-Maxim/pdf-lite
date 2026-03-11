const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");
const net = require("net");

const isDev = !app.isPackaged;
const DEFAULT_PORT = 3000;

/** Найти свободный порт */
function findFreePort(startPort = 3010) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findFreePort(startPort + 1)));
  });
}

/** Ждать пока сервер на порту начнёт отвечать */
function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Server startup timeout"));
        return;
      }
      const socket = net.connect(port, "127.0.0.1", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => setTimeout(tryConnect, 100));
    };
    tryConnect();
  });
}

/** Запуск Next.js standalone сервера (только в упакованном приложении) */
function startNextServer() {
  const resourcesPath = process.resourcesPath;
  const standalonePath = path.join(resourcesPath, "standalone");
  const serverPath = path.join(standalonePath, "server.js");

  return findFreePort().then((port) => {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" };
      const child = spawn(process.execPath, [serverPath], {
        cwd: standalonePath,
        env,
        stdio: "ignore",
        windowsHide: true,
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code !== 0 && code !== null) reject(new Error(`Server exited ${code}`));
      });
      waitForServer(port)
        .then(() => resolve({ port, child }))
        .catch(reject);
    });
  });
}

let mainWindow = null;
let nextServer = null;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    icon: path.join(__dirname, "..", "public", "icons", "format-pdf.svg"),
  });

  mainWindow.loadURL(url);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function quit() {
  if (nextServer && nextServer.child) {
    nextServer.child.kill();
    nextServer = null;
  }
  app.quit();
}

app.whenReady().then(async () => {
  let url;

  if (isDev) {
    url = `http://localhost:${process.env.PORT || DEFAULT_PORT}`;
    createWindow(url);
    return;
  }

  try {
    nextServer = await startNextServer();
    url = `http://127.0.0.1:${nextServer.port}`;
    createWindow(url);
  } catch (err) {
    console.error("Failed to start Next.js server", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (nextServer && nextServer.child) nextServer.child.kill();
  nextServer = null;
  app.quit();
});

app.on("before-quit", () => {
  if (nextServer && nextServer.child) nextServer.child.kill();
});

// ——— автообновление ———
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("update-available", info);
  }
});

autoUpdater.on("update-downloaded", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded", info);
  }
});

autoUpdater.on("error", (err) => {
  if (mainWindow) {
    mainWindow.webContents.send("update-error", err.message);
  }
});

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.on("install-update-and-quit", () => {
  autoUpdater.quitAndInstall(false, true);
});

// Проверка обновлений через 5 сек после запуска (только в production)
if (!isDev) {
  app.whenReady().then(() => {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  });
}
