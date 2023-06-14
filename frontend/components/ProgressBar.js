import _ from "../imports/lodash.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"
import { is_queued, is_queued_or_running, is_running } from "./Cell.js"
import { scroll_cell_into_view } from "./Scroller.js"

export const useDelayed = (value, delay = 500) => {
    const [current, set_current] = useState(null)

    useEffect(() => {
        const timer = setTimeout(() => {
            set_current(value)
        }, delay)
        return () => clearTimeout(timer)
    }, [value])

    return current
}

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * backend_launch_phase: number?,
 * status: Record<string,any>,
 * }} props
 */
export const ProgressBar = ({ notebook, backend_launch_phase, status }) => {
    const [recently_running, set_recently_running] = useState(/** @type {string[]} */ ([]))
    const [currently_running, set_currently_running] = useState(/** @type {string[]} */ ([]))

    useEffect(
        () => {
            const currently = notebook.cell_order.filter((c) => is_queued_or_running(notebook.cell_inputs[c], notebook.cell_results[c]))

            set_currently_running(currently)

            if (currently.length === 0) {
                // all cells completed
                set_recently_running([])
            } else {
                // add any new running cells to our pile
                set_recently_running(_.union(currently, recently_running))
            }
        },
        notebook.cell_order.map((c) => is_queued_or_running(notebook.cell_inputs[c], notebook.cell_results[c]))
    )

    let cell_progress = recently_running.length === 0 ? 0 : 1 - Math.max(0, currently_running.length - 0.3) / recently_running.length

    let binder_loading = status.loading && status.binder
    let progress = binder_loading ? backend_launch_phase ?? 0 : cell_progress

    const anything = (binder_loading || recently_running.length !== 0) && progress !== 1
    const anything_for_a_short_while = useDelayed(anything, 500) ?? false
    // const anything_for_a_long_while = useDelayed(anything, 500)

    // set to 1 when all cells completed, instead of moving the progress bar to the start
    if (anything_for_a_short_while && !(binder_loading || recently_running.length !== 0)) {
        progress = 1
    }

    const title = binder_loading
        ? "Loading binder..."
        : `Running cells... (${recently_running.length - currently_running.length}/${recently_running.length} done)`

    return html`<loading-bar
        class=${binder_loading ? "slow" : "fast"}
        style=${`
            width: ${100 * progress}vw; 
            opacity: ${anything && anything_for_a_short_while ? 1 : 0}; 
            ${anything || anything_for_a_short_while ? "" : "transition: none;"}
            pointer-events: ${anything ? "auto" : "none"};
            cursor: ${!binder_loading && anything ? "pointer" : "auto"};
        `}
        onClick=${(e) => {
            if (!binder_loading) {
                const running_cell_id =
                    notebook.cell_order.find((c) => is_running(notebook.cell_inputs[c], notebook.cell_results[c])) ??
                    notebook.cell_order.find((c) => is_queued(notebook.cell_inputs[c], notebook.cell_results[c]))

                if (running_cell_id != null) {
                    scroll_cell_into_view(running_cell_id)
                }
            }
        }}
        aria-valuenow=${100 * progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuetext=${title}
        title=${title}
    ></loading-bar>`
}
