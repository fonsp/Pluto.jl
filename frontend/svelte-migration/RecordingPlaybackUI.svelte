<script>
    import _ from "../imports/lodash.js"
    import { html } from "../imports/Preact.js"
    import { AudioPlayer } from "../components/AudioPlayer.js"
    import { base64_arraybuffer, blob_url_to_data_url } from "../common/PlutoHash.js"
    import { pack, unpack } from "../common/MsgPack.js"
    import { t, th } from "../common/lang.js"
    import { onMount, createEventDispatcher } from "svelte"

    export let recording_url
    export let audio_url

    let current_step = 0
    let recording_data = null
    let audio_ref = null
    let playing = false
    let paused = false
    let scroll_handler = null

    const dispatch = createEventDispatcher()

    onMount(async () => {
        if (recording_url != null) {
            try {
                recording_data = unpack(new Uint8Array(await (await fetch(recording_url)).arrayBuffer()))
            } catch (e) {
                console.error("Failed to load recording data:", e)
            }
        }
    })

    const play = () => {
        if (recording_data == null) return
        
        playing = true
        paused = false
        current_step = 0
        
        const start_time = Date.now()
        
        const apply_step = (step) => {
            if (step[1] != null) {
                dispatch("apply_patches", { patches: step[1] })
            }
        }
        
        const apply_scroll = (scroll) => {
            const cell = document.getElementById(scroll[1].cell_id)
            if (cell != null) {
                const target_y = cell.offsetTop + cell.offsetHeight * scroll[1].relative_distance - window.innerHeight / 2
                window.scrollTo({ top: target_y, behavior: "smooth" })
            }
        }
        
        const tick = () => {
            if (!playing || paused) return
            
            const elapsed = (Date.now() - start_time) / 1000
            
            // Apply steps
            while (current_step < recording_data.steps.length && recording_data.steps[current_step][0] <= elapsed) {
                apply_step(recording_data.steps[current_step])
                current_step++
            }
            
            // Apply scrolls
            for (const scroll of recording_data.scrolls) {
                if (Math.abs(scroll[0] - elapsed) < 0.1) {
                    apply_scroll(scroll)
                }
            }
            
            if (current_step < recording_data.steps.length) {
                requestAnimationFrame(tick)
            } else {
                playing = false
            }
        }
        
        // Apply initial state
        if (recording_data.steps.length > 0) {
            apply_step(recording_data.steps[0])
        }
        
        tick()
    }

    const pause = () => {
        paused = !paused
        if (!paused && playing) {
            // Resume playback
            play()
        }
    }

    const stop = () => {
        playing = false
        paused = false
        current_step = 0
    }
</script>

{#if recording_data != null}
    <div class="recording-playback-ui">
        <div class="playback-controls">
            <button on:click={play} disabled={playing}>
                <span class="play-icon pluto-icon"></span>
                {th("t_recording_ui_play")}
            </button>
            <button on:click={pause} disabled={!playing}>
                <span class="pause-icon pluto-icon"></span>
                {paused ? th("t_recording_ui_resume") : th("t_recording_ui_pause")}
            </button>
            <button on:click={stop} disabled={!playing}>
                <span class="stop-icon pluto-icon"></span>
                {th("t_recording_ui_stop")}
            </button>
        </div>
        
        {#if audio_url != null}
            <div class="audio-player-container">
                {@html html`<${AudioPlayer} 
                    src=${audio_url} 
                    controls 
                    ref=${(ref) => audio_ref = ref}
                />`}
            </div>
        {/if}
        
        <div class="recording-info">
            <span>{th("t_recording_ui_steps")}: {recording_data.steps.length}</span>
            <span>{th("t_recording_ui_scrolls")}: {recording_data.scrolls.length}</span>
        </div>
    </div>
{/if}

<style>
    .recording-playback-ui {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        min-width: 300px;
    }

    .playback-controls {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .playback-controls button {
        background: #444;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.2s;
    }

    .playback-controls button:hover:not(:disabled) {
        background: #555;
    }

    .playback-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .audio-player-container {
        margin-bottom: 1rem;
    }

    .recording-info {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
        opacity: 0.8;
    }

    .pluto-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .play-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M8 5v14l11-7z'/%3E%3C/svg%3E");
    }

    .pause-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'/%3E%3C/svg%3E");
    }

    .stop-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M6 6h12v12H6z'/%3E%3C/svg%3E");
    }
</style>