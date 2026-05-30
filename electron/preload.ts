import { contextBridge, ipcRenderer } from 'electron'

interface DisplayInfo {
  id: number
  label: string
  isPrimary: boolean
  isCurrent: boolean
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
}

contextBridge.exposeInMainWorld('electronAPI', {
  getServerInfo: (): Promise<{ port: number; localIp: string | null }> =>
    ipcRenderer.invoke('get-server-info'),

  getConfig: (): Promise<{ lyricsDir: string }> =>
    ipcRenderer.invoke('get-config'),

  selectLyricsFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-lyrics-folder'),

  setLyricsDir: (dir: string): Promise<number> =>
    ipcRenderer.invoke('set-lyrics-dir', dir),

  getDisplayVisible: (): Promise<boolean> => ipcRenderer.invoke('get-display-visible'),
  showDisplay: (): void => ipcRenderer.send('show-display'),
  hideDisplay: (): void => ipcRenderer.send('hide-display'),

  getDisplays: (): Promise<DisplayInfo[]> =>
    ipcRenderer.invoke('get-displays'),

  moveDisplayTo: (displayId: number): Promise<boolean> =>
    ipcRenderer.invoke('move-display-to', displayId),

  identifyDisplays: (): Promise<void> =>
    ipcRenderer.invoke('identify-displays'),

  onConnectionCount: (callback: (count: number) => void): (() => void) => {
    const handler = (_: unknown, count: number) => callback(count)
    ipcRenderer.on('connection-count', handler)
    return () => ipcRenderer.removeListener('connection-count', handler)
  },

  onDisplaysChanged: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('displays-changed', handler)
    return () => ipcRenderer.removeListener('displays-changed', handler)
  },
})
