import immer from "../imports/immer.js"
import { BackendLaunchPhase } from "./Binder.js"
import { timeout_promise } from "./PlutoConnection.js"

/**
 *
 * @param {{
 *  launch_params: import("../components/Editor.js").LaunchParameters,
 *  setStatePromise: any,
 *  connect: () => Promise<void>,
 * }} props
 */
export const start_local = async ({ setStatePromise, connect, launch_params }) => {
    try {
        await setStatePromise(
            immer((state) => {
                state.backend_launch_phase = BackendLaunchPhase.created
                state.disable_ui = false
            })
        )

        const with_token = (x) => String(x)
        const binder_session_url = new URL(launch_params.pluto_server_url, window.location.href)

        let open_response

        open_response = await fetch(with_token(new URL("notebookupload", binder_session_url)), {
            method: "POST",
            body: await (await fetch(launch_params.notebookfile)).arrayBuffer(),
        })

        const new_notebook_id = await open_response.text()
        const edit_url = with_query_params(new URL("edit", binder_session_url), { id: new_notebook_id })
        console.info("notebook_id:", new_notebook_id)

        window.history.replaceState({}, "", edit_url)

        await setStatePromise(
            immer((state) => {
                state.notebook.notebook_id = new_notebook_id
                state.backend_launch_phase = BackendLaunchPhase.notebook_running
            })
        )
        console.log("Connecting WebSocket")

        const connect_promise = connect()
        await timeout_promise(connect_promise, 20_000).catch((e) => {
            console.error("Failed to establish connection within 20 seconds. Navigating to the edit URL directly.", e)

            window.parent.location.href = with_token(edit_url)
        })
    } catch (err) {
        console.error("Failed to initialize binder!", err)
        alert("Something went wrong! 😮\n\nWe failed to initialize the binder connection. Please try again with a different browser, or come back later.")
    }
}
