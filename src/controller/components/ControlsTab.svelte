<script lang="ts">
  import { send } from '../lib/ws.js'
  import { appState } from '../lib/state.svelte.js'

  const currentSong = $derived(appState.currentSong)
  const currentSlide = $derived(appState.currentSlide)

  const currentSlideIndex = $derived(
    currentSong?.allSlides.findIndex(s => s.id === appState.presentation.currentSlideId) ?? -1
  )
  const totalSlides = $derived(currentSong?.allSlides.length ?? 0)

  const canPrev = $derived(currentSlideIndex > 0)
  const canNext = $derived(currentSlideIndex < totalSlides - 1)

  function prev() { send({ type: 'prev' }) }
  function next() { send({ type: 'next' }) }
  function toggleBlank() { send({ type: 'blank', value: !appState.presentation.isBlank }) }
  function toggleBlackout() { send({ type: 'blackout', value: !appState.presentation.isBlackout }) }
</script>

<div class="controls">
  <!-- Now playing info -->
  <div class="now-playing">
    {#if currentSong}
      <span class="np-label">Now on display</span>
      <span class="np-song">{currentSong.title}</span>
      {#if currentSlide}
        <span class="np-section">{currentSlide.sectionLabel}</span>
      {/if}
    {:else}
      <span class="np-label">Nothing displayed</span>
      <span class="np-hint">Select a slide from Library or Setlist</span>
    {/if}
  </div>

  <!-- Current slide preview -->
  <div class="slide-preview" class:blank={appState.presentation.isBlank} class:blackout={appState.presentation.isBlackout}>
    {#if appState.presentation.isBlackout}
      <span class="overlay-label blackout-label">BLACKOUT</span>
    {:else if appState.presentation.isBlank}
      <span class="overlay-label blank-label">BLANK</span>
    {:else if currentSlide}
      {#each currentSlide.lines as line}
        <span class="preview-line">{line}</span>
      {/each}
    {:else}
      <span class="preview-empty">No slide selected</span>
    {/if}
  </div>

  <!-- Slide navigation -->
  {#if currentSong}
    <div class="nav-bar">
      <button
        class="nav-btn"
        class:disabled={!canPrev}
        onclick={prev}
        disabled={!canPrev}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </button>

      <span class="slide-counter">
        {currentSlideIndex >= 0 ? currentSlideIndex + 1 : '—'} / {totalSlides}
      </span>

      <button
        class="nav-btn next"
        class:disabled={!canNext}
        onclick={next}
        disabled={!canNext}
      >
        Next
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Display toggles -->
  <div class="toggle-grid">
    <button
      class="toggle-btn"
      class:active={appState.presentation.isBlank}
      onclick={toggleBlank}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
      <span>{appState.presentation.isBlank ? 'Show Lyrics' : 'Blank Screen'}</span>
    </button>

    <button
      class="toggle-btn danger"
      class:active={appState.presentation.isBlackout}
      onclick={toggleBlackout}
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <rect width="24" height="24" rx="2" />
      </svg>
      <span>{appState.presentation.isBlackout ? 'Restore' : 'Blackout'}</span>
    </button>
  </div>

  <!-- All slides for current song (quick jump) -->
  {#if currentSong}
    <div class="quick-jump">
      <div class="qj-label">All slides — {currentSong.title}</div>
      <div class="qj-list">
        {#each currentSong.sections as section}
          {#if section.slides.length > 0}
            <div class="qj-section">
              {#if section.label}
                <div class="qj-section-label">{section.label}</div>
              {/if}
              {#each section.slides as slide}
                {@const isActive =
                  appState.presentation.currentSlideId === slide.id &&
                  appState.presentation.currentSongId === currentSong.id}
                <button
                  class="qj-slide"
                  class:active={isActive}
                  onclick={() => send({ type: 'display', songId: currentSong.id, slideId: slide.id })}
                >
                  {slide.lines[0] ?? '…'}
                </button>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }

  .now-playing {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 12px 14px;
    background: var(--surface);
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .np-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }

  .np-song {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
  }

  .np-section {
    font-size: 0.75rem;
    color: var(--primary);
  }

  .np-hint {
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  .slide-preview {
    background: #090909;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    min-height: 130px;
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 20px 16px;
    transition: background 0.3s;
    box-sizing: border-box;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .slide-preview.blank {
    background: #0e0e0e;
  }

  .slide-preview.blackout {
    background: #000;
  }

  .preview-line {
    display: block;
    width: 100%;
    font-size: 0.95rem;
    color: #fff;
    text-align: center;
    line-height: 1.4;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .preview-empty {
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  .overlay-label {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .blank-label { color: var(--text-dim); }
  .blackout-label { color: var(--danger); }

  .nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    transition: all 0.1s;
  }

  .nav-btn:active:not(:disabled) {
    background: var(--surface-2);
    transform: scale(0.97);
  }

  .nav-btn.disabled {
    opacity: 0.35;
  }

  .nav-btn svg {
    width: 18px;
    height: 18px;
  }

  .slide-counter {
    font-size: 0.8rem;
    color: var(--text-dim);
    white-space: nowrap;
    min-width: 50px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .toggle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .toggle-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 16px 12px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-dim);
    transition: all 0.15s;
  }

  .toggle-btn svg {
    width: 24px;
    height: 24px;
  }

  .toggle-btn:active {
    transform: scale(0.96);
  }

  .toggle-btn.active {
    background: var(--primary-dim);
    border-color: rgba(232, 160, 32, 0.4);
    color: var(--primary);
    box-shadow: 0 0 12px var(--primary-glow);
  }

  .toggle-btn.danger.active {
    background: rgba(224, 79, 79, 0.12);
    border-color: rgba(224, 79, 79, 0.45);
    color: var(--danger);
    box-shadow: 0 0 12px rgba(224, 79, 79, 0.2);
  }

  .quick-jump {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    width: 100%;
  }

  .qj-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    padding: 0 2px;
  }

  .qj-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .qj-section {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .qj-section-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    font-weight: 700;
    padding: 0 2px;
  }

  .qj-slide {
    width: 100%;
    min-width: 0;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    border: 1px solid var(--border);
    text-align: left;
    font-size: 0.82rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.1s;
    box-sizing: border-box;
  }

  .qj-slide:active {
    background: var(--surface-2);
  }

  .qj-slide.active {
    background: var(--primary-dim);
    border-color: rgba(232, 160, 32, 0.35);
    color: var(--primary);
    box-shadow: inset 3px 0 0 var(--primary);
  }
</style>
