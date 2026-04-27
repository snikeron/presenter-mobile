import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { resolve, extname } from 'path'
import { readFile } from 'fs/promises'
import { loadLibrary, getLyricsDir, invalidateCache, setLyricsDir } from './library.js'
import { registerClient, setLibrary, broadcastLibrary, getConnectionCount } from './websocket.js'
import { startMdns } from './mdns.js'
import { warnPortFallback } from './cli.js'

export interface ServerConfig {
  port?: number
  host?: string
  lyricsDir?: string
  distPath: string
  isDev?: boolean
}

export interface ServerResult {
  port: number
  localIp: string | null
  /** Call this to hot-swap the lyrics folder at runtime */
  changeLyricsDir: (dir: string) => Promise<number>
}

export async function startServer(config: ServerConfig): Promise<ServerResult> {
  const {
    port: preferredPort = 80,
    host = '0.0.0.0',
    distPath,
    isDev = false,
  } = config

  if (config.lyricsDir) setLyricsDir(config.lyricsDir)

  const fastify = Fastify({ logger: { level: 'error' } })

  await fastify.register(fastifyCors, { origin: true })
  await fastify.register(fastifyWebsocket)

  // ── REST API ────────────────────────────────────────────────────────────────

  fastify.get('/api/library', async () => loadLibrary())

  fastify.post('/api/library/reload', async () => {
    invalidateCache()
    const songs = await loadLibrary(true)
    broadcastLibrary(songs)
    return { count: songs.length }
  })

  fastify.get('/api/status', async () => ({
    port: activePort,
    lyricsDir: getLyricsDir(),
    connectionCount: getConnectionCount(),
  }))

  // ── WebSocket ───────────────────────────────────────────────────────────────

  fastify.get('/ws', { websocket: true }, (socket) => {
    registerClient(socket as any)
  })

  // ── Static / SPA ────────────────────────────────────────────────────────────

  if (!isDev) {
    const DIST = distPath

    await fastify.register(fastifyStatic, {
      root: resolve(DIST, 'assets'),
      prefix: '/assets/',
      decorateReply: true,
    })

    async function serveHtml(filename: string, reply: any) {
      try {
        const html = await readFile(resolve(DIST, filename), 'utf-8')
        reply.type('text/html').send(html)
      } catch {
        reply.code(404).send('Not found — did you run `npm run build`?')
      }
    }

    fastify.get('/', (_, reply) => serveHtml('index.html', reply))
    fastify.get('/display', (_, reply) => serveHtml('display.html', reply))
    fastify.get('/display/', (_, reply) => serveHtml('display.html', reply))

    const MIME: Record<string, string> = {
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.png': 'image/png',
      '.webmanifest': 'application/manifest+json',
      '.json': 'application/json',
      '.txt': 'text/plain',
    }

    fastify.get('/:file', async (req: any, reply) => {
      const file: string = req.params.file
      const mime = MIME[extname(file)]
      if (!mime) return reply.callNotFound()
      try {
        reply.type(mime).send(await readFile(resolve(DIST, file)))
      } catch {
        reply.callNotFound()
      }
    })

    fastify.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/api/') || req.url.startsWith('/assets/')) {
        return reply.code(404).send({ error: 'Not Found' })
      }
      serveHtml('index.html', reply)
    })
  }

  // ── Load library ────────────────────────────────────────────────────────────

  try {
    const songs = await loadLibrary()
    setLibrary(songs)
  } catch (err) {
    console.warn('Failed to load library:', err)
  }

  // ── Listen with port fallback ────────────────────────────────────────────────

  let activePort = preferredPort

  const candidates =
    preferredPort === 80
      ? [80, 8080, 8081, 8082]
      : Array.from({ length: 10 }, (_, i) => preferredPort + i)

  for (const port of candidates) {
    try {
      await fastify.listen({ port, host })
      activePort = port
      break
    } catch (err: any) {
      const retryable = err?.code === 'EADDRINUSE' || err?.code === 'EACCES'
      if (retryable && port !== candidates[candidates.length - 1]) {
        warnPortFallback(port, candidates[candidates.indexOf(port) + 1])
        continue
      }
      throw err
    }
  }

  const localIp = startMdns(activePort)

  async function changeLyricsDir(dir: string): Promise<number> {
    setLyricsDir(dir)
    const songs = await loadLibrary(true)
    setLibrary(songs)
    broadcastLibrary(songs)
    return songs.length
  }

  return { port: activePort, localIp, changeLyricsDir }
}
