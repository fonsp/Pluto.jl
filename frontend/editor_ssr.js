import { render as ssr_render } from "https://esm.sh/preact-render-to-string@5.1.20?target=es2020&deps=preact10.6.6"

/////////////

import { html, render, useEffect, useRef, useState } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor, default_path } from "./components/Editor.js"
import { FetchProgress, read_Uint8Array_with_progress } from "./components/FetchProgress.js"
import { BinderPhase } from "./common/Binder.js"
import { unpack } from "./common/MsgPack.js"
import { RawHTMLContainer } from "./components/CellOutput.js"

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

import { launch_params } from "../ssr/ssr.js"

console.log("Launch parameters: ", launch_params)
console.log("Launch parameters: ", launch_params)
console.log("Launch parameters: ", launch_params)
console.log("Launch parameters: ", launch_params)

/**
 *
 * @returns {import("./components/Editor.js").NotebookData}
 */
export const empty_notebook_state = ({ notebook_id }) => ({
    notebook_id: notebook_id,
    path: default_path,
    shortpath: "",
    in_temp_dir: true,
    process_status: "starting",
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
})

/**
 *
 * @param {{
 *  launch_params: import("./components/Editor.js").LaunchParameters,
 * }} props
 */
const EditorLoader = async ({ launch_params }) => {
    const static_preview = launch_params.statefile != null

    const initial_notebook_state_ref = await new Promise((res) => {
        ;(async () => {
            const r = await fetch(launch_params.statefile)
            const data = await read_Uint8Array_with_progress(r, () => {})
            const state = unpack(data)
            res(state)
        })()
    })

    const statefile_download_progress = null
    const ready_for_editor = true

    return ready_for_editor
        ? html`<${Editor} initial_notebook_state=${initial_notebook_state_ref.current} launch_params=${launch_params} />`
        : // todo: show preamble html while loading. the problem is that it will re-render once the editor is ready, because the `RawHTMLContainer` element goes to a different place in the vdom.
          // ${launch_params.preamble_html ? html`<${RawHTMLContainer} body=${launch_params.preamble_html} className=${"preamble"} />` : null}
          html`<${FetchProgress} progress=${statefile_download_progress} />`
}

// it's like a Rube Goldberg machine
render(await EditorLoader({ launch_params }), document.body)
