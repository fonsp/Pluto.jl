import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"

import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"
import { prettytime, useMillisSinceTruthy } from "./RunArea.js"

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * }} props
 */
export let ProcessTab = ({ notebook }) => {
    return html`
        <section>
            <${StatusItem} status=${notebook.status} path=${[]} />
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


saving
save

pkg

waiting_for_others
analysis
remove
add
update
instantiate


run
`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)

const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Packages",
    run: "Evaluating cells",
}

const to_ns = (x) => x * 1e9

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * path: string[],
 * my_clock_is_ahead_by: number,
 * }} props
 */
const StatusItem = ({ status, path }) => {
    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status)

    const [is_open, set_is_open] = useState(path.length < 1)

    if (!mystatus) {
        return null
    }

    const started = path.length > 0 && mystatus.started_at != null
    const finished = started && mystatus.finished_at != null
    const busy = started && !finished

    const start = mystatus.started_at ?? 0
    const end = mystatus.finished_at ?? 0

    const local_busy_time = (useMillisSinceTruthy(busy) ?? 0) / 1000
    const busy_time = Math.max(local_busy_time, Date.now() / 1000 - start)

    const descr = descriptions[mystatus.name]

    return html`<pl-status
        data-depth=${path.length}
        class=${cl({
            started,
            finished,
            busy,
            is_open,
            can_open: Object.values(mystatus.subtasks).length > 0,
        })}
    >
        <div
            onClick=${(e) => {
                set_is_open(!is_open)
            }}
        >
            <span class="status-icon"></span>
            <span class="status-name"
                >${
                    descr != null ? descr : mystatus.name
                    // html`<code>${mystatus.name}</code>`
                }</span
            >
            <span class="status-time"
                >${finished ? prettytime(to_ns(end - start)) : busy ? prettytime(to_ns(Date.now() / 1000 - my_clock_is_ahead_by - start)) : null}</span
            >
        </div>
        ${is_open
            ? Object.entries(mystatus.subtasks)
                  .sort((a, b) => global_order.indexOf(a[0]) - global_order.indexOf(b[0]))
                  .map(
                      ([key, subtask]) =>
                          html`<${StatusItem} key=${key} status=${status} path=${[...path, key]} my_clock_is_ahead_by=${my_clock_is_ahead_by} />`
                  )
            : null}
    </pl-status>`
}
