"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingPlaybackUI = exports.RecordingUI = void 0;
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const AudioRecording_js_1 = require("../common/AudioRecording.js");
const Preact_js_1 = require("../imports/Preact.js");
const AudioPlayer_js_1 = require("./AudioPlayer.js");
const immer_js_1 = __importDefault(require("../imports/immer.js"));
const PlutoHash_js_1 = require("../common/PlutoHash.js");
const MsgPack_js_1 = require("../common/MsgPack.js");
const assert_response_ok = (/** @type {Response} */ r) => (r.ok ? r : Promise.reject(r));
let run = (x) => x();
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
const RecordingUI = ({ notebook_name, is_recording, recording_waiting_to_start, set_recording_states, patch_listeners, export_url }) => {
    let current_recording_ref = (0, Preact_js_1.useRef)(/** @type{RecordingState?} */ (null));
    let recording_start_time_ref = (0, Preact_js_1.useRef)(0);
    (0, Preact_js_1.useEffect)(() => {
        let listener = (patches) => {
            if (current_recording_ref.current != null) {
                current_recording_ref.current.steps = [
                    ...current_recording_ref.current.steps,
                    [(Date.now() - recording_start_time_ref.current) / 1000, patches],
                ];
            }
        };
        patch_listeners.push(listener);
        return () => {
            patch_listeners.splice(patch_listeners.indexOf(listener), 1);
        };
    }, []);
    const start_recording = async ({ want_audio }) => {
        let audio_recorder = null, audio_record_start_promise;
        let abort = async (e) => {
            alert(`We were unable to activate your microphone. Make sure that it is connected, and that this site (${window.location.protocol + "//" + window.location.host}) has permission to use the microphone.`);
            console.warn("Failed to create audio recorder asdfasdf ", e);
            await stop_recording();
        };
        if (want_audio) {
            try {
                audio_recorder = await (0, AudioRecording_js_1.create_recorder)();
                audio_record_start_promise = audio_recorder.start();
            }
            catch (e) {
                await abort(e);
                return;
            }
        }
        let initial_html = await (await fetch(export_url("notebookexport")).then(assert_response_ok)).text();
        initial_html = initial_html.replaceAll("https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/", "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@8d243df/frontend/");
        // initial_html = initial_html.replaceAll("https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/", "http://localhost:1234/")
        const scroll_handler_direct = () => {
            if (current_recording_ref.current == null)
                return;
            let y = window.scrollY + window.innerHeight / 2;
            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"));
            let best_index = "";
            let relative_distance = 0;
            cell_nodes.forEach((el, i) => {
                let cy = el.offsetTop;
                if (cy <= y) {
                    best_index = el.id;
                    relative_distance = (y - cy) / el.offsetHeight;
                }
            });
            current_recording_ref.current.scrolls = [
                ...current_recording_ref.current.scrolls,
                [
                    (Date.now() - recording_start_time_ref.current) / 1000,
                    {
                        cell_id: best_index,
                        relative_distance,
                    },
                ],
            ];
        };
        const scroll_handler = lodash_js_1.default.debounce(scroll_handler_direct, 500);
        try {
            await audio_record_start_promise;
        }
        catch (e) {
            await abort(e);
            return;
        }
        current_recording_ref.current = {
            initial_html,
            steps: [],
            scrolls: [],
            scroll_handler,
            audio_recorder,
        };
        recording_start_time_ref.current = Date.now();
        set_recording_states({ is_recording: true, recording_waiting_to_start: false });
        // call it once to record the start scroll position
        scroll_handler_direct();
        window.addEventListener("scroll", scroll_handler, { passive: true });
    };
    let notebook_name_ref = (0, Preact_js_1.useRef)(notebook_name);
    notebook_name_ref.current = lodash_js_1.default.last(notebook_name.split("/"))
        .replace(/\.jl$/, "")
        .replace(/\.plutojl$/, "");
    const stop_recording = async () => {
        if (current_recording_ref.current != null) {
            const { audio_recorder, initial_html, steps, scrolls, scroll_handler } = current_recording_ref.current;
            // @ts-ignore
            window.removeEventListener("scroll", scroll_handler, { passive: true });
            const audio_blob_url = await audio_recorder?.stop();
            const audio_data_url = audio_blob_url == null ? null : await (0, PlutoHash_js_1.blob_url_to_data_url)(audio_blob_url);
            const magic_tag = `<meta name="pluto-insertion-spot-parameters">`;
            const output_html = initial_html.replace(magic_tag, `
                <script>
                window.pluto_recording_url = "data:;base64,${await (0, PlutoHash_js_1.base64_arraybuffer)((0, MsgPack_js_1.pack)({ steps: steps, scrolls: scrolls }))}";
                window.pluto_recording_audio_url = ${audio_data_url == null ? null : `"${audio_data_url}"`};
                </script>
                ${magic_tag}`);
            console.log(current_recording_ref.current);
            let element = document.createElement("a");
            element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(output_html));
            element.setAttribute("download", `${notebook_name_ref.current} recording.html`);
            element.style.display = "none";
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
        recording_start_time_ref.current = 0;
        current_recording_ref.current = null;
        set_recording_states({ is_recording: false, recording_waiting_to_start: false });
    };
    return (0, Preact_js_1.html) `
        <div class="outline-frame recording"></div>
        ${recording_waiting_to_start
        ? (0, Preact_js_1.html) `<div class="outline-frame-actions-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
            start_recording({ want_audio: true });
        }}
                      >
                          <span><b>Start recording</b><span class="microphone-icon pluto-icon"></span></span>
                      </button>
                  </div>
                  <div class="overlay-button record-no-audio">
                      <button
                          onclick=${() => {
            start_recording({ want_audio: false });
        }}
                      >
                          <span><b>Start recording</b> (no audio)<span class="mute-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
        : is_recording
            ? (0, Preact_js_1.html) `<div class="outline-frame-actions-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
                stop_recording();
            }}
                      >
                          <span><b>Stop recording</b><span class="stop-recording-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
            : null}
    `;
};
exports.RecordingUI = RecordingUI;
let get_scroll_top = ({ cell_id, relative_distance }) => {
    let cell = document.getElementById(cell_id);
    if (cell)
        return cell.offsetTop + relative_distance * cell.offsetHeight - window.innerHeight / 2;
};
/**
 *
 * @param {{
 *  launch_params: import("./Editor.js").LaunchParameters,
 *  initializing: boolean,
 *  [key: string]: any,
 * }} props
 * @returns
 */
const RecordingPlaybackUI = ({ launch_params, initializing, apply_notebook_patches, reset_notebook_state }) => {
    const { recording_url, recording_url_integrity, recording_audio_url } = launch_params;
    let loaded_recording = (0, Preact_js_1.useMemo)(() => Promise.resolve().then(async () => {
        if (recording_url) {
            return (0, MsgPack_js_1.unpack)(new Uint8Array(await (await fetch(new Request(recording_url, { integrity: recording_url_integrity ?? undefined })).then(assert_response_ok)).arrayBuffer()));
        }
        else {
            return null;
        }
    }), [recording_url]);
    let computed_reverse_patches_ref = (0, Preact_js_1.useRef)(/** @type{Array<PatchStep>?} */ (null));
    (0, Preact_js_1.useEffect)(() => {
        loaded_recording.then(console.log);
    }, [loaded_recording]);
    let audio_element_ref = (0, Preact_js_1.useRef)(/** @type {HTMLAudioElement?} */ (null));
    let match_state_to_playback_running_ref = (0, Preact_js_1.useRef)(false);
    let current_state_timestamp_ref = (0, Preact_js_1.useRef)(0);
    let [current_scrollY, set_current_scrollY] = (0, Preact_js_1.useState)(/** @type {number?} */ (null));
    let [following_scroll, set_following_scroll] = (0, Preact_js_1.useState)(true);
    let following_scroll_ref = (0, Preact_js_1.useRef)(following_scroll);
    following_scroll_ref.current = following_scroll;
    let was_playing_before_scrollout_ref = (0, Preact_js_1.useRef)(false);
    let last_manual_window_scroll_time_ref = (0, Preact_js_1.useRef)(0);
    let last_manual_window_smoothscroll_time_ref = (0, Preact_js_1.useRef)(0);
    const scroll_window = (scrollY, smooth = true) => {
        last_manual_window_scroll_time_ref.current = Date.now();
        last_manual_window_smoothscroll_time_ref.current = Date.now();
        window.scrollTo({
            top: scrollY,
            behavior: smooth ? "smooth" : "auto",
        });
    };
    let on_scroll = ({ cell_id, relative_distance }, smooth = true) => {
        let scrollY = get_scroll_top({ cell_id, relative_distance });
        if (scrollY == null)
            return;
        set_current_scrollY(scrollY);
        if (following_scroll_ref.current) {
            scroll_window(scrollY, smooth);
        }
    };
    const match_state_to_playback_ref = (0, Preact_js_1.useRef)(() => { });
    match_state_to_playback_ref.current = async () => {
        match_state_to_playback_running_ref.current = true;
        const deserialized = /** @type {RecordingData} */ (await loaded_recording);
        computed_reverse_patches_ref.current = computed_reverse_patches_ref.current ?? deserialized.steps.map(([t, s]) => [t, undefined]);
        const audio = audio_element_ref.current;
        if (audio == null)
            return;
        let new_timestamp = audio.currentTime;
        let forward = new_timestamp >= current_state_timestamp_ref.current;
        /** @type {<T>(x: T[]) => T[]} */
        let directed = (x) => (forward ? x : [...x].reverse());
        let lower = Math.min(current_state_timestamp_ref.current, new_timestamp);
        let upper = Math.max(current_state_timestamp_ref.current, new_timestamp);
        let scrolls_in_time_window = deserialized.scrolls.filter(([t, s]) => lower < t && t <= upper);
        if (scrolls_in_time_window.length > 0) {
            let scroll_state = lodash_js_1.default.last(directed(scrolls_in_time_window))?.[1];
            if (scroll_state)
                on_scroll(scroll_state);
        }
        let steps_in_current_direction = forward ? deserialized.steps : computed_reverse_patches_ref.current;
        let steps_and_indices = steps_in_current_direction.map((x, i) => /** @type{[PatchStep, number]} */ ([x, i]));
        let steps_and_indices_in_time_window = steps_and_indices.filter(([[t, s], i]) => lower < t && t <= upper);
        let reverse_patches = [];
        for (let [[t, patches], i] of directed(steps_and_indices_in_time_window)) {
            reverse_patches = await apply_notebook_patches(patches, undefined, forward);
            if (forward) {
                computed_reverse_patches_ref.current[i] = [t, reverse_patches];
            }
        }
        // if (!_.isEmpty(steps_and_indices_in_time_window)) console.log(computed_reverse_patches_ref.current)
        current_state_timestamp_ref.current = new_timestamp;
        if (audio.paused) {
            match_state_to_playback_running_ref.current = false;
        }
        else {
            requestAnimationFrame(() => match_state_to_playback_ref.current());
        }
    };
    let on_audio_playback_change = (0, Preact_js_1.useCallback)((e) => {
        // console.log(e)
        if (!match_state_to_playback_running_ref.current) {
            match_state_to_playback_ref.current();
        }
    }, [match_state_to_playback_running_ref, match_state_to_playback_ref]);
    const event_names = ["seeked", "suspend", "play", "pause", "ended", "waiting"];
    (0, Preact_js_1.useLayoutEffect)(() => {
        const audio_el = audio_element_ref.current;
        if (audio_el) {
            event_names.forEach((en) => {
                audio_el.addEventListener(en, on_audio_playback_change);
            });
            return () => {
                event_names.forEach((en) => {
                    audio_el.removeEventListener(en, on_audio_playback_change);
                });
            };
        }
    }, [audio_element_ref.current, on_audio_playback_change]);
    (0, Preact_js_1.useEffect)(() => {
        if (!initializing && recording_url != null) {
            // if we are playing a recording, fix the initial scroll position
            loaded_recording.then((x) => {
                let first_scroll = lodash_js_1.default.first(x?.scrolls);
                if (first_scroll) {
                    let obs = new ResizeObserver(() => {
                        console.log("Scrolling back to first recorded scroll position...");
                        on_scroll(first_scroll[1], false);
                    });
                    let old_value = history.scrollRestoration;
                    history.scrollRestoration = "manual";
                    obs.observe(document.body);
                    setTimeout(() => {
                        history.scrollRestoration = old_value;
                        obs.disconnect();
                    }, 3000);
                    on_scroll(first_scroll[1], false);
                }
                document.fonts.ready.then(() => {
                    console.info("Fonts loaded");
                    on_scroll(first_scroll[1], false);
                });
            });
        }
    }, [initializing]);
    (0, Preact_js_1.useEffect)(() => {
        if (!initializing) {
            // TODO fons wat was je plan hier?
        }
    }, [initializing]);
    (0, Preact_js_1.useEffect)(() => {
        if (!initializing && recording_url != null) {
            let on_scroll = (e) => {
                let now = Date.now();
                let dt = (now - last_manual_window_scroll_time_ref.current) / 1000;
                let smooth_dt = (now - last_manual_window_smoothscroll_time_ref.current) / 1000;
                let is_first_smooth_scroll = smooth_dt === dt;
                let ignore = dt < 1 && (is_first_smooth_scroll || smooth_dt < 0.2);
                if (ignore) {
                    // then this must have been a browser-initiated smooth scroll event
                    last_manual_window_smoothscroll_time_ref.current = now;
                    // console.log("ignoring scroll", { ignore, dt, smooth_dt, e })
                }
                if (!ignore) {
                    if (following_scroll_ref.current) {
                        console.warn("Manual scroll detected, no longer following playback scroll", { dt, smooth_dt, e });
                        if (audio_element_ref.current != null) {
                            was_playing_before_scrollout_ref.current = !audio_element_ref.current.paused;
                            audio_element_ref.current.pause();
                        }
                        set_following_scroll(false);
                    }
                }
            };
            document.fonts.ready.then(() => {
                window.addEventListener("scroll", on_scroll, { passive: true });
            });
            return () => {
                // @ts-ignore
                window.removeEventListener("scroll", on_scroll, { passive: true });
            };
        }
    }, [initializing, recording_url]);
    let frame = (0, Preact_js_1.html) `<div
        style=${{
        opacity: following_scroll ? 0.0 : 1,
        top: `${current_scrollY ?? 0}px`,
    }}
        class="outline-frame playback"
    ></div>`;
    return (0, Preact_js_1.html) `
        ${recording_url
        ? (0, Preact_js_1.html) `${!following_scroll
            ? (0, Preact_js_1.html) ` <div class="outline-frame-actions-container">
                            <div class="overlay-button playback">
                                <button
                                    onclick=${() => {
                scroll_window(current_scrollY, true);
                set_following_scroll(true);
                if (was_playing_before_scrollout_ref.current && audio_element_ref.current)
                    audio_element_ref.current.play();
            }}
                                >
                                    <span>Back to <b>recording</b> <span class="follow-recording-icon pluto-icon"></span></span>
                                </button>
                            </div>
                        </div>`
            : null}
                  ${frame} <${AudioPlayer_js_1.AudioPlayer} audio_element_ref=${audio_element_ref} src=${recording_audio_url} loaded_recording=${loaded_recording} />`
        : null}
    `;
};
exports.RecordingPlaybackUI = RecordingPlaybackUI;
