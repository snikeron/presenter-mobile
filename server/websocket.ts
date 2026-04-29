import { EventEmitter } from 'events'
import type { WebSocket } from 'ws'
import type { PresentationState, ClientMessage, ServerMessage, Song } from '../shared/types.js'

export const wsEvents = new EventEmitter()

export interface ClientInfo {
  ip: string
  device: string
  connectedAt: string
}

function parseDevice(ua: string): string {
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return /[Tt]ablet|SM-T/.test(ua) ? 'Android Tablet' : 'Android'
  if (/Windows Phone/i.test(ua)) return 'Windows Phone'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Macintosh/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux'
  if (/CrOS/i.test(ua)) return 'Chromebook'
  return 'Device'
}

const clients = new Map<WebSocket, ClientInfo>()

export const state: PresentationState = {
  setlist: [],
  currentSongId: null,
  currentSlideId: null,
  isBlank: false,
  isBlackout: false,
}

let library: Song[] = []

export function setLibrary(songs: Song[]) {
  library = songs
}

export function getConnectionCount(): number {
  return clients.size
}

function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')
}

export function getConnectedClients(): ClientInfo[] {
  return Array.from(clients.values()).filter(c => !isLoopback(c.ip))
}

export function registerClient(ws: WebSocket, meta: { ip: string; userAgent: string }) {
  clients.set(ws, {
    ip: meta.ip,
    device: parseDevice(meta.userAgent),
    connectedAt: new Date().toISOString(),
  })
  wsEvents.emit('connection-count', clients.size)

  send(ws, { type: 'init', state: { ...state }, library })

  ws.on('close', () => {
    clients.delete(ws)
    wsEvents.emit('connection-count', clients.size)
  })

  ws.on('message', (data) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString())
      handleMessage(msg)
    } catch {
      // malformed message — ignore
    }
  })
}

function handleMessage(msg: ClientMessage) {
  switch (msg.type) {
    case 'display': {
      state.currentSongId = msg.songId
      state.currentSlideId = msg.slideId
      break
    }
    case 'blank': {
      state.isBlank = msg.value
      break
    }
    case 'blackout': {
      state.isBlackout = msg.value
      break
    }
    case 'next': {
      navigateSlide(1)
      break
    }
    case 'prev': {
      navigateSlide(-1)
      break
    }
    case 'setlist:add': {
      if (!state.setlist.includes(msg.songId)) {
        state.setlist = [...state.setlist, msg.songId]
      }
      break
    }
    case 'setlist:remove': {
      state.setlist = state.setlist.filter(id => id !== msg.songId)
      if (state.currentSongId === msg.songId) {
        state.currentSongId = null
        state.currentSlideId = null
      }
      break
    }
    case 'setlist:reorder': {
      state.setlist = msg.songIds
      break
    }
    case 'setlist:clear': {
      state.setlist = []
      state.currentSongId = null
      state.currentSlideId = null
      break
    }
    case 'library:reload': {
      broadcast({ type: 'library', songs: library })
      return
    }
  }

  broadcastState()
}

function navigateSlide(delta: number) {
  if (!state.currentSongId || !state.currentSlideId) return

  const song = library.find(s => s.id === state.currentSongId)
  if (!song) return

  const idx = song.allSlides.findIndex(s => s.id === state.currentSlideId)
  if (idx === -1) return

  const next = idx + delta
  if (next >= 0 && next < song.allSlides.length) {
    state.currentSlideId = song.allSlides[next].id
  }
}

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg)
  for (const ws of clients.keys()) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(data)
    }
  }
}

export function broadcastState() {
  broadcast({ type: 'state', state: { ...state } })
}

export function broadcastLibrary(songs: Song[]) {
  library = songs
  broadcast({ type: 'library', songs })
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}
