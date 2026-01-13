import immer from "../imports/immer.js"
import { timeout_promise, ws_address_from_base } from "./PlutoConnection.js"
import { with_query_params } from "./URLTools.js"

export const BackendLaunchPhase = {
    wait_for_user: 0,
    requesting: 0.4,
    created: 0.6,
    responded: 0.7,
    notebook_running: 0.9,
    ready: 1.0,
}

// The following function is based on the wonderful https://github.com/executablebooks/thebe which has the following license:

/*
LICENSE

Copyright Executable Books Project

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

export const trailingslash = (s) => (s.endsWith("/") ? s : s + "/")

export const request_binder = (build_url, { on_log }) =>
    new Promise((resolve, reject) => {
        console.log("Starting binder connection to", build_url)
        try {
            let es = new EventSource(build_url)
            es.onerror = (err) => {
                console.error("Binder error: Lost connection to " + build_url, err)
                es.close()
                reject(err)
            }
            let phase = null
            let logs = ``
            let report_log = (msg) => {
                console.log("Binder: ", msg, ` at ${new Date().toLocaleTimeString()}`)

                logs = `${logs}${msg}\n`
                on_log(logs)
            }
            es.onmessage = (evt) => {
                let msg = JSON.parse(evt.data)

                if (msg.phase && msg.phase !== phase) {
                    phase = msg.phase.toLowerCase()

                    report_log(`\n\n⏱️ Binder subphase: ${phase}\n`)
                }
                if (msg.message) {
                    report_log(msg.message.replace(`] `, `]\n`))
                }
                switch (msg.phase) {
                    case "failed":
                        console.error("Binder error: Failed to build", build_url, msg)
                        es.close()
                        reject(new Error(msg))
                        break
                    case "ready":
                        es.close()

                        resolve({
                            binder_session_url: trailingslash(msg.url) + "pluto/",
                            binder_session_token: msg.token,
                        })
                        break
                }
            }
        } catch (err) {
            console.error(err)
            reject("Failed to open event source the mybinder.org. This probably means that the URL is invalid.")
        }
    })

// view stats on https://stats.plutojl.org/
export const count_stat = (page) =>
    fetch(`https://stats.plutojl.org/count?p=/${page}&s=${screen.width},${screen.height},${devicePixelRatio}#skip_sw`, { cache: "no-cache" }).catch(() => {})

/**
 * Start a 'headless' binder session, open our notebook in it, and connect to it.
 */
export const start_binder = async ({ setStatePromise, connect, launch_params }) => {
    try {
        // view stats on https://stats.plutojl.org/
        count_stat(`binder-start`)
        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.requesting
                state.disable_ui = false
                // Clear the Status of the process that generated the HTML
                state.notebook.status_tree = null
            })
        )

        /// PART 1: Creating a binder session..
        const { binder_session_url, binder_session_token } = await request_binder(launch_params.binder_url.replace("mybinder.org/v2/", "mybinder.org/build/"), {
            on_log: (logs) =>
                setStatePromise(
                    immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                        state.backend_launch_logs = logs
                    })
                ),
        })
        const with_token = (u) => with_query_params(u, { token: binder_session_token })

        console.log("Binder URL:", with_token(binder_session_url))

        //@ts-ignore
        window.shutdown_binder = () => {
            fetch(with_token(new URL("../api/shutdown", binder_session_url)), { method: "POST" })
        }

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.created
                state.binder_session_url = binder_session_url
                state.binder_session_token = binder_session_token
            })
        )

        // fetch index to say hello to the pluto server. this ensures that the pluto server is running and it triggers JIT compiling some of the HTTP code.
        await fetch(with_token(binder_session_url))

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.responded
            })
        )

        /// PART 2: Using Pluto's REST API to open the notebook file. We either upload the notebook with a POST request, or we let the server open by giving it the filename/URL.

        let download_locally_and_upload = async () => {
            const upload_url = with_token(
                with_query_params(new URL("notebookupload", binder_session_url), {
                    name: new URLSearchParams(window.location.search).get("name"),
                    execution_allowed: "true",
                })
            )
            console.log(`downloading locally and uploading `, upload_url, launch_params.notebookfile)

            return fetch(upload_url, {
                method: "POST",
                body: await (await fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity }))).arrayBuffer(),
            })
        }

        let open_remotely = async (p1, p2) => {
            const open_url = with_query_params(new URL("open", binder_session_url), {
                [p1]: p2,
                execution_allowed: "true",
            })

            console.log(`open ${p1}:`, open_url)
            return fetch(with_token(open_url), {
                method: "POST",
            })
        }
        let open_remotely_fn = (p1, p2) => () => open_remotely(p1, p2)

        let methods_to_try = launch_params.notebookfile.startsWith("data:")
            ? [download_locally_and_upload]
            : [
                  //
                  open_remotely_fn("path", launch_params.notebookfile),
                  //
                  open_remotely_fn("url", new URL(launch_params.notebookfile, window.location.href).href),
                  //
                  download_locally_and_upload,
              ]

        let open_response = new Response()
        for (let method of methods_to_try) {
            open_response = await method()
            if (open_response.ok) {
                break
            }
        }

        if (!open_response.ok) {
            let b = await open_response.blob()
            window.location.href = URL.createObjectURL(b)
            return
        }

        // Opening a notebook gives us the notebook ID, which means that we have a running session! Time to connect.

        const new_notebook_id = await open_response.text()
        const edit_url = with_token(with_query_params(new URL("edit", binder_session_url), { id: new_notebook_id }))
        console.info("notebook_id:", new_notebook_id)

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.notebook.notebook_id = new_notebook_id
                state.backend_launch_phase = BackendLaunchPhase.notebook_running
                state.refresh_target = edit_url
            })
        )

        /// PART 3: We open the WebSocket connection to the Pluto server, connecting to the notebook ID that was created for us. If this fails, or after a 20 second timeout, we give up on hot-swapping a live backend into this static view, and instead we just redirect to the binder URL.

        console.log("Connecting WebSocket")

        const connect_promise = connect(with_token(new URL("channels", ws_address_from_base(binder_session_url))))
        await timeout_promise(connect_promise, 20_000).catch((e) => {
            console.error("Failed to establish connection within 20 seconds. Navigating to the edit URL directly.", e)
            window.parent.location.href = edit_url
        })
    } catch (err) {
        console.error("Failed to initialize binder!", err)
        alert("Something went wrong! 😮\n\nWe failed to initialize the binder connection. Please try again with a different browser, or come back later.")
    }
}
