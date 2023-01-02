import { html, useEffect, useRef, useState } from "../imports/Preact.js"

import { cl } from "../common/ClassTable.js"
import { prettytime, useMillisSinceTruthy } from "./RunArea.js"
import { DiscreteProgressBar } from "./DiscreteProgressBar.js"

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * my_clock_is_ahead_by: number,
 * }} props
 */
export let ProcessTab = ({ notebook, my_clock_is_ahead_by }) => {
    return html`
        <section>
            <${StatusItem} status_tree=${notebook.status_tree} my_clock_is_ahead_by=${my_clock_is_ahead_by} path=${[]} />
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

analysis
waiting_for_others
resolve
remove
add
instantiate

run


saving

`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)

const blocklist = ["saving"]

/** @type {Record<string,string>} */
const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Package management",
    instantiate1: "instantiate",
    instantiate2: "instantiate",
    run: "Evaluating cells",
    evaluate: "Running code",
    registry_update: "Updating package registry",
    waiting_for_others: "Waiting for other notebooks to finish package operations",
}

export const friendly_name = (/** @type {string} */ task_name) => {
    const descr = descriptions[task_name]

    return descr != null ? descr : isnumber(task_name) ? `Step ${task_name}` : task_name
}

const to_ns = (x) => x * 1e9

/**
 * @param {{
 * status_tree: import("./Editor.js").StatusEntryData?,
 * path: string[],
 * my_clock_is_ahead_by: number,
 * }} props
 */
const StatusItem = ({ status_tree, path, my_clock_is_ahead_by }) => {
    if (status_tree == null) return null
    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status_tree)
    if (!mystatus) return null

    const [is_open, set_is_open] = useState(path.length < 1)

    const started = path.length > 0 && is_started(mystatus)
    const finished = started && is_finished(mystatus)
    const busy = started && !finished

    const start = mystatus.started_at ?? 0
    const end = mystatus.finished_at ?? 0

    const local_busy_time = (useMillisSinceTruthy(busy) ?? 0) / 1000
    const mytime = Date.now() / 1000

    const busy_time = Math.max(local_busy_time, mytime - my_clock_is_ahead_by - start)

    useEffect(() => {
        if (busy) {
            let handle = setTimeout(() => {
                set_is_open(true)
            }, Math.max(100, 500 - path.length * 200))

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
                }, 1800 - path.length * 200)

                return () => clearTimeout(handle)
            }
        },
        [finished]
    )

    const render_child_tasks = () =>
        Object.entries(mystatus.subtasks)
            .sort((a, b) => sort_on(a[1], b[1]))
            .map(([key, _subtask]) =>
                blocklist.includes(key)
                    ? null
                    : html`<${StatusItem} key=${key} status_tree=${status_tree} my_clock_is_ahead_by=${my_clock_is_ahead_by} path=${[...path, key]} />`
            )

    const render_child_progress = () => {
        let kids = Object.values(mystatus.subtasks)
        let done = kids.reduce((acc, x) => acc + (is_finished(x) ? 1 : 0), 0)
        let busy = kids.reduce((acc, x) => acc + (is_busy(x) ? 1 : 0), 0)
        let total = kids.length

        return html`<${DiscreteProgressBar} busy=${busy} done=${done} total=${total} />`
    }

    const inner = is_open
        ? // are all kids a numbered task?
          Object.values(mystatus.subtasks).every((x) => isnumber(x.name)) && Object.values(mystatus.subtasks).length > 0
            ? render_child_progress()
            : render_child_tasks()
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

const isnumber = (str) => /^\d+$/.test(str)

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
        let m = (x) => (x === -1 ? Infinity : x)
        return m(a_order) - m(b_order)
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
