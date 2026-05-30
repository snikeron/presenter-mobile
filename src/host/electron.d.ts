interface DisplayInfo {
  id: number
  label: string
  isPrimary: boolean
  isCurrent: boolean
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
}

interface ElectronAPI {
  getServerInfo: () => Promise<{ port: number; localIp: string | null }>
  getConfig: () => Promise<{ lyricsDir: string }>
  selectLyricsFolder: () => Promise<string | null>
  setLyricsDir: (dir: string) => Promise<number>
  getDisplayVisible: () => Promise<boolean>
  showDisplay: () => void
  hideDisplay: () => void
  getDisplays: () => Promise<DisplayInfo[]>
  moveDisplayTo: (displayId: number) => Promise<boolean>
  identifyDisplays: () => Promise<void>
  onConnectionCount: (callback: (count: number) => void) => () => void
  onDisplaysChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
