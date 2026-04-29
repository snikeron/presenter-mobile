import { appState } from './state.svelte.js'
import type { ServerMessage, ClientMessage } from '$shared/types.js'

let ws: WebSocket | null = null
let retryDelay = 1000
let wsUrl = ''

export function connect(port: number) {
  wsUrl = `ws://localhost:${port}/ws`
  wsConnect()
}

function wsConnect() {
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    appState.connected = true
    retryDelay = 1000
  }

  ws.onmessage = (event: MessageEvent) => {
    const msg: ServerMessage = JSON.parse(event.data as string)
    if (msg.type === 'init') {
      appState.library = msg.library
      appState.presentation = msg.state
    } else if (msg.type === 'state') {
      appState.presentation = msg.state
    } else if (msg.type === 'library') {
      appState.library = msg.songs
    }
  }

  ws.onclose = () => {
    appState.connected = false
    ws = null
    setTimeout(() => {
      retryDelay = Math.min(retryDelay * 1.5, 10000)
      wsConnect()
    }, retryDelay)
  }

  ws.onerror = () => ws?.close()
}

export function send(msg: ClientMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}
