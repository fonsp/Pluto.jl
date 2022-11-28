import { html, useState } from "../imports/Preact.js"

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

const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Package management",
    run: "Evaluating cells",
}

const to_ns = (x) => x * 1e9

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * path: string[],
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

    const inner = is_open
        ? Object.entries(mystatus.subtasks)
              .sort((a, b) => sort_on(a[1], b[1]))
              .map(([key, _subtask]) => html`<${StatusItem} key=${key} status=${status} path=${[...path, key]} />`)
        : null

    let inner_progress = null
    if (busy) {
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
                  <span class="status-name"
                      >${
                          descr != null ? descr : isnumber(mystatus.name) ? `Step ${mystatus.name}` : mystatus.name
                          // html`<code>${mystatus.name}</code>`
                      }${inner_progress}</span
                  >
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
const total_done = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_done(status), status.finished_at != null ? 1 : 0)

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const total_tasks = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_tasks(status), 1)
