import { html, useEffect, useRef, useState } from "../imports/Preact.js"

import { cl } from "../common/ClassTable.js"
import { prettytime, useMillisSinceTruthy } from "./RunArea.js"

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * }} props
 */
export let ProcessTab = ({ notebook }) => {
    // <p>${path_to_first_busy_business(notebook.status_tree).map(friendly_name).join(" – ")}</p>
    return html`
        <section>
            <${StatusItem} status_tree=${notebook.status_tree} path=${[]} />
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


run


saving
save

`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)

/** @type {Record<string,string>} */
const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Package management",
    run: "Evaluating cells",
}

export const friendly_name = (/** @type {string} */ task_name) => {
    const descr = descriptions[task_name]

    return descr != null ? descr : isnumber(task_name) ? `Step ${task_name}` : task_name
}

const to_ns = (x) => x * 1e9

/**
 * @param {{
 * status_tree: import("./Editor.js").StatusEntryData,
 * path: string[],
 * }} props
 */
const StatusItem = ({ status_tree, path }) => {
    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status_tree)

    const [is_open, set_is_open] = useState(path.length < 1)

    if (!mystatus) {
        return null
    }

    const started = path.length > 0 && is_started(mystatus)
    const finished = started && is_finished(mystatus)
    const busy = started && !finished

    const start = mystatus.started_at ?? 0
    const end = mystatus.finished_at ?? 0

    const local_busy_time = (useMillisSinceTruthy(busy) ?? 0) / 1000
    const busy_time = Math.max(local_busy_time, Date.now() / 1000 - start)

    useEffect(() => {
        if (busy) {
            let handle = setTimeout(() => {
                set_is_open(true)
            }, 500)

            return () => clearTimeout(handle)
        }
    }, [busy])
    useEffectWithPrevious(
        ([old_finished]) => {
            if (!old_finished && finished) {
                // let audio = new Audio("https://proxy.notificationsounds.com/message-tones/succeeded-message-tone/download/file-sounds-1210-succeeded.mp3")
                // audio.play()

                let handle = setTimeout(() => {
                    set_is_open(false)
                }, 1500)

                return () => clearTimeout(handle)
            }
        },
        [finished]
    )

    const inner = is_open
        ? Object.entries(mystatus.subtasks)
              .sort((a, b) => sort_on(a[1], b[1]))
              .map(([key, _subtask]) => html`<${StatusItem} key=${key} status_tree=${status_tree} path=${[...path, key]} />`)
        : null

    let inner_progress = null
    if (started) {
        let t = total_tasks(mystatus)
        let d = total_done(mystatus)

        if (t > 1) {
            inner_progress = html`<span class="subprogress-counter">${" "}(${d}/${t})</span>`
        }
    }

    return path.length === 0
        ? inner
        : html`<pl-status
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
                  <span class="status-name">${friendly_name(mystatus.name)}${inner_progress}</span>
                  <span class="status-time">${finished ? prettytime(to_ns(end - start)) : busy ? prettytime(to_ns(busy_time)) : null}</span>
              </div>
              ${inner}
          </pl-status>`
}

const isnumber = (str) => !isNaN(str)

/**
 * @param {import("./Editor.js").StatusEntryData} a
 * @param {import("./Editor.js").StatusEntryData} b
 */
const sort_on = (a, b) => {
    const a_order = global_order.indexOf(a.name)
    const b_order = global_order.indexOf(b.name)
    if (a_order === -1 && b_order === -1) {
        if (a.started_at != null || b.started_at != null) {
            return (a.started_at ?? Infinity) - (b.started_at ?? Infinity)
        } else if (isnumber(a.name) && isnumber(b.name)) {
            return parseInt(a.name) - parseInt(b.name)
        } else {
            return a.name.localeCompare(b.name)
        }
    } else {
        return a_order - b_order
    }
}

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
export const is_finished = (status) => status.finished_at != null

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
export const is_started = (status) => status.started_at != null

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
export const is_busy = (status) => is_started(status) && !is_finished(status)

/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
export const total_done = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_done(status), is_finished(status) ? 1 : 0)

/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
export const total_tasks = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_tasks(status), 1)

/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {string[]}
 */
export const path_to_first_busy_business = (status) => {
    for (let [name, child_status] of Object.entries(status.subtasks).sort((a, b) => sort_on(a[1], b[1]))) {
        if (is_busy(child_status)) {
            return [name, ...path_to_first_busy_business(child_status)]
        }
    }
    return []
}

/** Like `useEffect`, but the handler function gets the previous deps value as argument. */
const useEffectWithPrevious = (fn, deps) => {
    const ref = useRef(deps)
    useEffect(() => {
        let result = fn(ref.current)
        ref.current = deps
        return result
    }, deps)
}
