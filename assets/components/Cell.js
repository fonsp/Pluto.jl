import { html } from "./Editor.js"
import { render, Component } from "https://unpkg.com/preact@10.4.4?module"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"

export function empty_cell_data(cell_id) {
    return {
        cell_id: cell_id,
        remote_code: {
            body: "",
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
            mime: "text/plain",
            rootassignee: null,
        },
    }
}

export const Cell = ({ cell_id, remote_code, local_code, code_folded, running, runtime, errored, output, remote, on_change, on_update_doc_query, requests }) => {
    return html`
        <cell
            class=${cl({
                running: running,
                "output-notinsync": output.body == null,
                "has-assignee": !output.errored && output.rootassignee != null,
                "inline-output": !output.errored && !!output.body && (output.mime == "application/vnd.pluto.tree+xml" || output.mime == "text/plain"),
                error: errored,
                "code-differs": remote_code.body !== local_code.body,
                "code-folded": code_folded,
            })}
            id=${cell_id}
        >
            <cellshoulder draggable="true" title="Drag to move cell">
                <button
                    onClick=${() => {
                        requests.fold_cell(cell_id, !code_folded)
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
                    requests.add_cell(cell_id, "before")
                }}
                class="addcell before"
                title="Add cell"
            >
                <span></span>
            </button>
            <${CellOutput} ...${output} cell_id=${cell_id} />
            <${CellInput}
                remote_code=${remote_code}
                on_submit=${(newCode) => {
                    requests.change_cell(cell_id, newCode)
                }}
                on_delete=${() => {
                    requests.delete_cell(cell_id)
                }}
                on_change=${on_change}
                on_update_doc_query=${on_update_doc_query}
            />
            <${RunArea}
                onClick=${() => {
                    if (running) {
                        // TODO
                        newCellNode.classList.add("error")
                        requests.interrupt()
                    } else {
                        requests.change_cell(cell_id)
                    }
                }}
                runtime=${runtime}
            />
            <button
                onClick=${() => {
                    requests.add_cell(cell_id, "after")
                }}
                class="addcell after"
                title="Add cell"
            >
                <span></span>
            </button>
        </cell>
    `
}
