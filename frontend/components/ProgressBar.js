import _ from "../imports/lodash.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"
import { open_bottom_right_panel } from "./BottomRightPanel.js"
import { friendly_name, is_finished, path_to_first_busy_business, total_done, total_tasks } from "./ProcessTab.js"
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
            const currently = Object.values(notebook.cell_results)
                .filter((c) => c.running || c.queued)
                .map((c) => c.cell_id)

            set_currently_running(currently)

            if (currently.length === 0) {
                // all cells completed
                set_recently_running([])
            } else {
                // add any new running cells to our pile
                set_recently_running(_.union(currently, recently_running))
            }
        },
        Object.values(notebook.cell_results).map((c) => c.running || c.queued)
    )

    let cell_progress = recently_running.length === 0 ? 0 : 1 - Math.max(0, currently_running.length - 0.3) / recently_running.length

    let binder_loading = status.loading && status.binder

    let progress = binder_loading ? backend_launch_phase ?? 0 : cell_progress

    const [status_total, status_done] = useMemo(
        () =>
            notebook.status_tree == null
                ? [1, 1]
                : [
                      // total_tasks minus 1, to exclude the notebook task itself
                      total_tasks(notebook.status_tree) - 1,
                      // the notebook task should never be done, but lets be sure and subtract 1 if it is:
                      total_done(notebook.status_tree) - (is_finished(notebook.status_tree) ? 1 : 0),
                  ],
        [notebook.status_tree]
    )

    progress = status_done / status_total

    // const anything = (binder_loading || recently_running.length !== 0) && progress !== 1
    const anything = progress !== 1
    const anything_for_a_short_while = useDelayed(anything, 500) ?? false

    // const anything_for_a_long_while = useDelayed(anything, 500)

    // set to 1 when all cells completed, instead of moving the progress bar to the start
    // if (anything_for_a_short_while && !(binder_loading || recently_running.length !== 0)) {
    //     progress = 1
    // }

    const business_description = useMemo(
        () => (notebook.status_tree == null ? [] : path_to_first_busy_business(notebook.status_tree).map(friendly_name).join(" – ")),
        [notebook.status_tree]
    )

    const title = binder_loading ? "Loading binder..." : business_description

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
                open_bottom_right_panel("process")
                // const running_cell = Object.values(notebook.cell_results).find((c) => c.running) ?? Object.values(notebook.cell_results).find((c) => c.queued)
                // if (running_cell) {
                //     scroll_cell_into_view(running_cell.cell_id)
                // }
            }
        }}
        aria-valuenow=${100 * progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuetext=${title}
        title=${title}
    ></loading-bar>`
}
