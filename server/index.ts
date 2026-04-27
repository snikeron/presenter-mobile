import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { startServer } from './app.js'
import { loadLibrary, getLyricsDir } from './library.js'
import { printBanner, printLibraryInfo, printUrls, warnNoLocalIp } from './cli.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')

printBanner()

const { port, localIp } = await startServer({
  port: parseInt(process.env.PORT ?? '80'),
  host: process.env.HOST ?? '0.0.0.0',
  lyricsDir: process.env.LYRICS_DIR,
  distPath: DIST,
  isDev: process.env.NODE_ENV === 'development',
})

// loadLibrary() returns from cache — startServer already loaded it
const songs = await loadLibrary()
printLibraryInfo(songs.length, getLyricsDir())

if (!localIp) warnNoLocalIp()
await printUrls(port, localIp)
