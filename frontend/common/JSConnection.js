import { Promises } from "../common/SetupCellEnvironment.js"
import { pack, unpack } from "./MsgPack.js"
import "./Polyfill.js"
import immer, { applyPatches, produceWithPatches } from "../imports/immer.js"

import { timeout_promise, resolvable_promise } from "./PlutoConnection.js"

export { resolvable_promise }

const uuidv4 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

const initial_notebook = () => {
    const Cell = (code, code_folded) => ({
        cell_id: uuidv4(),
        code: code.trim(),
        code_folded,
    })

    const cells = [
        Cell(
            `// hello!
var language = "JavaScript"

return html\`
<h1>Welcome to <em>\${language}</em>?</h1>
<p>This version of Pluto runs all code in your browser, by wrapping it in a script block. You need to use <code>return</code> to show output.</p>

<h4>This is a first step towards the WASM backend!</h4>
\``,
            true
        ),
        Cell(
            `
return 1 + 1`,
            false
        ),
        Cell(
            `
return html\`<b>Wow!</b>\``,
            false
        ),
        Cell(
            `
    
const {default: confetti} = await import("https://cdn.skypack.dev/canvas-confetti@1")
confetti()`,
            false
        ),
    ]

    return {
        notebook_id: "f7636209-a0e6-45a7-bdd5-f9038598a085",
        path: "hello.js",
        shortpath: "hello",
        in_temp_dir: true,
        cell_inputs: Object.fromEntries(cells.map((c) => [c.cell_id, c])),
        cell_results: {},
        cell_order: cells.map((c) => c.cell_id),
    }
}
// let last_known_state = initial_notebook()
// const first_id = uuidv4()
let backend_notebook = null

const cell_result_data = (body = "") => ({
    queued: false,
    running: false,
    runtime: null,
    errored: false,
    output: {
        body: body,
        persist_js_state: false,
        last_run_timestamp: Date.now(),
        mime: "text/html",
        rootassignee: null,
    },
})

const handle_message = async (on_unrequested_update, message_type, body = {}, metadata = {}, no_broadcast = true) => {
    // if(metadata.notebook_id != null && )

    // console.log(message_type, body, metadata)
    if (message_type === "update_notebook") {
        let return_patches

        if (backend_notebook == null) {
            // this means that the frontend is connecting for the first time, we send it our backend notebook
            backend_notebook = initial_notebook()
            return_patches = [
                {
                    op: "replace",
                    path: [],
                    value: backend_notebook,
                },
            ]

            on_unrequested_update({
                notebook_id: backend_notebook.notebook_id,
                type: "notebook_diff",
                message: {
                    patches: return_patches,
                },
            })

            // run all cells
            handle_message(on_unrequested_update, "run_multiple_cells", { cells: backend_notebook.cell_order })
        } else {
            backend_notebook = applyPatches(backend_notebook, body.updates)
            return_patches = body.updates
        }

        return {
            message: {
                patches: return_patches,
                response: {
                    update_went_well: "👍",
                },
            },
        }
    }

    if (message_type === "run_multiple_cells") {
        const { cells } = body

        update_notebook(on_unrequested_update, (notebook) => {
            for (const cell_id of cells) {
                const { code } = notebook.cell_inputs[cell_id]

                notebook.cell_results[cell_id] = cell_result_data(`<script id="something">${code}</script>`)
            }
        })
    }

    // await new Promise(() => {})
}

const update_notebook = async (on_unrequested_update, mutator_fn) => {
    let [new_notebook, changes, inverseChanges] = produceWithPatches(backend_notebook, mutator_fn)

    backend_notebook = new_notebook

    await on_unrequested_update({
        notebook_id: backend_notebook.notebook_id,
        type: "notebook_diff",
        message: {
            patches: changes,
        },
    })
}

/**
 * @returns {string}
 */
const get_unique_short_id = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36)

/**
 * @typedef PlutoConnection
 * @type {{
 *  session_options: Object,
 *  send: () => void,
 *  kill: () => void,
 *  version_info: {
 *      julia: string,
 *      pluto: string,
 *  },
 * }}
 */

/**
 * @typedef PlutoMessage
 * @type {any}
 */

/**
 * Open a connection with Pluto, that supports a question-response mechanism. The method is asynchonous, and resolves to a @see PlutoConnection when the connection is established.
 *
 * The server can also send messages to all clients, without being requested by them. These end up in the @see on_unrequested_update callback.
 *
 * @param {{
 *  on_unrequested_update: (message: PlutoMessage, by_me: boolean) => void,
 *  on_reconnect: () => boolean,
 *  on_connection_status: (connection_status: boolean) => void,
 *  connect_metadata?: Object,
 * }} options
 * @return {Promise<PlutoConnection>}
 */
export const create_pluto_connection = async ({ on_unrequested_update, on_reconnect, on_connection_status, connect_metadata = {} }) => {
    var ws_connection = null // will be defined later i promise
    const client = {
        send: null,
        kill: null,
        session_options: null,
        version_info: {
            julia: "unknown",
            pluto: "unknown",
        },
    } // same

    const client_id = get_unique_short_id()
    const sent_requests = {}

    /**
     * Send a message to the Pluto backend, and return a promise that resolves when the backend sends a response. Not all messages receive a response.
     * @param {string} message_type
     * @param {Object} body
     * @param {{notebook_id?: string, cell_id?: string}} metadata
     * @param {boolean} no_broadcast if false, the message will be emitteed to on_update
     * @returns {(undefined|Promise<Object>)}
     */
    client.send = (...args) => handle_message(on_unrequested_update, ...args)

    const connect = async () => {
        await new Promise((r) => setTimeout(r, 10))
        try {
            on_connection_status(true)
            return "😱"
        } catch (ex) {
            console.error("connect() failed", ex)
        }
    }
    await connect()

    return client
}
