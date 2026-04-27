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
let activePort = 80
let activeLocalIp: string | null = null

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
    width: 440,
    height: 700,
    resizable: false,
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
  hostWindow.on('closed', () => { hostWindow = null })

  // Ctrl+Shift+I opens DevTools in any build — remove after debugging
  hostWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      hostWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })
}

function createDisplayWindow() {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const secondary = displays.find(d => d.id !== primary.id)
  const target = secondary ?? primary
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

  wsEvents.on('connection-count', (count: number) => {
    hostWindow?.webContents.send('connection-count', count)
  })

  createHostWindow()

  // Only auto-launch display if a secondary monitor is connected —
  // on single-monitor setups the fullscreen takeover would confuse the operator
  const hasSecondary = screen.getAllDisplays().length > 1
  if (hasSecondary) createDisplayWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
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
    createDisplayWindow()
  }
})

ipcMain.on('hide-display', () => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.hide()
  }
})
