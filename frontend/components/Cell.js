import _ from "../imports/lodash.js"
import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect, useCallback } from "../imports/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { Logs } from "./Logs.js"
import { RunArea, useDebouncedTruth } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"
import { PlutoContext } from "../common/PlutoContext.js"

const useCellApi = (node_ref, published_object_keys, pluto_actions) => {
    const [cell_api_ready, set_cell_api_ready] = useState(false)
    const published_object_keys_ref = useRef(published_object_keys)
    published_object_keys_ref.current = published_object_keys

    useLayoutEffect(() => {
        Object.assign(node_ref.current, {
            getPublishedObject: (id) => {
                if (!published_object_keys_ref.current.includes(id)) throw `getPublishedObject: ${id} not found`
                return pluto_actions.get_published_object(id)
            },
            _internal_pluto_actions: pluto_actions,
        })

        set_cell_api_ready(true)
    })

    return cell_api_ready
}

/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  cell_input_local: import("./Editor.js").CellInputData,
 *  cell_dependencies: import("./Editor.js").CellDependencyData
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 *  selected: boolean,
 *  force_hide_input: boolean,
 *  focus_after_creation: boolean,
 *  [key: string]: any,
 * }} props
 * */
export const Cell = ({
    cell_input: { cell_id, code, code_folded, metadata },
    cell_result: { queued, running, runtime, errored, output, logs, published_object_keys, depends_on_disabled_cells },
    cell_dependencies,
    cell_input_local,
    notebook_id,
    selected,
    force_hide_input,
    focus_after_creation,
    is_process_ready,
    disable_input,
    nbpkg,
    global_definition_locations,
}) => {
    const { disabled: running_disabled } = metadata
    let pluto_actions = useContext(PlutoContext)
    const on_update_doc_query = pluto_actions.set_doc_query
    const on_focus_neighbor = pluto_actions.focus_on_neighbor
    const on_change = useCallback((val) => pluto_actions.set_local_cell(cell_id, val), [cell_id, pluto_actions])
    const variables = useMemo(() => Object.keys(cell_dependencies?.downstream_cells_map ?? {}), [cell_dependencies])
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = useState(null)
    const [cm_highlighted_line, set_cm_highlighted_line] = useState(null)
    const [show_logs, set_show_logs] = useState(true)

    const any_logs = useMemo(() => !_.isEmpty(logs), [logs])

    useEffect(() => {
        if (!any_logs) {
            set_show_logs(true)
        }
    }, [any_logs])

    useEffect(() => {
        const focusListener = (e) => {
            if (e.detail.cell_id === cell_id) {
                if (e.detail.line != null) {
                    const ch = e.detail.ch
                    if (ch == null) {
                        set_cm_forced_focus([
                            { line: e.detail.line, ch: 0 },
                            { line: e.detail.line, ch: Infinity },
                            { scroll: true, definition_of: e.detail.definition_of },
                        ])
                    } else {
                        set_cm_forced_focus([
                            { line: e.detail.line, ch: ch },
                            { line: e.detail.line, ch: ch },
                            { scroll: true, definition_of: e.detail.definition_of },
                        ])
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
    }, [queued, running, output?.last_run_timestamp, depends_on_disabled_cells, running_disabled])
    // We activate animations instantly BUT deactivate them NSeconds later.
    // We then toggle animation visibility using opacity. This saves a bunch of repaints.
    const activate_animation = useDebouncedTruth(running || queued || waiting_to_run)

    const class_code_differs = code !== (cell_input_local?.code ?? code)
    const class_code_folded = code_folded && cm_forced_focus == null

    // during the initial page load, force_hide_input === true, so that cell outputs render fast, and codemirrors are loaded after
    let show_input = !force_hide_input && (errored || class_code_differs || !class_code_folded)

    const [line_heights, set_line_heights] = useState([15])
    const node_ref = useRef(null)

    const disable_input_ref = useRef(disable_input)
    disable_input_ref.current = disable_input
    const should_set_waiting_to_run_ref = useRef(true)
    should_set_waiting_to_run_ref.current = !running_disabled && !depends_on_disabled_cells
    const set_waiting_to_run_smart = (x) => set_waiting_to_run(x && should_set_waiting_to_run_ref.current)

    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions)
    const on_delete = useCallback(() => {
        pluto_actions.confirm_delete_multiple("Delete", pluto_actions.get_selected_cells(cell_id, selected))
    }, [pluto_actions, selected, cell_id])
    const on_submit = useCallback(() => {
        if (!disable_input_ref.current) {
            set_waiting_to_run_smart(true)
            pluto_actions.set_and_run_multiple([cell_id])
        }
    }, [pluto_actions, set_waiting_to_run, cell_id])
    const on_change_cell_input = useCallback(
        (new_code) => {
            if (!disable_input_ref.current) {
                if (code_folded && cm_forced_focus != null) {
                    pluto_actions.fold_remote_cells([cell_id], false)
                }
                on_change(new_code)
            }
        },
        [code_folded, cm_forced_focus, pluto_actions, on_change]
    )
    const on_add_after = useCallback(() => {
        pluto_actions.add_remote_cell(cell_id, "after")
    }, [pluto_actions, cell_id, selected])
    const on_code_fold = useCallback(() => {
        pluto_actions.fold_remote_cells(pluto_actions.get_selected_cells(cell_id, selected), !code_folded)
    }, [pluto_actions, cell_id, selected, code_folded])
    const on_run = useCallback(() => {
        pluto_actions.set_and_run_multiple(pluto_actions.get_selected_cells(cell_id, selected))
        set_waiting_to_run_smart(true)
    }, [pluto_actions, cell_id, selected, set_waiting_to_run_smart])
    return html`
        <pluto-cell
            ref=${node_ref}
            class=${cl({
                queued: queued || (waiting_to_run && is_process_ready),
                running: running,
                activate_animation: activate_animation,
                errored: errored,
                selected: selected,
                code_differs: class_code_differs,
                code_folded: class_code_folded,
                running_disabled: running_disabled,
                depends_on_disabled_cells: depends_on_disabled_cells,
                show_input: show_input,
                shrunk: Object.values(logs).length > 0,
                hooked_up: output?.has_pluto_hook_features ?? false,
            })}
            id=${cell_id}
        >
            ${variables.map((name) => html`<span id=${encodeURI(name)} />`)}
            <pluto-shoulder draggable="true" title="Drag to move cell">
                <button onClick=${on_code_fold} class="foldcode" title="Show/hide code">
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
            ${cell_api_ready ? html`<${CellOutput} errored=${errored} ...${output} cell_id=${cell_id} />` : html``}
            <${CellInput}
                local_code=${cell_input_local?.code ?? code}
                remote_code=${code}
                cell_dependencies=${cell_dependencies}
                global_definition_locations=${global_definition_locations}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                show_input=${show_input}
                on_submit=${on_submit}
                on_delete=${on_delete}
                on_add_after=${on_add_after}
                on_change=${on_change_cell_input}
                on_update_doc_query=${on_update_doc_query}
                on_focus_neighbor=${on_focus_neighbor}
                on_line_heights=${set_line_heights}
                nbpkg=${nbpkg}
                cell_id=${cell_id}
                notebook_id=${notebook_id}
                metadata=${metadata}
                any_logs=${any_logs}
                show_logs=${show_logs}
                set_show_logs=${set_show_logs}
                cm_highlighted_line=${cm_highlighted_line}
                set_cm_highlighted_line=${set_cm_highlighted_line}
            />
            ${show_logs ? html`<${Logs} logs=${Object.values(logs)} line_heights=${line_heights} set_cm_highlighted_line=${set_cm_highlighted_line} />` : null}
            <${RunArea}
                cell_id=${cell_id}
                running_disabled=${running_disabled}
                depends_on_disabled_cells=${depends_on_disabled_cells}
                on_run=${on_run}
                on_interrupt=${() => {
                    pluto_actions.interrupt_remote(cell_id)
                }}
                runtime=${runtime}
                running=${running}
                code_differs=${class_code_differs}
                queued=${queued}
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

export const IsolatedCell = ({ cell_id, cell_results: { output, published_object_keys }, hidden }) => {
    const node_ref = useRef(null)
    let pluto_actions = useContext(PlutoContext)
    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions)

    return html`
        <pluto-cell ref=${node_ref} id=${cell_id} class=${hidden ? "hidden-cell" : "isolated-cell"}>
            ${cell_api_ready ? html`<${CellOutput} ...${output} cell_id=${cell_id} />` : html``}
        </pluto-cell>
    `
}
