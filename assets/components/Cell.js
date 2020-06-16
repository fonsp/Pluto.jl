import { html } from "../common/Html.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"

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

export const code_differs = (cell) => cell.remote_code.body !== cell.local_code.body

export const Cell = ({
    cell_id,
    remote_code,
    local_code,
    code_folded,
    running,
    runtime,
    errored,
    output,
    on_change,
    on_update_doc_query,
    disable_input,
    create_focus,
    all_completed_promise,
    requests,
    client,
}) => {
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
                on_submit=${(new_code) => {
                    requests.change_remote_cell(cell_id, new_code)
                }}
                on_delete=${() => {
                    requests.delete_cell(cell_id)
                }}
                on_add_after=${() => {
                    requests.add_remote_cell(cell_id, "after")
                }}
                on_change=${on_change}
                on_update_doc_query=${on_update_doc_query}
                client=${client} 
                disable_input=${disable_input}
                create_focus=${create_focus}
                cell_id=${cell_id}
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
