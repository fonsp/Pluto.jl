import _ from "../imports/lodash.js"
import { createSilentAudio, create_recorder } from "../common/AudioRecording.js"
import { html, useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from "../imports/Preact.js"
import { AudioPlayer } from "./AudioPlayer.js"
import immer from "../imports/immer.js"
import { base64_arraybuffer, blob_url_to_data_url } from "../common/PlutoHash.js"
import { pack, unpack } from "../common/MsgPack.js"

let run = (x) => x()

export const RecordingUI = ({ is_recording, recording_waiting_to_start, set_recording_states, patch_listeners, export_url }) => {
    let current_recording_ref = useRef(null)
    let recording_start_time_ref = useRef(0)

    useEffect(() => {
        let listener = (patches) => {
            if (current_recording_ref.current != null) {
                current_recording_ref.current.steps = [
                    ...current_recording_ref.current.steps,
                    [(Date.now() - recording_start_time_ref.current) / 1000, patches],
                ]
            }
        }

        patch_listeners.push(listener)

        return () => {
            patch_listeners.splice(patch_listeners.indexOf(listener), 1)
        }
    }, [])

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

        let initial_html = await (await fetch(export_url("notebookexport"))).text()

        initial_html = initial_html.replaceAll("https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/", "http://localhost:1234/")

        const scroll_handler_direct = () => {
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

            current_recording_ref.current.scrolls = [
                ...current_recording_ref.current.scrolls,
                [
                    (Date.now() - recording_start_time_ref.current) / 1000,
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

        current_recording_ref.current = {
            initial_html,
            steps: [],
            scrolls: [],
            scroll_handler,
            audio_recorder,
        }
        recording_start_time_ref.current = Date.now()

        set_recording_states({ is_recording: true, recording_waiting_to_start: false })

        // call it once to record the start scroll position
        scroll_handler_direct()
        window.addEventListener("scroll", scroll_handler)
    }

    const stop_recording = async () => {
        if (current_recording_ref.current != null) {
            const { audio_recorder, initial_html, steps, scrolls, scroll_handler } = current_recording_ref.current
            window.removeEventListener("scroll", scroll_handler)

            const audio_blob_url = await audio_recorder?.stop()
            const audio_data_url = audio_blob_url == null ? null : await blob_url_to_data_url(audio_blob_url)

            const magic_tag = "<!-- [automatically generated launch parameters can be inserted here] -->"
            const output_html = initial_html.replace(
                magic_tag,
                `
                <script>
                window.pluto_recording_url = "data:;base64,${await base64_arraybuffer(pack({ steps: steps, scrolls: scrolls }))}";
                window.pluto_recording_audio_url = ${audio_data_url == null ? null : `"${audio_data_url}"`};
                </script>
                ${magic_tag}`
            )

            console.log(current_recording_ref.current)

            let element = document.createElement("a")
            element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(output_html))
            element.setAttribute("download", "recording.html")

            element.style.display = "none"
            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        }

        recording_start_time_ref.current = null
        current_recording_ref.current = null

        set_recording_states({ is_recording: false, recording_waiting_to_start: false })
    }

    return html`
        <div class="outline-frame recording"></div>
        ${recording_waiting_to_start
            ? html`<div id="record-ui-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
                              start_recording({ want_audio: true })
                          }}
                      >
                          <span><b>Start recording</b><span class="microphone-icon pluto-icon"></span></span>
                      </button>
                  </div>
                  <div class="overlay-button record-no-audio">
                      <button
                          onclick=${() => {
                              start_recording({ want_audio: false })
                          }}
                      >
                          <span><b>Start recording</b> (no audio)<span class="mute-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
            : is_recording
            ? html`<div id="record-ui-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
                              stop_recording()
                          }}
                      >
                          <span><b>Stop recording</b><span class="stop-recording-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
            : null}
    `
}

let get_scroll_top = ({ cell_id, relative_distance }) => {
    let cell = document.getElementById(cell_id)
    return cell.offsetTop + relative_distance * cell.offsetHeight - window.innerHeight / 2
}

const goto_scroll_position = ({ cell_id, relative_distance }, smooth = true) => {
    window.scrollTo({
        top: get_scroll_top({ cell_id, relative_distance }),
        behavior: smooth ? "smooth" : "auto",
    })
}

export const RecordingPlaybackUI = ({ recording_url, audio_src, initializing, apply_notebook_patches, reset_notebook_state }) => {
    let loaded_recording = useMemo(
        () =>
            Promise.resolve().then(async () => {
                if (recording_url) {
                    return unpack(new Uint8Array(await (await fetch(recording_url)).arrayBuffer()))
                } else {
                    return null
                }
            }),
        [recording_url]
    )
    let computed_reverse_patches_ref = useRef(null)

    useEffect(() => {
        loaded_recording.then(console.log)
    }, [loaded_recording])

    let recording_audio_player_ref = useRef(null)

    let match_state_to_playback_running_ref = useRef(false)
    let current_state_timestamp_ref = useRef(0)

    let [current_scroll_position, set_current_scroll_position] = useState(null)
    let following_scroll_ref = useRef(true)

    let on_scroll = (value, x) => {
        set_current_scroll_position(value)
        if (following_scroll_ref.current) {
            goto_scroll_position(value, x)
        }
    }

    const match_state_to_playback_ref = useRef(() => {})
    match_state_to_playback_ref.current = async () => {
        match_state_to_playback_running_ref.current = true

        const deserialized = await loaded_recording

        computed_reverse_patches_ref.current = computed_reverse_patches_ref.current ?? deserialized.steps.map(([t, s]) => [t, null])

        const audio = recording_audio_player_ref.current
        let new_timestamp = audio.currentTime
        let forward = new_timestamp >= current_state_timestamp_ref.current
        let directed = forward ? _.identity : _.reverse

        let lower = Math.min(current_state_timestamp_ref.current, new_timestamp)
        let upper = Math.max(current_state_timestamp_ref.current, new_timestamp)

        let scrolls_in_time_window = deserialized.scrolls.filter(([t, s]) => lower < t && t <= upper)
        if (scrolls_in_time_window.length > 0) {
            let scroll_state = _.last(directed(scrolls_in_time_window))[1]

            on_scroll(scroll_state)
        }

        let steps_in_current_direction = forward ? deserialized.steps : computed_reverse_patches_ref.current
        let steps_and_indices = steps_in_current_direction.map((x, i) => [x, i])
        let steps_and_indices_in_time_window = steps_and_indices.filter(([[t, s], i]) => lower < t && t <= upper)

        let reverse_patches = []
        for (let [[t, patches], i] of directed(steps_and_indices_in_time_window)) {
            reverse_patches = await apply_notebook_patches(patches, undefined, forward)
            if (forward) {
                computed_reverse_patches_ref.current[i] = [t, reverse_patches]
            }
        }
        // if (!_.isEmpty(steps_and_indices_in_time_window)) console.log(computed_reverse_patches_ref.current)

        current_state_timestamp_ref.current = new_timestamp

        if (audio.paused) {
            match_state_to_playback_running_ref.current = false
        } else {
            requestAnimationFrame(() => match_state_to_playback_ref.current())
        }
    }

    let on_audio_playback_change = useCallback(
        (e) => {
            // console.log(e)

            if (!match_state_to_playback_running_ref.current) {
                match_state_to_playback_ref.current()
            }
        },
        [match_state_to_playback_running_ref, match_state_to_playback_ref]
    )

    const event_names = ["seeked", "suspend", "play", "pause", "ended", "waiting"]

    useLayoutEffect(() => {
        if (recording_audio_player_ref.current) {
            event_names.forEach((en) => {
                recording_audio_player_ref.current.addEventListener(en, on_audio_playback_change)
            })

            return () => {
                event_names.forEach((en) => {
                    recording_audio_player_ref.current.removeEventListener(en, on_audio_playback_change)
                })
            }
        }
    }, [recording_audio_player_ref.current, on_audio_playback_change])

    useEffect(() => {
        if (!initializing) {
            // if we are playing a recording, fix the initial scroll position
            loaded_recording.then((x) => {
                let first_scroll = _.first(x?.scrolls)
                if (first_scroll) {
                    let obs = new ResizeObserver(() => {
                        console.log("Scrolling back to first recorded scroll position...")
                        goto_scroll_position(first_scroll[1], false)
                    })
                    let old_value = history.scrollRestoration
                    history.scrollRestoration = "manual"
                    obs.observe(document.body)
                    setTimeout(() => {
                        history.scrollRestoration = old_value
                        obs.disconnect()
                    }, 3000)
                    goto_scroll_position(first_scroll[1], false)
                }
            })
        }
    }, [initializing])

    return html`
        ${recording_url
            ? html`<div
                      class="outline-frame playback"
                      style=${{
                          top: `${current_scroll_position ? get_scroll_top(current_scroll_position) : 0}px`,
                      }}
                  ></div>
                  <${AudioPlayer} audio_element_ref=${recording_audio_player_ref} src=${audio_src} loaded_recording=${loaded_recording} />`
            : null}
    `
}
