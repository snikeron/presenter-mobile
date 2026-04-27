import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { parseSong } from './lyrics.js'
import type { Song } from '../shared/types.js'

let lyricsDir = process.env.LYRICS_DIR ?? join(process.cwd(), 'lyrics')
let cache: Song[] | null = null

export function setLyricsDir(dir: string) {
  lyricsDir = dir
  cache = null
}

export function getLyricsDir(): string {
  return lyricsDir
}

export async function loadLibrary(forceReload = false): Promise<Song[]> {
  if (cache && !forceReload) return cache
  cache = await scanDir(lyricsDir)
  return cache
}

export function invalidateCache() {
  cache = null
}

async function scanDir(dir: string): Promise<Song[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }

  const songs: Song[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const info = await stat(fullPath).catch(() => null)
    if (!info) continue

    if (info.isDirectory()) {
      songs.push(...await scanDir(fullPath))
    } else if (extname(entry).toLowerCase() === '.txt') {
      const content = await readFile(fullPath, 'utf-8').catch(() => null)
      if (content) {
        songs.push(parseSong(content, basename(entry, '.txt')))
      }
    }
  }

  return songs.sort((a, b) => a.title.localeCompare(b.title))
}
