<script>
    import _ from "../imports/lodash.js"
    import { createSilentAudio, create_recorder } from "../common/AudioRecording.js"
    import { html } from "../imports/Preact.js"
    import { AudioPlayer } from "../components/AudioPlayer.js"
    import immer from "../imports/immer.js"
    import { base64_arraybuffer, blob_url_to_data_url } from "../common/PlutoHash.js"
    import { pack, unpack } from "../common/MsgPack.js"
    import { t, th } from "../common/lang.js"
    import { onMount, onDestroy, createEventDispatcher } from "svelte"

    const assert_response_ok = (/** @type {Response} */ r) => (r.ok ? r : Promise.reject(r))
    let run = (x) => x()

    /**
     * @typedef {[number, Array?]} PatchStep
     */

    /**
     * @typedef {Object} RecordingData
     * @property {Array<PatchStep>} steps
     * @property {Array<[number, {cell_id: string, relative_distance: number}]>} scrolls
     */

    /**
     * @typedef {RecordingData & {
     *   initial_html: string,
     * scroll_handler: (x: number) => void,
     * audio_recorder: {start: () => void, stop: () => Promise<string>}?
     * }} RecordingState
     */

    // Props
    export let notebook_name
    export let is_recording
    export let recording_waiting_to_start
    export let set_recording_states
    export let patch_listeners
    export let export_url

    // State
    let current_recording_ref = null
    let recording_start_time_ref = 0

    const dispatch = createEventDispatcher()

    onMount(() => {
        let listener = (patches) => {
            if (current_recording_ref != null) {
                current_recording_ref.steps = [
                    ...current_recording_ref.steps,
                    [(Date.now() - recording_start_time_ref) / 1000, patches],
                ]
            }
        }

        patch_listeners.push(listener)

        return () => {
            patch_listeners.splice(patch_listeners.indexOf(listener), 1)
        }
    })

    const start_recording = async ({ want_audio }) => {
        let audio_recorder = null,
            audio_record_start_promise

        let abort = async (e) => {
            alert(
                `We were unable to activate your microphone. Make sure that it is connected, and that this site (${
                    window.location.protocol + "//" + window.location.host
                }) has permission to use the microphone.`
            )
            console.warn("Failed to create audio recorder asdfasdf ", e)
            await stop_recording()
        }

        if (want_audio) {
            try {
                audio_recorder = await create_recorder()
                audio_record_start_promise = audio_recorder.start()
            } catch (e) {
                await abort(e)
                return
            }
        }

        let initial_html = await (await fetch(export_url("notebookexport")).then(assert_response_ok)).text()

        initial_html = initial_html.replaceAll(
            "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/",
            "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@8d243df/frontend/"
        )
        // initial_html = initial_html.replaceAll("https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/", "http://localhost:1234/")

        const scroll_handler_direct = () => {
            if (current_recording_ref == null) return

            let y = window.scrollY + window.innerHeight / 2

            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

            let best_index = ""
            let relative_distance = 0

            cell_nodes.forEach((el, i) => {
                let cy = el.offsetTop
                if (cy <= y) {
                    best_index = el.id
                    relative_distance = (y - cy) / el.offsetHeight
                }
            })

            current_recording_ref.scrolls = [
                ...current_recording_ref.scrolls,
                [
                    (Date.now() - recording_start_time_ref) / 1000,
                    {
                        cell_id: best_index,
                        relative_distance,
                    },
                ],
            ]
        }
        const scroll_handler = _.debounce(scroll_handler_direct, 500)

        try {
            await audio_record_start_promise
        } catch (e) {
            await abort(e)
            return
        }

        current_recording_ref = {
            initial_html,
            steps: [],
            scrolls: [],
            scroll_handler,
            audio_recorder,
        }
        recording_start_time_ref = Date.now()

        set_recording_states({ is_recording: true, recording_waiting_to_start: false })

        // call it once to record the start scroll position
        scroll_handler_direct()
        window.addEventListener("scroll", scroll_handler, { passive: true })
    }

    // Use reactive statement for notebook name processing
    $: notebook_name_ref = _.last(notebook_name.split("/"))
        .replace(/\.jl$/, "")
        .replace(/\.plutojl$/, "")
    
    const stop_recording = async () => {
        if (current_recording_ref != null) {
            const { audio_recorder, initial_html, steps, scrolls, scroll_handler } = current_recording_ref
            // @ts-ignore
            window.removeEventListener("scroll", scroll_handler, { passive: true })

            const audio_blob_url = await audio_recorder?.stop()
            const audio_data_url = audio_blob_url == null ? null : await blob_url_to_data_url(audio_blob_url)

            const magic_tag = `<meta name="pluto-insertion-spot-parameters">`
            const recording_url = "data:;base64," + await base64_arraybuffer(pack({ steps: steps, scrolls: scrolls }));
            const audio_url_value = audio_data_url == null ? null : JSON.stringify(audio_data_url);
            
            const script_content = [
                `window.pluto_recording_url = ${JSON.stringify(recording_url)};`,
                `window.pluto_recording_audio_url = ${audio_url_value};`
            ].join('\n');
            
            const replacement = `<script>\n${script_content}\n</` + `script>\n${magic_tag}`;
            const output_html = initial_html.replace(magic_tag, replacement);

            console.log(current_recording_ref)

            window.dispatchEvent(
                new CustomEvent("open pluto html export", {
                    detail: {
                        is_recording: true,
                        download_filename: `${notebook_name_ref} recording.html`,
                        download_url: "data:text/html;charset=utf-8," + encodeURIComponent(output_html),
                    },
                })
            )
        }

        recording_start_time_ref = 0
        current_recording_ref = null

        set_recording_states({ is_recording: false, recording_waiting_to_start: false })
    }
</script>

<div class="outline-frame recording"></div>
{#if recording_waiting_to_start}
    <div class="outline-frame-actions-container">
        <div class="overlay-button">
            <button on:click={() => start_recording({ want_audio: true })}>
                <span>{th("t_recording_ui_start_recording")}<span class="microphone-icon pluto-icon"></span></span>
            </button>
        </div>
        <div class="overlay-button record-no-audio">
            <button on:click={() => start_recording({ want_audio: false })}>
                <span>{th("t_recording_ui_start_recording_muted")}<span class="mute-icon pluto-icon"></span></span>
            </button>
        </div>
    </div>
{:else if is_recording}
    <div class="outline-frame-actions-container">
        <div class="overlay-button">
            <button on:click={() => stop_recording()}>
                <span>{th("t_recording_ui_stop_recording")}<span class="stop-recording-icon pluto-icon"></span></span>
            </button>
        </div>
    </div>
{/if}

<style>
    .outline-frame {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1000;
    }

    .outline-frame.recording {
        border: 3px solid #ff6b6b;
        animation: pulse 2s infinite;
    }

    .outline-frame-actions-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
        display: flex;
        gap: 1rem;
    }

    .overlay-button button {
        background: #333;
        color: white;
        border: none;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.2s;
    }

    .overlay-button button:hover {
        background: #555;
    }

    .pluto-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .microphone-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z'/%3E%3Cpath fill='white' d='M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'/%3E%3C/svg%3E");
    }

    .mute-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z'/%3E%3Cpath fill='white' d='M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'/%3E%3C/svg%3E");
        opacity: 0.6;
    }

    .stop-recording-icon {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M6 6h12v12H6z'/%3E%3C/svg%3E");
    }

    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
        }
    }

    .record-no-audio {
        opacity: 0.8;
    }
</style>