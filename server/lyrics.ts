import { createHash } from 'crypto'
import type { Song, Section, Slide } from '../shared/types.js'

function hash(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 12)
}

function tagLabel(char: string, inline: string): { tag: string; label: string } {
  if (char === '0') return { tag: 'chorus', label: inline || 'Chorus' }
  if (char === '/') return { tag: 'bridge', label: inline || 'Bridge' }
  if (char === '*') return { tag: 'coda', label: inline || 'Coda' }
  if (/[1-9]/.test(char)) return { tag: `verse${char}`, label: inline || `Verse ${char}` }
  return { tag: char, label: inline || char }
}

export function parseSong(content: string, filename: string): Song {
  const lines = content.replace(/\r\n|\r/g, '\n').split('\n')
  let i = 0

  const title = lines[i++]?.trim() || filename.replace(/\.txt$/i, '')

  let artist: string | undefined
  if (lines[i] !== undefined && !lines[i].startsWith('.') && lines[i].trim() !== '') {
    artist = lines[i++].trim()
  }

  let copyright: string | undefined
  let sequence: string | undefined
  let ccliNumber: string | undefined

  const sections: Section[] = []
  let currentSection: Section | null = null
  let slideLines: string[] = []
  let primaryLines: string[] | null = null
  let afterSplitter = false

  function flushSlide() {
    const main = primaryLines ?? slideLines
    if (main.length === 0 && !afterSplitter) return

    const slide: Slide = {
      id: hash(filename + ':' + (currentSection?.tag ?? '') + ':' + main.join('\n')),
      lines: [...main],
      sectionTag: currentSection?.tag ?? 'unknown',
      sectionLabel: currentSection?.label ?? '',
    }

    if (primaryLines !== null) {
      slide.primaryLines = [...primaryLines]
      slide.secondaryLines = afterSplitter ? [...slideLines] : []
    }

    if (currentSection) {
      currentSection.slides.push(slide)
    } else {
      // Content before any section tag — create an implicit section
      const implicit: Section = { tag: 'implicit', label: '', slides: [] }
      implicit.slides.push(slide)
      sections.push(implicit)
      currentSection = implicit
    }

    slideLines = []
    primaryLines = null
    afterSplitter = false
  }

  for (; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('.')) {
      const rest = line.slice(1)

      // Bare '.' = blank line within current slide
      if (rest.trim() === '') {
        slideLines.push('')
        continue
      }

      const tagChar = rest[0]
      const tagValue = rest.slice(1).trim()

      if (tagChar === 'i') {
        copyright = tagValue || copyright
        if (tagValue) {
          const m = tagValue.match(/\d{5,}/)
          if (m) ccliNumber = m[0]
        }
        continue
      }

      if (tagChar === 's') { sequence = tagValue; continue }
      if (tagChar === '#') continue // comment

      if (tagChar === '-') {
        // Multi-language splitter
        primaryLines = [...slideLines]
        slideLines = []
        afterSplitter = true
        continue
      }

      if (/[0-9\/\*]/.test(tagChar)) {
        flushSlide()
        const { tag, label } = tagLabel(tagChar, tagValue)
        currentSection = { tag, label, slides: [] }
        sections.push(currentSection)
        continue
      }

      // Unknown tag treated as text
      slideLines.push(line)
    } else if (line.trim() === '') {
      flushSlide()
    } else {
      // Regular content line
      if (/ccli song (no|#)/i.test(line)) {
        const m = line.match(/\d{5,}/)
        if (m) ccliNumber = m[0]
      }
      slideLines.push(line)
    }
  }

  flushSlide()

  const allSlides = sections.flatMap(s => s.slides)

  return {
    id: hash(filename),
    filename,
    title,
    artist,
    copyright,
    ccliNumber,
    sequence,
    sections,
    allSlides,
  }
}
