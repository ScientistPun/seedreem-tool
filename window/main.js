const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let win;
let tray = null;
const isMac = process.platform === 'darwin';
const APP_NAME = "Seedream Tools";

// 配置文件路径（全系统可写）
let configPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'config.yml')
  : path.join(__dirname, 'config.yml');
global.configPath = configPath;

const defaultConfig = `api_key: ""
log_dir: "./logs"
auto_save: true
save_dir: "~/Desktop/output"

models:
  v5: "doubao-seedream-5-0-260128"
  v45: "doubao-seedream-4-5-251128"
  v4: "doubao-seedream-4-0-250828"
`;

// 配置读写
ipcMain.handle('get-config', async () => {
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, defaultConfig, 'utf8');
  return fs.readFileSync(configPath, 'utf8');
});
ipcMain.handle('save-config', async (_, content) => {
  try { fs.writeFileSync(configPath, content, 'utf8'); return true }
  catch { return false }
});

// 窗口
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 840, title: APP_NAME,
    icon: path.join(__dirname, isMac ? 'logo.icns' : 'logo.ico'),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile('index.html');
  Menu.setApplicationMenu(null);
  win.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); win.hide() } });
}

// 托盘
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'logo.png')).resize({ width:18, height:18 });
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: () => win.show() },
    { type:'separator' },
    { label: '退出', click: () => { app.isQuitting=true; app.quit() } }
  ]));
  tray.on('click', () => win.show());
}

// 退出
ipcMain.on('quit-app', () => { app.isQuitting=true; app.quit() });

app.whenReady().then(() => { createWindow(); createTray() });
app.on('activate', () => win || createWindow());
app.on('window-all-closed', () => {});