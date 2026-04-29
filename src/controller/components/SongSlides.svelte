<!--
  Expandable song panel showing all sections and slides.
  Used in both LibraryTab and SetlistTab.
-->
<script lang="ts">
  import { send } from "../lib/ws.js";
  import { appState } from "../lib/state.svelte.js";
  import type { Song } from "$shared/types.js";

  let { song }: { song: Song } = $props();

  const isCurrentSong = $derived(appState.presentation.currentSongId === song.id);

  function displaySlide(slideId: string) {
    send({ type: "display", songId: song.id, slideId });
    appState.activeTab = "controls";
  }
</script>

{#if song.sequence}
  <div class="song-header">
    <span class="seq-badge">{song.sequence}</span>
  </div>
{/if}

<div class="sections">
  {#each song.sections as section}
    {#if section.slides.length > 0}
      <div class="section">
        {#if section.label}
          <div class="section-label">{section.label}</div>
        {/if}
        <div class="slides">
          {#each section.slides as slide}
            {@const isActive = appState.presentation.currentSlideId === slide.id && isCurrentSong}
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

<style>
  .song-header {
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--border);
  }

  .seq-badge {
    font-size: 0.65rem;
    color: var(--text-dim);
    background: var(--surface-2);
    padding: 2px 8px;
    border-radius: 999px;
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sections {
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
    background: var(--primary-dim);
  }

  .slide.active {
    background: var(--primary-dim);
    border-color: rgba(232, 160, 32, 0.35);
    box-shadow: inset 3px 0 0 var(--primary);
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
    color: var(--primary);
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
