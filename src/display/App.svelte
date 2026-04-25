<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import type { PresentationState, Song, Slide } from '$shared/types.js'

  let state = $state<PresentationState>({
    setlist: [],
    currentSongId: null,
    currentSlideId: null,
    isBlank: false,
    isBlackout: false,
  })
  let library = $state<Song[]>([])
  let connected = $state(false)

  const currentSong = $derived(library.find(s => s.id === state.currentSongId))
  const currentSlide = $derived(
    currentSong?.allSlides.find(s => s.id === state.currentSlideId)
  )

  // ── Two-layer crossfade ───────────────────────────────────────────────────
  // Layer A and B sit absolutely on top of each other.
  // We load new content into the INACTIVE layer, then flip which is visible.
  // CSS opacity transition does the crossfade — no Svelte transition system needed.
  let layerA = $state<Slide | null>(null)
  let layerB = $state<Slide | null>(null)
  let topLayer = $state<'a' | 'b'>('a')
  let lastSlideId = $state<string | null>(null)

  $effect(() => {
    const slide = !state.isBlank && !state.isBlackout ? currentSlide : undefined

    if (!slide) {
      lastSlideId = null
      return
    }
    if (slide.id === lastSlideId) return

    lastSlideId = slide.id

    if (topLayer === 'a') {
      layerB = slide
      topLayer = 'b'
    } else {
      layerA = slide
      topLayer = 'a'
    }
  })

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws`)

    ws.onopen = () => { connected = true }

    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'init') {
        library = msg.library
        state = msg.state
      } else if (msg.type === 'state') {
        state = msg.state
      } else if (msg.type === 'library') {
        library = msg.songs
      }
    }

    ws.onclose = () => { connected = false; setTimeout(connect, 2000) }
    ws.onerror = () => ws.close()
  }

  onMount(connect)
</script>

<div class="display">
  <!-- Blackout overlay — still uses Svelte fade as it's a single element -->
  {#if state.isBlackout}
    <div class="blackout" transition:fade={{ duration: 400 }}></div>
  {/if}

  <!-- Layer A -->
  <div
    class="layer"
    class:visible={topLayer === 'a' && !state.isBlank && !state.isBlackout && !!currentSlide}
  >
    {#if layerA}
      {#each layerA.lines as line}
        <p class="line">{line}</p>
      {/each}
      {#if layerA.secondaryLines?.length}
        <div class="secondary-block">
          {#each layerA.secondaryLines as line}
            <p class="line secondary">{line}</p>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Layer B -->
  <div
    class="layer"
    class:visible={topLayer === 'b' && !state.isBlank && !state.isBlackout && !!currentSlide}
  >
    {#if layerB}
      {#each layerB.lines as line}
        <p class="line">{line}</p>
      {/each}
      {#if layerB.secondaryLines?.length}
        <div class="secondary-block">
          {#each layerB.secondaryLines as line}
            <p class="line secondary">{line}</p>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Song title watermark (bottom-right) -->
  {#if currentSong && !state.isBlackout && !state.isBlank}
    <div class="song-title-bar">
      <span class="song-title-text">{currentSong.title}</span>
      {#if currentSong.ccliNumber}
        <span class="ccli">CCLI #{currentSong.ccliNumber}</span>
      {/if}
    </div>
  {/if}

  <!-- Connection status (only when disconnected) -->
  {#if !connected}
    <div class="status-pill">
      <span class="status-dot"></span>
      Connecting…
    </div>
  {/if}
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }

  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
  }

  :global(#app) {
    width: 100%;
    height: 100%;
  }

  .display {
    width: 100%;
    height: 100%;
    background: #000;
    position: relative;
    overflow: hidden;
  }

  .blackout {
    position: absolute;
    inset: 0;
    background: #000;
    z-index: 10;
  }

  /* Both layers fill the display and stack on top of each other.
     CSS opacity transition crossfades between them seamlessly. */
  .layer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(0.3rem, 1vh, 0.8rem);
    padding: clamp(2rem, 5vw, 6rem);
    text-align: center;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .layer.visible {
    opacity: 1;
  }

  .line {
    margin: 0;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    font-size: clamp(2rem, 4.5vw, 5rem);
    font-weight: 700;
    color: #ffffff;
    line-height: 1.25;
    text-shadow:
      0 2px 8px rgba(0, 0, 0, 0.8),
      0 4px 20px rgba(0, 0, 0, 0.6);
    letter-spacing: -0.01em;
    width: 100%;
  }

  .secondary-block {
    margin-top: clamp(0.5rem, 2vh, 1.5rem);
    padding-top: clamp(0.5rem, 2vh, 1.5rem);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    gap: clamp(0.2rem, 0.5vh, 0.5rem);
    width: 100%;
  }

  .line.secondary {
    font-size: clamp(1.4rem, 3vw, 3.5rem);
    color: rgba(255, 255, 255, 0.7);
  }

  .song-title-bar {
    position: absolute;
    bottom: clamp(12px, 2vh, 24px);
    right: clamp(12px, 2vw, 32px);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    pointer-events: none;
  }

  .song-title-text {
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    font-size: clamp(0.7rem, 1.2vw, 1.1rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.03em;
  }

  .ccli {
    font-size: clamp(0.55rem, 0.9vw, 0.75rem);
    color: rgba(255, 255, 255, 0.2);
    letter-spacing: 0.04em;
  }

  .status-pill {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 6px 14px;
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    z-index: 5;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 107, 107, 0.8);
    animation: blink 1.2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }
</style>
