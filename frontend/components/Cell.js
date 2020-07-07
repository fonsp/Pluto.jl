import { html, Component, useState, useEffect } from "../common/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"

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
 * @property {boolean} running
 * @property {?number} runtime
 * @property {boolean} errored
 * @property {{body: string, timestamp: number, mime: string, rootassignee: ?string}} output
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
        running: true,
        runtime: null,
        errored: false,
        output: {
            body: null,
            timestamp: 0, // proof that Apollo 11 used Jupyter!
            mime: "text/plain",
            rootassignee: null,
        },
    }
}

/**
 *
 * @param {CellState} cell
 * @return {boolean}
 */
export const code_differs = (cell) => cell.remote_code.body !== cell.local_code.body

export const Cell = ({
    remote_code,
    local_code,
    code_folded,
    running,
    runtime,
    errored,
    output,
    on_change,
    on_update_doc_query,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    all_completed_promise,
    requests,
    client,
    cell_id,
    notebook_id,
}) => {
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = useState(null)

    useEffect(() => {
        const focusListener = (e) => {
            if (e.detail.cell_id === cell_id) {
                if (e.detail.line != null) {
                    set_cm_forced_focus([{ line: e.detail.line, ch: 0 }, { line: e.detail.line, ch: Infinity }, { scroll: true }])
                }
            }
        }
        window.addEventListener("cell_focus", focusListener)
        // cleanup
        return () => {
            window.removeEventListener("cell_focus", focusListener)
        }
    }, [])

    return html`
        <cell
            class=${cl({
                "running": running,
                "output-notinsync": output.body == null,
                "has-assignee": !output.errored && output.rootassignee != null,
                "inline-output": !output.errored && !!output.body && (output.mime == "application/vnd.pluto.tree+xml" || output.mime == "text/plain"),
                "error": errored,
                "code-differs": remote_code.body !== local_code.body,
                "code-folded": code_folded && cm_forced_focus == null,
            })}
            id=${cell_id}
        >
            <cellshoulder draggable="true" title="Drag to move cell">
                <button
                    onClick=${() => {
                        requests.fold_remote_cell(cell_id, !code_folded)
                    }}
                    class="foldcode"
                    title="Show/hide code"
                >
                    <span></span>
                </button>
            </cellshoulder>
            <trafficlight></trafficlight>
            <button
                onClick=${() => {
                    requests.add_remote_cell(cell_id, "before")
                }}
                class="addcell before"
                title="Add cell"
            >
                <span></span>
            </button>
            <${CellOutput} ...${output} all_completed_promise=${all_completed_promise} requests=${requests} cell_id=${cell_id} />
            <${CellInput}
                remote_code=${remote_code}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                on_submit=${(new_code) => {
                    requests.change_remote_cell(cell_id, new_code)
                }}
                on_delete=${() => {
                    requests.delete_cell(cell_id)
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
            <${RunArea}
                onClick=${() => {
                    if (running) {
                        requests.interrupt_remote(cell_id)
                    } else {
                        requests.change_remote_cell(cell_id, local_code.body)
                    }
                }}
                runtime=${runtime}
            />
            <button
                onClick=${() => {
                    requests.add_remote_cell(cell_id, "after")
                }}
                class="addcell after"
                title="Add cell"
            >
                <span></span>
            </button>
        </cell>
    `
}
