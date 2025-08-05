"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start_local = void 0;
const immer_js_1 = __importDefault(require("../imports/immer.js"));
const Binder_js_1 = require("./Binder.js");
const PlutoConnection_js_1 = require("./PlutoConnection.js");
const URLTools_js_1 = require("./URLTools.js");
// This file is very similar to `start_binder` in Binder.js
/**
 *
 * @param {{
 *  launch_params: import("../components/Editor.js").LaunchParameters,
 *  setStatePromise: any,
 *  connect: () => Promise<void>,
 * }} props
 */
const start_local = async ({ setStatePromise, connect, launch_params }) => {
    try {
        if (launch_params.pluto_server_url == null || launch_params.notebookfile == null)
            throw Error("Invalid launch parameters for starting locally.");
        await setStatePromise((0, immer_js_1.default)((/** @type {import("../components/Editor.js").EditorState} */ state) => {
            state.backend_launch_phase = Binder_js_1.BackendLaunchPhase.responded;
            state.disable_ui = false;
            // Clear the Status of the process that generated the HTML
            state.notebook.status_tree = null;
        }));
        const with_token = (x) => String(x);
        const binder_session_url = new URL(launch_params.pluto_server_url, window.location.href);
        let open_response;
        // We download the notebook file contents, and then upload them to the Pluto server.
        const notebook_contents = await (await fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity ?? undefined }))).arrayBuffer();
        open_response = await fetch(with_token((0, URLTools_js_1.with_query_params)(new URL("notebookupload", binder_session_url), {
            name: new URLSearchParams(window.location.search).get("name"),
            clear_frontmatter: "yesplease",
            execution_allowed: "yepperz",
        })), {
            method: "POST",
            body: notebook_contents,
        });
        if (!open_response.ok) {
            let b = await open_response.blob();
            window.location.href = URL.createObjectURL(b);
            return;
        }
        const new_notebook_id = await open_response.text();
        const edit_url = (0, URLTools_js_1.with_query_params)(new URL("edit", binder_session_url), { id: new_notebook_id });
        console.info("notebook_id:", new_notebook_id);
        window.history.replaceState({}, "", edit_url);
        await setStatePromise((0, immer_js_1.default)((/** @type {import("../components/Editor.js").EditorState} */ state) => {
            state.notebook.notebook_id = new_notebook_id;
            state.backend_launch_phase = Binder_js_1.BackendLaunchPhase.notebook_running;
        }));
        console.log("Connecting WebSocket");
        const connect_promise = connect();
        await (0, PlutoConnection_js_1.timeout_promise)(connect_promise, 20_000).catch((e) => {
            console.error("Failed to establish connection within 20 seconds. Navigating to the edit URL directly.", e);
            window.parent.location.href = with_token(edit_url);
        });
    }
    catch (err) {
        console.error("Failed to initialize binder!", err);
        alert("Something went wrong! 😮\n\nWe failed to open this notebook. Please try again with a different browser, or come back later.");
    }
};
exports.start_local = start_local;
