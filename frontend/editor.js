import { html, render, useEffect, useRef, useState } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor, default_path } from "./components/Editor.js"
import { FetchProgress, read_Uint8Array_with_progress } from "./components/FetchProgress.js"
import { unpack } from "./common/MsgPack.js"
import { RawHTMLContainer } from "./components/CellOutput.js"
import { ProcessStatus } from "./common/ProcessStatus.js"

const url_params = new URLSearchParams(window.location.search)

//////////////
// utils:

const set_attribute_if_needed = (element, attr, value) => {
    if (element.getAttribute(attr) !== value) {
        element.setAttribute(attr, value)
    }
}
export const set_disable_ui_css = (val) => {
    document.body.classList.toggle("disable_ui", val)
    set_attribute_if_needed(document.head.querySelector("link[data-pluto-file='hide-ui']"), "media", val ? "all" : "print")
}

/////////////
// the rest:

/**
 *
 * @type {import("./components/Editor.js").LaunchParameters}
 */
const launch_params = {
    //@ts-ignore
    notebook_id: url_params.get("id") ?? window.pluto_notebook_id,
    //@ts-ignore
    statefile: url_params.get("statefile") ?? window.pluto_statefile,
    //@ts-ignore
    statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
    //@ts-ignore
    notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
    //@ts-ignore
    notebookfile_integrity: url_params.get("notebookfile_integrity") ?? window.pluto_notebookfile_integrity,
    //@ts-ignore
    disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
    //@ts-ignore
    preamble_html: url_params.get("preamble_html") ?? window.pluto_preamble_html,
    //@ts-ignore
    isolated_cell_ids: url_params.has("isolated_cell_id") ? url_params.getAll("isolated_cell_id") : window.pluto_isolated_cell_ids,
    //@ts-ignore
    binder_url: url_params.get("binder_url") ?? window.pluto_binder_url,
    //@ts-ignore
    pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_pluto_server_url,
    //@ts-ignore
    slider_server_url: url_params.get("slider_server_url") ?? window.pluto_slider_server_url,
    //@ts-ignore
    recording_url: url_params.get("recording_url") ?? window.pluto_recording_url,
    //@ts-ignore
    recording_url_integrity: url_params.get("recording_url_integrity") ?? window.pluto_recording_url_integrity,
    //@ts-ignore
    recording_audio_url: url_params.get("recording_audio_url") ?? window.pluto_recording_audio_url,
}

const truthy = (x) => x === "" || x === "true"
const falsey = (x) => x === "false"

const from_attribute = (element, name) => {
    const val = element.getAttribute(name)
    if (name === "disable_ui") {
        return truthy(val) ? true : falsey(val) ? false : null
    } else if (name === "isolated_cell_id") {
        return val == null ? null : val.split(",")
    } else {
        return val
    }
}

const preamble_html_comes_from_url_params = url_params.has("preamble_url")

/**
 *
 * @returns {import("./components/Editor.js").NotebookData}
 */
export const empty_notebook_state = ({ notebook_id }) => ({
    metadata: {},
    notebook_id: notebook_id,
    path: default_path,
    shortpath: "",
    in_temp_dir: true,
    process_status: ProcessStatus.starting,
    last_save_time: 0.0,
    last_hot_reload_time: 0.0,
    cell_inputs: {},
    cell_results: {},
    cell_dependencies: {},
    cell_order: [],
    cell_execution_order: [],
    published_objects: {},
    bonds: {},
    nbpkg: null,
    status_tree: null,
})

/**
 *
 * @param {import("./components/Editor.js").NotebookData} state
 * @returns {import("./components/Editor.js").NotebookData}
 */
const without_path_entries = (state) => ({ ...state, path: default_path, shortpath: "" })

/**
 * Fetches the statefile (usually a async resource) in launch_params.statefile
 * and makes it available for consuming by `pluto-editor`
 * To add custom logic instead, see use Environment.js
 *
 * @param {import("./components/Editor.js").LaunchParameters} launch_params
 * @param {{current: import("./components/Editor.js").EditorState}} initial_notebook_state_ref
 * @param {Function} set_ready_for_editor
 * @param {Function} set_statefile_download_progress
 */

const get_statefile =
    // @ts-ignore
    window?.pluto_injected_environment?.custom_get_statefile?.(read_Uint8Array_with_progress, without_path_entries, unpack) ??
    (async (launch_params, set_statefile_download_progress) => {
        set_statefile_download_progress("indeterminate")
        const r = await fetch(new Request(launch_params.statefile, { integrity: launch_params.statefile_integrity ?? undefined }))
        set_statefile_download_progress(0.2)
        const data = await read_Uint8Array_with_progress(r, (x) => set_statefile_download_progress(x * 0.8 + 0.2))
        const state = without_path_entries(unpack(data))
        return state
    })
/**
 *
 * @param {{
 *  launch_params: import("./components/Editor.js").LaunchParameters,
 * }} props
 */
const EditorLoader = ({ launch_params }) => {
    const { statefile, statefile_integrity } = launch_params
    const static_preview = statefile != null

    const [statefile_download_progress, set_statefile_download_progress] = useState(null)

    const initial_notebook_state_ref = useRef(empty_notebook_state(launch_params))
    const [error_banner, set_error_banner] = useState(/** @type {import("./imports/Preact.js").ReactElement?} */ (null))
    const [ready_for_editor, set_ready_for_editor] = useState(!static_preview)

    useEffect(() => {
        if (!ready_for_editor && static_preview) {
            get_statefile(launch_params, set_statefile_download_progress)
                .then((state) => {
                    console.log({ state })
                    initial_notebook_state_ref.current = state
                    set_ready_for_editor(true)
                })
                .catch((e) => {
                    console.error(e)
                    set_error_banner(html`
                        <main style="font-family: system-ui, sans-serif;">
                            <h2>Failed to load notebook</h2>
                            <p>The statefile failed to download. Original error message:</p>
                            <pre style="overflow: auto;"><code>${e.toString()}</code></pre>
                            <p>Launch parameters:</p>
                            <pre style="overflow: auto;"><code>${JSON.stringify(launch_params, null, 2)}</code></pre>
                        </main>
                    `)
                })
        }
    }, [ready_for_editor, static_preview, statefile])

    useEffect(() => {
        set_disable_ui_css(launch_params.disable_ui)
    }, [launch_params.disable_ui])

    const preamble_element = launch_params.preamble_html
        ? html`<${RawHTMLContainer} body=${launch_params.preamble_html} className=${"preamble"} sanitize_html=${preamble_html_comes_from_url_params} />`
        : null

    return error_banner != null
        ? error_banner
        : ready_for_editor
        ? html`<${Editor} initial_notebook_state=${initial_notebook_state_ref.current} launch_params=${launch_params} preamble_element=${preamble_element} />`
        : // todo: show preamble html
          html`
              ${preamble_element}
              <${FetchProgress} progress=${statefile_download_progress} />
          `
}

// Create a web component for EditorLoader that takes in additional launch parameters as attributes
// possible attribute names are `Object.keys(launch_params)`

// This means that you can do stuff like:
/* 
<pluto-editor disable_ui notebookfile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.jl" statefile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.plutostate"  ></pluto-editor>
        
<pluto-editor disable_ui notebookfile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.jl" statefile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.plutostate"  ></pluto-editor> 
*/

// or:

/* 
<pluto-editor notebook_id="fcc1b498-a141-11ec-342a-593db1016648"></pluto-editor>

<pluto-editor notebook_id="21ebc942-a1ed-11ec-2505-7b242b18daf3"></pluto-editor>

TODO: Make this self-contained (currently depends on various stuff being on window.*, e.g. observablehq library, lodash etc)
*/

class PlutoEditorComponent extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        /** Web components only support text attributes. We deserialize into js here */
        const new_launch_params = Object.fromEntries(Object.entries(launch_params).map(([k, v]) => [k, from_attribute(this, k) ?? v]))
        console.log("Launch parameters: ", new_launch_params)

        render(html`<${EditorLoader} launch_params=${new_launch_params} />`, this)
    }
}
customElements.define("pluto-editor", PlutoEditorComponent)
