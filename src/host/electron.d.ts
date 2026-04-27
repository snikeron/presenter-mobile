interface ElectronAPI {
  getServerInfo: () => Promise<{ port: number; localIp: string | null }>
  getConfig: () => Promise<{ lyricsDir: string }>
  selectLyricsFolder: () => Promise<string | null>
  setLyricsDir: (dir: string) => Promise<number>
  getDisplayVisible: () => Promise<boolean>
  showDisplay: () => void
  hideDisplay: () => void
  onConnectionCount: (callback: (count: number) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
