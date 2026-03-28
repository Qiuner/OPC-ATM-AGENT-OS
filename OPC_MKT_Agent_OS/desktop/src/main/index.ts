import { app, shell, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initDataFromSeed } from './store'
import { getWindowState, saveWindowState, getAppSettings } from './app-store'

// ── Single Instance Lock ──
// Prevent multiple app instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow(): BrowserWindow {
  const { bounds, isMaximized } = getWindowState()
  const settings = getAppSettings()
  const storedTheme = settings.theme ?? 'dark'
  nativeTheme.themeSource = storedTheme === 'system' ? 'system' : storedTheme
  const isDark = storedTheme === 'system' ? nativeTheme.shouldUseDarkColors : storedTheme === 'dark'

  const mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1440,
    height: bounds?.height ?? 900,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: isDark ? '#030305' : '#fafafa',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window state on close
  mainWindow.on('close', () => {
    const maximized = mainWindow.isMaximized()
    if (!maximized) {
      const currentBounds = mainWindow.getBounds()
      saveWindowState(currentBounds, false)
    } else {
      saveWindowState(bounds ?? { x: 0, y: 0, width: 1440, height: 900 }, true)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/** Get the current main window (or the first available) */
export function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

app.whenReady().then(() => {
  // Initialize data store — copy seed data from web/src/data/ on first launch
  const seedDir = is.dev
    ? join(__dirname, '../../..', 'web', 'src', 'data')
    : join(process.resourcesPath, 'data')
  initDataFromSeed(seedDir)

  // Create window first, then register handlers
  const mainWindow = createWindow()
  registerIpcHandlers(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
