export interface Slide {
  id: string
  lines: string[]
  primaryLines?: string[]
  secondaryLines?: string[]
  sectionTag: string
  sectionLabel: string
}

export interface Section {
  tag: string
  label: string
  slides: Slide[]
}

export interface Song {
  id: string
  filename: string
  title: string
  artist?: string
  copyright?: string
  ccliNumber?: string
  sequence?: string
  sections: Section[]
  allSlides: Slide[]
}

export interface PresentationState {
  setlist: string[]
  currentSongId: string | null
  currentSlideId: string | null
  isBlank: boolean
  isBlackout: boolean
}

// Server → Client
export type ServerMessage =
  | { type: 'init'; state: PresentationState; library: Song[] }
  | { type: 'state'; state: PresentationState }
  | { type: 'library'; songs: Song[] }

// Client → Server
export type ClientMessage =
  | { type: 'display'; songId: string; slideId: string }
  | { type: 'blank'; value: boolean }
  | { type: 'blackout'; value: boolean }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'setlist:add'; songId: string }
  | { type: 'setlist:remove'; songId: string }
  | { type: 'setlist:reorder'; songIds: string[] }
  | { type: 'setlist:clear' }
  | { type: 'library:reload' }
