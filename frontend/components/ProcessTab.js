import { html, useContext, useEffect, useMemo } from "../imports/Preact.js"

import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"
import { prettytime, useMillisSinceTruthy } from "./RunArea.js"

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * my_clock_is_ahead_by: number,
 * }} props
 */
export let ProcessTab = ({ notebook, my_clock_is_ahead_by }) => {
    let pluto_actions = useContext(PlutoActionsContext)

    console.log({ t: notebook.current_time, my_clock_is_ahead_by })

    return html`
        <section>
            <${StatusItem} status=${notebook.status} path=${[]} my_clock_is_ahead_by=${my_clock_is_ahead_by} />
        </section>
    `
}

/**
 * Status items are sorted in the same order as they appear in list. Unspecified items are sorted to the end.
 */
const global_order = `
workspace

create_process
init_process

pkg

waiting_for_others
analysis
remove
add
update
instantiate

saving
save

run
`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)

const to_ns = (x) => x * 1e9

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * path: string[],
 * my_clock_is_ahead_by: number,
 * }} props
 */
const StatusItem = ({ status, path, my_clock_is_ahead_by }) => {
    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status)

    if (!mystatus) {
        return null
    }

    const started = mystatus.started_at != null
    const finished = mystatus.finished_at != null
    const busy = started && !finished

    const start = mystatus.started_at ?? 0
    const end = mystatus.finished_at ?? 0

    // We don't actually use this value, but it's a great way to trigger a re-render on a timer!
    useMillisSinceTruthy(busy)

    return html`<pl-status
        data-depth=${path.length}
        class=${cl({
            started,
            finished,
            busy,
        })}
    >
        <div>
            <span class="status-icon"></span>
            <span class="status-name">${mystatus.name}</span>
            <span class="status-time"
                >${finished ? prettytime(to_ns(end - start)) : busy ? prettytime(to_ns(Date.now() / 1000 - my_clock_is_ahead_by - start)) : null}</span
            >
        </div>
        ${Object.entries(mystatus.subtasks)
            .sort((a, b) => global_order.indexOf(a[0]) - global_order.indexOf(b[0]))
            .map(([key, subtask]) => html`<${StatusItem} status=${status} path=${[...path, key]} my_clock_is_ahead_by=${my_clock_is_ahead_by} />`)}
    </pl-status>`
}
