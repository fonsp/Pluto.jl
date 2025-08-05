"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.empty_notebook_state = exports.is_editor_embedded_inside_editor = exports.set_disable_ui_css = void 0;
const Preact_js_1 = require("./imports/Preact.js");
require("./common/NodejsCompatibilityPolyfill.js");
const Editor_js_1 = require("./components/Editor.js");
const FetchProgress_js_1 = require("./components/FetchProgress.js");
const MsgPack_js_1 = require("./common/MsgPack.js");
const CellOutput_js_1 = require("./components/CellOutput.js");
const ProcessStatus_js_1 = require("./common/ProcessStatus.js");
const parse_launch_params_js_1 = require("./common/parse_launch_params.js");
const url_params = new URLSearchParams(window.location.search);
//////////////
// utils:
const set_attribute_if_needed = (element, attr, value) => {
    if (element.getAttribute(attr) !== value) {
        element.setAttribute(attr, value);
    }
};
const set_disable_ui_css = (/** @type {boolean} */ val, /** @type {HTMLElement} */ element) => {
    element.classList.toggle("disable_ui", val);
};
exports.set_disable_ui_css = set_disable_ui_css;
const is_editor_embedded_inside_editor = (/** @type {HTMLElement} */ element) => element.parentElement?.closest("pluto-editor") != null;
exports.is_editor_embedded_inside_editor = is_editor_embedded_inside_editor;
/////////////
// the rest:
const launch_params = (0, parse_launch_params_js_1.parse_launch_params)();
const truthy = (x) => x === "" || x === "true";
const falsey = (x) => x === "false";
const from_attribute = (element, name) => {
    const val = element.getAttribute(name) ?? element.getAttribute(name.replaceAll("_", "-"));
    if (name === "disable_ui") {
        return truthy(val) ? true : falsey(val) ? false : null;
    }
    else if (name === "isolated_cell_id") {
        return val == null ? null : val.split(",");
    }
    else {
        return val;
    }
};
const preamble_html_comes_from_url_params = url_params.has("preamble_url");
/**
 *
 * @returns {import("./components/Editor.js").NotebookData}
 */
const empty_notebook_state = ({ notebook_id }) => ({
    metadata: {},
    notebook_id: notebook_id,
    path: Editor_js_1.default_path,
    shortpath: "",
    in_temp_dir: true,
    process_status: ProcessStatus_js_1.ProcessStatus.starting,
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
});
exports.empty_notebook_state = empty_notebook_state;
/**
 *
 * @param {import("./components/Editor.js").NotebookData} state
 * @returns {import("./components/Editor.js").NotebookData}
 */
const without_path_entries = (state) => ({ ...state, path: Editor_js_1.default_path, shortpath: "" });
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
window?.pluto_injected_environment?.custom_get_statefile?.(FetchProgress_js_1.read_Uint8Array_with_progress, without_path_entries, MsgPack_js_1.unpack) ??
    (async (launch_params, set_statefile_download_progress) => {
        set_statefile_download_progress("indeterminate");
        const r = await fetch(new Request(launch_params.statefile, { integrity: launch_params.statefile_integrity ?? undefined }), {
            // @ts-ignore
            priority: "high",
        });
        set_statefile_download_progress(0.2);
        const data = await (0, FetchProgress_js_1.read_Uint8Array_with_progress)(r, (x) => set_statefile_download_progress(x * 0.8 + 0.2));
        const state = without_path_entries((0, MsgPack_js_1.unpack)(data));
        return state;
    });
/**
 *
 * @param {{
 *  launch_params: import("./components/Editor.js").LaunchParameters,
 *  pluto_editor_element: HTMLElement,
 * }} props
 */
const EditorLoader = ({ launch_params, pluto_editor_element }) => {
    const { statefile, statefile_integrity } = launch_params;
    const static_preview = statefile != null;
    const [statefile_download_progress, set_statefile_download_progress] = (0, Preact_js_1.useState)(null);
    const initial_notebook_state_ref = (0, Preact_js_1.useRef)((0, exports.empty_notebook_state)(launch_params));
    const [error_banner, set_error_banner] = (0, Preact_js_1.useState)(/** @type {import("./imports/Preact.js").ReactElement?} */ (null));
    const [ready_for_editor, set_ready_for_editor] = (0, Preact_js_1.useState)(!static_preview);
    (0, Preact_js_1.useEffect)(() => {
        if (!ready_for_editor && static_preview) {
            get_statefile(launch_params, set_statefile_download_progress)
                .then((state) => {
                console.log({ state });
                initial_notebook_state_ref.current = state;
                set_ready_for_editor(true);
            })
                .catch((e) => {
                console.error(e);
                set_error_banner((0, Preact_js_1.html) `
                        <main style="font-family: system-ui, sans-serif;">
                            <h2>Failed to load notebook</h2>
                            <p>The statefile failed to download. Original error message:</p>
                            <pre style="overflow: auto;"><code>${e.toString()}</code></pre>
                            <p>Launch parameters:</p>
                            <pre style="overflow: auto;"><code>${JSON.stringify(launch_params, null, 2)}</code></pre>
                        </main>
                    `);
            });
        }
    }, [ready_for_editor, static_preview, statefile]);
    (0, Preact_js_1.useEffect)(() => {
        (0, exports.set_disable_ui_css)(launch_params.disable_ui, pluto_editor_element);
    }, [launch_params.disable_ui]);
    const preamble_element = launch_params.preamble_html
        ? (0, Preact_js_1.html) `<${CellOutput_js_1.RawHTMLContainer} body=${launch_params.preamble_html} className=${"preamble"} sanitize_html=${preamble_html_comes_from_url_params} />`
        : null;
    return error_banner != null
        ? error_banner
        : ready_for_editor
            ? (0, Preact_js_1.html) `<${Editor_js_1.Editor}
              initial_notebook_state=${initial_notebook_state_ref.current}
              launch_params=${launch_params}
              preamble_element=${preamble_element}
              pluto_editor_element=${pluto_editor_element}
          />`
            : // todo: show preamble html
                (0, Preact_js_1.html) `
              ${preamble_element}
              <${FetchProgress_js_1.FetchProgress} progress=${statefile_download_progress} />
          `;
};
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
        super();
    }
    connectedCallback() {
        if (this.hasAttribute("skip-custom-element"))
            return;
        /** Web components only support text attributes. We deserialize into js here */
        const new_launch_params = Object.fromEntries(Object.entries(launch_params).map(([k, v]) => [k, from_attribute(this, k) ?? v]));
        console.log("Launch parameters: ", new_launch_params);
        document.querySelector(".delete-me-when-live")?.remove();
        (0, Preact_js_1.render)((0, Preact_js_1.html) `<${EditorLoader} launch_params=${new_launch_params} pluto_editor_element=${this} />`, this);
    }
}
customElements.define("pluto-editor", PlutoEditorComponent);
