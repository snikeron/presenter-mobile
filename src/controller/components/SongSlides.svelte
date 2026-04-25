<!--
  Expandable song panel showing all sections and slides.
  Used in both LibraryTab and SetlistTab.
-->
<script lang="ts">
  import { send } from "../lib/ws.js";
  import { appState } from "../lib/state.svelte.js";
  import type { Song } from "$shared/types.js";

  let { song, showAddButton = false }: { song: Song; showAddButton?: boolean } =
    $props();

  const inSetlist = $derived(appState.presentation.setlist.includes(song.id));
  const isCurrentSong = $derived(
    appState.presentation.currentSongId === song.id,
  );

  function displaySlide(slideId: string) {
    send({ type: "display", songId: song.id, slideId });
    appState.activeTab = "controls";
  }

  function toggleSetlist() {
    if (inSetlist) {
      send({ type: "setlist:remove", songId: song.id });
    } else {
      send({ type: "setlist:add", songId: song.id });
    }
  }
</script>

<div class="song-panel" class:current={isCurrentSong}>
  <!-- Song header -->
  <div class="song-header">
    <div class="song-meta">
      <span class="song-title">{song.title}</span>
      {#if song.artist}
        <span class="song-artist">{song.artist}</span>
      {/if}
    </div>
    <div class="song-actions">
      {#if song.sequence}
        <span class="sequence-hint" title="Sequence">{song.sequence}</span>
      {/if}
      <button
        class="setlist-btn"
        class:in-setlist={inSetlist}
        onclick={toggleSetlist}
        title={inSetlist ? "Remove from setlist" : "Add to setlist"}
      >
        {#if inSetlist}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        {:else}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Sections and slides -->
  <div class="sections">
    {#each song.sections as section}
      {#if section.slides.length > 0}
        <div class="section">
          {#if section.label}
            <div class="section-label">{section.label}</div>
          {/if}
          <div class="slides">
            {#each section.slides as slide}
              {@const isActive =
                appState.presentation.currentSlideId === slide.id &&
                isCurrentSong}
              <button
                class="slide"
                class:active={isActive}
                onclick={() => displaySlide(slide.id)}
              >
                {#each slide.lines as line}
                  <span class="line">{line}</span>
                {/each}
                {#if isActive}
                  <span class="live-dot">●</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .song-panel {
    background: var(--surface);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    transition: border-color 0.2s;
  }

  .song-panel.current {
    border-color: var(--primary);
  }

  .song-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--border);
  }

  .song-meta {
    flex: 1;
    min-width: 0;
  }

  .song-title {
    display: block;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-artist {
    display: block;
    font-size: 0.75rem;
    color: var(--text-dim);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .sequence-hint {
    font-size: 0.65rem;
    color: var(--text-dim);
    background: var(--surface-2);
    padding: 2px 7px;
    border-radius: 999px;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .setlist-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .setlist-btn:active {
    transform: scale(0.9);
  }

  .setlist-btn.in-setlist {
    background: var(--primary-dim);
    color: var(--primary);
  }

  .setlist-btn svg {
    width: 16px;
    height: 16px;
  }

  .sections {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    padding: 0 4px;
  }

  .slides {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .slide {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    text-align: left;
    position: relative;
    transition: background 0.2s;
    min-height: 36px;
    border: 1px solid transparent;
  }

  .slide:active {
    background: rgba(124, 111, 255, 0.15);
  }

  .slide.active {
    background: var(--primary-dim);
    border-color: rgba(124, 111, 255, 0.4);
  }

  .line {
    display: block;
    font-size: 0.8rem;
    color: var(--text);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slide.active .line {
    color: #c4bbff;
  }

  .live-dot {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.5rem;
    color: var(--primary);
    animation: pulse 1.75s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
</style>
