const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml') // 已修复依赖

let mainWindow

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  await mainWindow.loadFile('index.html')
  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('F12', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
    }
  })
})

ipcMain.handle('open-directory', async () => {
  return await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
})

ipcMain.handle('getLog', () => {
  const logPath = path.join(__dirname, 'cache.log')
  return fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : ''
})

ipcMain.handle('clearLog', () => {
  const logPath = path.join(__dirname, 'cache.log')
  if (fs.existsSync(logPath)) fs.writeFileSync(logPath, '')
})

ipcMain.handle('getConfig', () => {
  const cfgPath = path.join(__dirname, 'config.yml')
  const defaultCfg = `
api_key: ""
dev_mode: true
base_url: https://ark.cn-beijing.volces.com/api/v3/images/generations
auto_save: true
save_dir: 
models:
  v5: doubao-seedream-5-0-260128
  v45: doubao-seedream-4-5-251128
  v4: doubao-seedream-4-0-250828
default:
  output_format: png
  watermark: false
`
  if (!fs.existsSync(cfgPath)) fs.writeFileSync(cfgPath, defaultCfg, 'utf8')
  return fs.readFileSync(cfgPath, 'utf8')
})

ipcMain.handle('saveConfig', (event, content) => {
  const cfgPath = path.join(__dirname, 'config.yml')
  fs.writeFileSync(cfgPath, content, 'utf8')
})

ipcMain.handle('readReadme', () => {
  const readmePath = path.join(__dirname, 'README.md')
  if (!fs.existsSync(readmePath)) return '# Seedream 图像生成工具'
  return fs.readFileSync(readmePath, 'utf8')
})

ipcMain.on('appExit', () => {
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})