import { app, BrowserWindow, ipcMain, dialog, screen, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile, writeFile, mkdir, copyFile, readdir, access } from 'fs/promises'
import { startServer } from '../server/app.js'
import { wsEvents } from '../server/websocket.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// dist/ is one level up from dist/electron/ where this file is bundled
const DIST = join(__dirname, '..')
const ICON_PATH = join(DIST, 'icon.png')

// ── Config ──────────────────────────────────────────────────────────────────

interface Config {
  lyricsDir: string
}

const CONFIG_PATH = join(app.getPath('userData'), 'config.json')

async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as Config
  } catch {
    return { lyricsDir: join(app.getPath('userData'), 'lyrics') }
  }
}

async function saveConfig(config: Config): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

async function ensureLyricsDir(dir: string): Promise<void> {
  try {
    await access(dir)
  } catch {
    await mkdir(dir, { recursive: true })
    const bundled = app.isPackaged
      ? join(process.resourcesPath, 'lyrics')
      : join(DIST, '..', 'lyrics')
    try {
      const files = await readdir(bundled)
      for (const f of files.filter(f => f.endsWith('.txt'))) {
        await copyFile(join(bundled, f), join(dir, f))
      }
    } catch { /* No bundled lyrics — that's fine */ }
  }
}

// ── Windows ──────────────────────────────────────────────────────────────────

let hostWindow: BrowserWindow | null = null
let displayWindow: BrowserWindow | null = null
let changeLyricsDir: ((dir: string) => Promise<number>) | null = null
let closeServer: (() => Promise<void>) | null = null
let activePort = 80
let activeLocalIp: string | null = null
let currentDisplayId: number | null = null

function getAppIcon() {
  try {
    return nativeImage.createFromPath(ICON_PATH)
  } catch {
    return undefined
  }
}

function createHostWindow() {
  const icon = getAppIcon()
  hostWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 420,
    minHeight: 560,
    title: 'PraisePresenter',
    backgroundColor: '#0d0d14',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  hostWindow.setMenuBarVisibility(false)
  hostWindow.loadFile(join(DIST, 'host.html'))
  // Host window is the app's primary window — closing it quits the whole app,
  // even if a hidden display window still exists as a BrowserWindow object.
  hostWindow.on('closed', () => {
    hostWindow = null
    app.quit()
  })

  // Ctrl+Shift+I opens DevTools in any build — remove after debugging
  hostWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      hostWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })
}

function createDisplayWindow(displayId?: number) {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()

  let target: Electron.Display
  if (displayId != null) {
    target = displays.find(d => d.id === displayId) ?? primary
  } else if (currentDisplayId != null) {
    target = displays.find(d => d.id === currentDisplayId) ?? displays.find(d => d.id !== primary.id) ?? primary
  } else {
    target = displays.find(d => d.id !== primary.id) ?? primary
  }

  currentDisplayId = target.id
  const icon = getAppIcon()

  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    backgroundColor: '#000000',
    ...(icon ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  displayWindow.setMenuBarVisibility(false)
  displayWindow.loadURL(`http://localhost:${activePort}/display`)
  displayWindow.on('closed', () => { displayWindow = null })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const config = await loadConfig()
  await ensureLyricsDir(config.lyricsDir)

  const result = await startServer({
    distPath: DIST,
    lyricsDir: config.lyricsDir,
    isDev: false,
  })

  activePort = result.port
  activeLocalIp = result.localIp
  changeLyricsDir = result.changeLyricsDir
  closeServer = result.close

  wsEvents.on('connection-count', (count: number) => {
    hostWindow?.webContents.send('connection-count', count)
  })

  const notifyDisplaysChanged = () => hostWindow?.webContents.send('displays-changed')
  screen.on('display-added', notifyDisplaysChanged)
  screen.on('display-removed', notifyDisplaysChanged)
  screen.on('display-metrics-changed', notifyDisplaysChanged)

  createHostWindow()

  // Only auto-launch display if a secondary monitor is connected —
  // on single-monitor setups the fullscreen takeover would confuse the operator
  const hasSecondary = screen.getAllDisplays().length > 1
  if (hasSecondary) createDisplayWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

let _quitting = false
app.on('will-quit', (event) => {
  if (_quitting) return
  _quitting = true
  if (closeServer) {
    event.preventDefault()
    closeServer().finally(() => app.quit())
  }
})

app.on('activate', () => {
  if (!hostWindow) createHostWindow()
})

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-server-info', () => ({
  port: activePort,
  localIp: activeLocalIp,
}))

ipcMain.handle('get-config', async () => loadConfig())

ipcMain.handle('select-lyrics-folder', async () => {
  if (!hostWindow) return null
  const result = await dialog.showOpenDialog(hostWindow, {
    title: 'Select Lyrics Folder',
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('set-lyrics-dir', async (_, dir: string) => {
  const config = await loadConfig()
  config.lyricsDir = dir
  await saveConfig(config)
  return await changeLyricsDir?.(dir) ?? 0
})

ipcMain.handle('get-display-visible', () => {
  return displayWindow !== null && !displayWindow.isDestroyed() && displayWindow.isVisible()
})

ipcMain.on('show-display', () => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.show()
  } else {
    createDisplayWindow(currentDisplayId ?? undefined)
  }
})

ipcMain.on('hide-display', () => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.hide()
  }
})

ipcMain.handle('get-displays', () => {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  return displays.map((d, i) => ({
    id: d.id,
    label: d.label || `Display ${i + 1}`,
    isPrimary: d.id === primary.id,
    isCurrent: d.id === currentDisplayId && displayWindow != null && !displayWindow.isDestroyed(),
    bounds: d.bounds,
    scaleFactor: d.scaleFactor,
  }))
})

ipcMain.handle('move-display-to', async (_, displayId: number) => {
  const displays = screen.getAllDisplays()
  const target = displays.find(d => d.id === displayId)
  if (!target) return false

  currentDisplayId = displayId

  if (displayWindow && !displayWindow.isDestroyed()) {
    const wasFullScreen = displayWindow.isFullScreen()
    if (wasFullScreen) displayWindow.setFullScreen(false)
    await new Promise<void>(resolve => setTimeout(resolve, wasFullScreen ? 250 : 0))
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.setBounds(target.bounds)
      if (wasFullScreen) displayWindow.setFullScreen(true)
    }
  }
  return true
})

ipcMain.handle('identify-displays', () => {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const wins: BrowserWindow[] = []

  for (let i = 0; i < displays.length; i++) {
    const d = displays[i]
    const num = i + 1
    const label = d.id === primary.id ? `Display ${num} · Primary` : `Display ${num}`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:100%;height:100%}body{background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,'Segoe UI',sans-serif;color:#fff;user-select:none}.n{font-size:min(28vw,28vh);font-weight:900;line-height:1;text-shadow:0 0 80px rgba(255,255,255,.15)}.l{font-size:min(2.5vw,2.5vh);opacity:.55;margin-top:.6em;letter-spacing:.04em}</style></head><body><div class="n">${num}</div><div class="l">${label}</div></body></html>`

    const win = new BrowserWindow({
      x: d.bounds.x,
      y: d.bounds.y,
      width: d.bounds.width,
      height: d.bounds.height,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      backgroundColor: '#000000',
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })
    win.setMenuBarVisibility(false)
    win.setIgnoreMouseEvents(true)
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    wins.push(win)
  }

  setTimeout(() => {
    for (const w of wins) {
      if (!w.isDestroyed()) w.close()
    }
  }, 3000)
})
