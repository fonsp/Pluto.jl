import { Promises } from "./SetupCellEnvironment.js"
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
            `html"<h1>Welcome to <em>WebAssembly</em>!</h1>

<p>This is a first demo of (non-reactive) Pluto with a WASM backend! The Julia code in this notebook was executed <em>entirely</em> inside your web browser.</p>"`,
            true
        ),
        Cell(
            `
# hello from WASM!

sqrt.(1:10)`,
            false
        ),
        Cell(
            `
extrema(1:100)`,
            false
        ),
        Cell(
            `
sprint(dump, Meta.parse("x = y + 123")) |> Text`,
            false
        ),
        Cell(
            `
plot(x, y) = """
<script src="https://cdn.plot.ly/plotly-1.58.0.min.js"></script>

<script>
    const container = html\`<div style="width: 100%;"></div>\`

    Plotly.newPlot( container, [{
        x: $(JSON.json(x)),
        y: $(JSON.json(y)),
    }], {
        margin: { t: 0 } 
    })

    return container
</script>
""" |> HTML
`,
            false
        ),
        Cell(
            `
let
    t = 1:100
    plot(t, sqrt.(t))
end
`,
            false
        ),
        Cell(
            `
html"""
<script>
const {default: confetti} = await import("https://cdn.skypack.dev/canvas-confetti@1")
confetti()
</script>
"""
`,
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

const cell_result_data = () => ({
    queued: false,
    running: false,
    runtime: null,
    errored: false,
    output: {
        body: "",
        persist_js_state: false,
        last_run_timestamp: Date.now(),
        mime: "text/plain",
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
        //@ts-ignore
        await window.jl_wasm.ready

        const { cells } = body

        update_notebook(on_unrequested_update, (notebook) => {
            for (const cell_id of cells) {
                notebook.cell_results[cell_id] = {
                    ...(notebook.cell_results[cell_id] ?? cell_result_data()),
                    queued: true,
                }
            }
        })

        await new Promise((r) => setTimeout(r, 10))

        for (const cell_id of cells) {
            update_notebook(on_unrequested_update, (notebook) => {
                // run cell

                const { code } = notebook.cell_inputs[cell_id]

                const start_time = Date.now()

                let ran_code = false

                try {
                    const result_ptr = window.jl_wasm.eval_jl(code)

                    ran_code = true

                    const html_showable = window.jl_wasm.std.html_showable(result_ptr)

                    const repred = html_showable ? window.jl_wasm.std.repr_html(result_ptr) : window.jl_wasm.std.repr(result_ptr)

                    notebook.cell_results[cell_id] = {
                        queued: false,
                        running: false,
                        runtime: 1e6 * (Date.now() - start_time),
                        errored: false,
                        output: {
                            body: repred,
                            persist_js_state: false,
                            last_run_timestamp: Date.now(),
                            mime: html_showable ? "text/html" : "text/plain",
                            rootassignee: null,
                        },
                    }
                } catch (e) {
                    console.error(ran_code ? "Failed to show object" : "Failed to run code", e)
                    notebook.cell_results[cell_id] = {
                        queued: false,
                        running: false,
                        runtime: 1e6 * (Date.now() - start_time),
                        errored: true,
                        output: {
                            body: "Error! There might be more info in the JS console",
                            persist_js_state: false,
                            last_run_timestamp: Date.now(),
                            mime: "text/plain",
                            rootassignee: null,
                        },
                    }
                }
            })

            await new Promise((r) => setTimeout(r, 10))
        }
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
