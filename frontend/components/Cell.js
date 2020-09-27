import { html, useState, useEffect, useLayoutEffect, useRef } from "../common/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"

const observeViewport = () => {

  const cellReference = useRef(null)
  const [cell_in_viewport, set_cell_in_viewport] = useState(null)

  useEffect(() => {
    let observer = new IntersectionObserver((entries, observer) => {
      set_cell_in_viewport(entries[0].isIntersecting)
    }, {})

    observer.observe(cellReference.current)
  }, [])

  return { cellReference, cell_in_viewport }
}

/**
 * @typedef {Object} CodeState
 * @property {string} body
 * @property {number} [timestamp]
 * @property {boolean} [submitted_by_me]
 */

/**
 * A cell!
 * @typedef {Object} CellState
 * @property {string} cell_id
 * @property {CodeState} remote_code
 * @property {CodeState} local_code
 * @property {boolean} code_folded
 * @property {boolean} queued
 * @property {boolean} running
 * @property {?number} runtime
 * @property {boolean} errored
 * @property {{body: string, timestamp: number, mime: string, rootassignee: ?string}} output
 * @property {boolean} selected
 */

/**
 *
 * @param {string} cell_id
 * @returns {CellState}
 */
export const empty_cell_data = (cell_id) => {
    return {
        cell_id: cell_id,
        remote_code: {
            body: "",
            timestamp: 0, // don't use Pluto before 1970!
            submitted_by_me: false,
        },
        local_code: {
            body: "",
        },
        code_folded: false,
        queued: true,
        running: false,
        runtime: null,
        errored: false,
        output: {
            body: null,
            timestamp: 0, // proof that Apollo 11 used Jupyter!
            mime: "text/plain",
            rootassignee: null,
        },
        selected: false,
    }
}

/**
 *
 * @param {CellState} cell
 * @return {boolean}
 */
export const code_differs = (cell) => cell.remote_code.body !== cell.local_code.body

export const Cell = ({
    cell_id,
    remote_code,
    local_code,
    code_folded,
    queued,
    running,
    runtime,
    errored,
    output,
    selected,
    on_change,
    on_update_doc_query,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    all_completed_promise,
    selected_friends,
    requests,
    client,
    notebook_id,
}) => {
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = useState(null)

    useEffect(() => {
        const focusListener = (e) => {
            if (e.detail.cell_id === cell_id) {
                if (e.detail.line != null) {
                    const ch = e.detail.ch
                    if (ch == null) {
                        set_cm_forced_focus([{ line: e.detail.line, ch: 0 }, { line: e.detail.line, ch: Infinity }, { scroll: true }])
                    } else {
                        set_cm_forced_focus([{ line: e.detail.line, ch: ch }, { line: e.detail.line, ch: ch }, { scroll: true }])
                    }
                }
            }
        }
        window.addEventListener("cell_focus", focusListener)
        // cleanup
        return () => {
            window.removeEventListener("cell_focus", focusListener)
        }
    }, [])

    const { cellReference, cell_in_viewport } = observeViewport()

    const class_code_differs = remote_code.body !== local_code.body
    const class_code_folded = code_folded && cm_forced_focus == null

    return html`
        <pluto-cell
            class=${cl({
                queued: queued,
                running: running,
                errored: errored,
                selected: selected,
                code_differs: class_code_differs,
                code_folded: class_code_folded,
            })}
            id=${cell_id}
        >
            <pluto-shoulder draggable="true" title="Drag to move cell">
                <button
                    onClick=${() => {
                        selected_friends(cell_id).forEach((friend) => {
                            requests.fold_remote_cell(friend.cell_id, !code_folded)
                        })
                    }}
                    class="foldcode"
                    title="Show/hide code"
                >
                    <span></span>
                </button>
            </pluto-shoulder>
            <pluto-trafficlight></pluto-trafficlight>
            <button
                onClick=${() => {
                    requests.add_remote_cell(cell_id, "before")
                }}
                class="add_cell before"
                title="Add cell"
            >
                <span></span>
            </button>
            <${CellOutput} ...${output} all_completed_promise=${all_completed_promise} requests=${requests} cell_id=${cell_id} />
            <div ref=${cellReference}>
            <${CellInput}
                is_hidden=${!errored && !class_code_folded && class_code_folded && !cell_in_viewport}
                local_code=${local_code}
                remote_code=${remote_code}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                on_submit=${(new_code) => {
                    requests.change_remote_cell(cell_id, new_code)
                }}
                on_delete=${() => {
                    const friends = selected_friends(cell_id)
                    requests.confirm_delete_multiple(friends)
                }}
                on_add_after=${() => {
                    requests.add_remote_cell(cell_id, "after")
                }}
                on_fold=${(new_folded) => requests.fold_remote_cell(cell_id, new_folded)}
                on_change=${(new_code) => {
                    if (code_folded && cm_forced_focus != null) {
                        requests.fold_remote_cell(cell_id, false)
                    }
                    on_change(new_code)
                }}
                on_update_doc_query=${on_update_doc_query}
                on_focus_neighbor=${on_focus_neighbor}
                client=${client}
                cell_id=${cell_id}
                notebook_id=${notebook_id}
            />
            </div>
            <${RunArea}
                onClick=${() => {
                    if (running || queued) {
                        requests.interrupt_remote(cell_id)
                    } else {
                        const friends = selected_friends(cell_id)

                        if (friends.length == 1) {
                            requests.change_remote_cell(cell_id, local_code.body)
                        } else {
                            requests.set_and_run_multiple(friends)
                        }
                    }
                }}
                runtime=${runtime}
            />
            <button
                onClick=${() => {
                    requests.add_remote_cell(cell_id, "after")
                }}
                class="add_cell after"
                title="Add cell"
            >
                <span></span>
            </button>
        </pluto-cell>
    `
}
