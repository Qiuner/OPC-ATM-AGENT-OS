import { app, shell, BrowserWindow, nativeTheme, globalShortcut, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initDataFromSeed } from './store'
import { getWindowState, saveWindowState, getAppSettings, getWidgetState, saveWidgetState } from './app-store'
import { getDockGeometry } from './dock-geometry'
import { loadProjectEnv } from './env'

// ── Module-level window refs ──
let _mainWindow: BrowserWindow | undefined
let _dockPetWindow: BrowserWindow | undefined
let _chatPopoverWindow: BrowserWindow | undefined
let _tray: Tray | undefined

// ── Single Instance Lock ──
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
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

  _mainWindow = mainWindow
  return mainWindow
}

// ── Dock Pet Window ──
function createDockPetWindow(): BrowserWindow {
  const geo = getDockGeometry()
  const widgetState = getWidgetState()

  const win = new BrowserWindow({
    width: geo.width,
    height: geo.height,
    x: geo.x,
    y: geo.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  win.setIgnoreMouseEvents(true, { forward: true })

  win.on('ready-to-show', () => {
    if (widgetState.visible !== false) {
      win.show()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/dock-pet.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/dock-pet.html'))
  }

  _dockPetWindow = win
  return win
}

// ── Chat Popover Window ──
function createChatPopoverWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setAlwaysOnTop(true, 'pop-up-menu')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })

  // Hide popover when it loses focus
  win.on('blur', () => {
    win.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/dock-pet-popover.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/dock-pet-popover.html'))
  }

  _chatPopoverWindow = win
  return win
}

// ── Dock Pet toggle ──
function toggleDockPet(): void {
  const win = getDockPetWindow()
  if (!win) return
  if (win.isVisible()) {
    win.hide()
    // Also hide popover
    const popover = getChatPopoverWindow()
    if (popover && !popover.isDestroyed() && popover.isVisible()) popover.hide()
    saveWidgetState({ visible: false })
  } else {
    win.show()
    saveWidgetState({ visible: true })
  }
}

// ── Reposition dock pet when display changes ──
function repositionDockPet(): void {
  const win = getDockPetWindow()
  if (!win || win.isDestroyed()) return
  const geo = getDockGeometry()
  win.setBounds({ x: geo.x, y: geo.y, width: geo.width, height: geo.height })
}

function createTray(): void {
  const iconPath = join(__dirname, '../../build/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  _tray = new Tray(icon)
  _tray.setToolTip('OPC Marketing Agent OS')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏 Dock Pet', click: toggleDockPet },
    { label: '打开主窗口', click: () => focusMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  _tray.setContextMenu(contextMenu)
}

function focusMainWindow(): void {
  const win = getMainWindow()
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  } else {
    const newWin = createWindow()
    registerIpcHandlers(newWin)
  }
}

/** Get the main window */
export function getMainWindow(): BrowserWindow | undefined {
  return _mainWindow && !_mainWindow.isDestroyed() ? _mainWindow : undefined
}

/** Get the dock pet window */
export function getDockPetWindow(): BrowserWindow | undefined {
  return _dockPetWindow && !_dockPetWindow.isDestroyed() ? _dockPetWindow : undefined
}

/** Get the chat popover window */
export function getChatPopoverWindow(): BrowserWindow | undefined {
  return _chatPopoverWindow && !_chatPopoverWindow.isDestroyed() ? _chatPopoverWindow : undefined
}

export { toggleDockPet }

app.whenReady().then(() => {
  loadProjectEnv()

  // Initialize data store
  const seedDir = is.dev
    ? join(__dirname, '../../..', 'web', 'src', 'data')
    : join(process.resourcesPath, 'data')
  initDataFromSeed(seedDir)

  // Create windows
  const mainWindow = createWindow()
  createDockPetWindow()
  createChatPopoverWindow()

  // Register IPC handlers
  registerIpcHandlers(mainWindow)

  // Global shortcut: ⌘⇧A to toggle dock pet
  globalShortcut.register('CommandOrControl+Shift+A', toggleDockPet)

  // Tray icon
  try {
    createTray()
  } catch {
    // Tray creation may fail in some environments
  }

  // Reposition when display changes (dock moved, resolution changed)
  screen.on('display-metrics-changed', () => {
    repositionDockPet()
  })

  app.on('activate', () => {
    if (!getMainWindow()) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
