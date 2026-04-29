import type { Song, PresentationState } from '$shared/types.js'

class AppState {
  library = $state<Song[]>([])
  presentation = $state<PresentationState>({
    setlist: [],
    currentSongId: null,
    currentSlideId: null,
    isBlank: false,
    isBlackout: false,
  })
  connected = $state(false)
  searchQuery = $state('')

  get currentSong(): Song | undefined {
    return this.library.find(s => s.id === this.presentation.currentSongId)
  }

  get currentSlide() {
    return this.currentSong?.allSlides.find(
      s => s.id === this.presentation.currentSlideId
    )
  }

  get setlistSongs(): Song[] {
    return this.presentation.setlist
      .map(id => this.library.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined)
  }

  get filteredLibrary(): Song[] {
    const q = this.searchQuery.toLowerCase().trim()
    if (!q) return this.library
    return this.library.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.allSlides.some(slide => slide.lines.some(l => l.toLowerCase().includes(q)))
    )
  }
}

export const appState = new AppState()
