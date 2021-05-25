import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect } from "../imports/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea, useDebouncedTruth } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"
import { useDropHandler } from "./useDropHandler.js"
import { PlutoContext } from "../common/PlutoContext.js"

/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  cell_input_local: import("./Editor.js").CellInputData,
 *  selected: boolean,
 *  selected_cells: Array<string>,
 *  force_hide_input: boolean,
 *  focus_after_creation: boolean,
 *  [key: string]: any,
 * }} props
 * */
export const Cell = ({
    cell_input: { cell_id, code, code_folded, is_running_disabled },
    cell_result: { queued, running, runtime, errored, output, published_objects, is_disabled },
    cell_dependencies: { downstream_cells_map, upstream_cells_map, precedence_heuristic },
    cell_input_local,
    notebook_id,
    on_update_doc_query,
    on_change,
    on_focus_neighbor,
    selected,
    selected_cells,
    force_hide_input,
    focus_after_creation,
    is_process_ready,
    disable_input,
}) => {
    let pluto_actions = useContext(PlutoContext)
    const notebook = pluto_actions.get_notebook()
    const variables = Object.keys(notebook?.cell_dependencies?.[cell_id]?.downstream_cells_map || {})
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = useState(null)
    const { saving_file, drag_active, handler } = useDropHandler()
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

    // When you click to run a cell, we use `waiting_to_run` to immediately set the cell's traffic light to 'queued', while waiting for the backend to catch up.
    const [waiting_to_run, set_waiting_to_run] = useState(false)
    useEffect(() => {
        set_waiting_to_run(false)
    }, [queued, running, output?.last_run_timestamp, is_disabled, is_running_disabled])
    // We activate animations instantly BUT deactivate them NSeconds later.
    // We then toggle animation visibility using opacity. This saves a bunch of repaints.
    const activate_animation = useDebouncedTruth(running || queued || waiting_to_run)

    const class_code_differs = code !== (cell_input_local?.code ?? code)
    const class_code_folded = code_folded && cm_forced_focus == null

    // during the initial page load, force_hide_input === true, so that cell outputs render fast, and codemirrors are loaded after
    let show_input = !force_hide_input && (errored || class_code_differs || !class_code_folded)

    const node_ref = useRef(null)

    const [cell_api_ready, set_cell_api_ready] = useState(false)
    const published_objects_ref = useRef(published_objects)
    published_objects_ref.current = published_objects
    const disable_input_ref = useRef(disable_input)
    disable_input_ref.current = disable_input
    const should_set_waiting_to_run_ref = useRef(true)
    should_set_waiting_to_run_ref.current = !is_running_disabled && !is_disabled
    const set_waiting_to_run_smart = (x) => set_waiting_to_run(x && should_set_waiting_to_run_ref.current)

    useLayoutEffect(() => {
        Object.assign(node_ref.current, {
            getPublishedObject: (id) => published_objects_ref.current[id],
            _internal_pluto_actions: pluto_actions,
        })

        set_cell_api_ready(true)
    })

    return html`
        <pluto-cell
            ref=${node_ref}
            onDragOver=${handler}
            onDrop=${handler}
            onDragEnter=${handler}
            onDragLeave=${handler}
            class=${cl({
                queued: queued || (waiting_to_run && is_process_ready),
                running: running,
                activate_animation: activate_animation,
                errored: errored,
                selected: selected,
                code_differs: class_code_differs,
                code_folded: class_code_folded,
                is_running_disabled: is_running_disabled,
                is_disabled: is_disabled,
                show_input: show_input,
                drop_target: drag_active,
                saving_file: saving_file,
            })}
            id=${cell_id}
        >
            ${variables.map((name) => html`<span id=${encodeURI(name)} />`)}
            <pluto-shoulder draggable="true" title="Drag to move cell">
                <button
                    onClick=${() => {
                        let cells_to_fold = selected ? selected_cells : [cell_id]
                        pluto_actions.update_notebook((notebook) => {
                            for (let cell_id of cells_to_fold) {
                                notebook.cell_inputs[cell_id].code_folded = !code_folded
                            }
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
                    pluto_actions.add_remote_cell(cell_id, "before")
                }}
                class="add_cell before"
                title="Add cell"
            >
                <span></span>
            </button>
            ${cell_api_ready ? html`<${CellOutput} ...${output} cell_id=${cell_id} />` : html``}
            <${CellInput}
                local_code=${cell_input_local?.code ?? code}
                remote_code=${code}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                show_input=${show_input}
                on_drag_drop_events=${handler}
                on_submit=${() => {
                    if (!disable_input_ref.current) {
                        set_waiting_to_run_smart(true)
                        pluto_actions.set_and_run_multiple([cell_id])
                    }
                }}
                on_delete=${() => {
                    let cells_to_delete = selected ? selected_cells : [cell_id]
                    pluto_actions.confirm_delete_multiple("Delete", cells_to_delete)
                }}
                on_add_after=${() => {
                    pluto_actions.add_remote_cell(cell_id, "after")
                }}
                on_fold=${(new_folded) => pluto_actions.fold_remote_cell(cell_id, new_folded)}
                on_change=${(new_code) => {
                    if (!disable_input_ref.current) {
                        if (code_folded && cm_forced_focus != null) {
                            pluto_actions.fold_remote_cell(cell_id, false)
                        }
                        on_change(new_code)
                    }
                }}
                on_update_doc_query=${on_update_doc_query}
                on_focus_neighbor=${on_focus_neighbor}
                cell_id=${cell_id}
                notebook_id=${notebook_id}
                is_running_disabled=${is_running_disabled}
            />
            <${RunArea}
                cell_id=${cell_id}
                disabled=${is_running_disabled || is_disabled}
                onClick=${() => {
                    if (running || queued) {
                        pluto_actions.interrupt_remote(cell_id)
                    } else {
                        if (is_running_disabled == false) {
                            // this is the status before the change
                            set_waiting_to_run_smart(true)
                            let cell_to_run = selected ? selected_cells : [cell_id]
                            pluto_actions.set_and_run_multiple(cell_to_run)
                        }
                    }
                }}
                runtime=${runtime}
                running=${running}
            />
            <button
                onClick=${() => {
                    pluto_actions.add_remote_cell(cell_id, "after")
                }}
                class="add_cell after"
                title="Add cell"
            >
                <span></span>
            </button>
        </pluto-cell>
    `
}
