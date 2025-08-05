"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsolatedCell = exports.Cell = void 0;
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const Preact_js_1 = require("../imports/Preact.js");
const CellOutput_js_1 = require("./CellOutput.js");
const CellInput_js_1 = require("./CellInput.js");
const Logs_js_1 = require("./Logs.js");
const RunArea_js_1 = require("./RunArea.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const PlutoContext_js_1 = require("../common/PlutoContext.js");
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
const SafePreviewUI_js_1 = require("./SafePreviewUI.js");
const useEventListener_js_1 = require("../common/useEventListener.js");
const useCellApi = (node_ref, published_object_keys, pluto_actions) => {
    const [cell_api_ready, set_cell_api_ready] = (0, Preact_js_1.useState)(false);
    const published_object_keys_ref = (0, Preact_js_1.useRef)(published_object_keys);
    published_object_keys_ref.current = published_object_keys;
    (0, Preact_js_1.useLayoutEffect)(() => {
        Object.assign(node_ref.current, {
            getPublishedObject: (id) => {
                if (!published_object_keys_ref.current.includes(id))
                    throw `getPublishedObject: ${id} not found`;
                return pluto_actions.get_published_object(id);
            },
            _internal_pluto_actions: pluto_actions,
        });
        set_cell_api_ready(true);
    });
    return cell_api_ready;
};
/**
 * @param {String} a_cell_id
 * @param {import("./Editor.js").NotebookData} notebook
 * @returns {Array<String>}
 */
const upstream_of = (a_cell_id, notebook) => Object.values(notebook?.cell_dependencies?.[a_cell_id]?.upstream_cells_map || {}).flatMap((x) => x);
/**
 * @param {String} a_cell_id
 * @param {import("./Editor.js").NotebookData} notebook
 * @param {Function} predicate
 * @param {Set<String>} explored
 * @returns {String | null}
 */
const find_upstream_of = (a_cell_id, notebook, predicate, explored = new Set([])) => {
    if (explored.has(a_cell_id))
        return null;
    explored.add(a_cell_id);
    if (predicate(a_cell_id)) {
        return a_cell_id;
    }
    for (let upstream of upstream_of(a_cell_id, notebook)) {
        const upstream_val = find_upstream_of(upstream, notebook, predicate, explored);
        if (upstream_val !== null) {
            return upstream_val;
        }
    }
    return null;
};
/**
 * @param {String} flag_name
 * @returns {Function}
 */
const hasTargetBarrier = (flag_name) => {
    return (a_cell_id, notebook) => {
        return notebook?.cell_inputs?.[a_cell_id].metadata[flag_name];
    };
};
const on_jump = (hasBarrier, pluto_actions, cell_id) => () => {
    const notebook = pluto_actions.get_notebook() || {};
    const barrier_cell_id = find_upstream_of(cell_id, notebook, (c) => hasBarrier(c, notebook));
    if (barrier_cell_id !== null) {
        window.dispatchEvent(new CustomEvent("cell_focus", {
            detail: {
                cell_id: barrier_cell_id,
                line: 0, // 1-based to 0-based index
            },
        }));
    }
};
/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  cell_input_local: { code: String },
 *  cell_dependencies: import("./Editor.js").CellDependencyData
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 *  selected: boolean,
 *  force_hide_input: boolean,
 *  focus_after_creation: boolean,
 *  process_waiting_for_permission: boolean,
 *  sanitize_html: boolean,
 *  [key: string]: any,
 * }} props
 * */
const Cell = ({ cell_input: { cell_id, code, code_folded, metadata }, cell_result: { queued, running, runtime, errored, output, logs, published_object_keys, depends_on_disabled_cells, depends_on_skipped_cells }, cell_dependencies, cell_input_local, notebook_id, selected, force_hide_input, focus_after_creation, is_process_ready, disable_input, process_waiting_for_permission, sanitize_html = true, nbpkg, global_definition_locations, is_first_cell, }) => {
    const { show_logs, disabled: running_disabled, skip_as_script } = metadata;
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    // useCallback because pluto_actions.set_doc_query can change value when you go from viewing a static document to connecting (to binder)
    const on_update_doc_query = (0, Preact_js_1.useCallback)((...args) => pluto_actions.set_doc_query(...args), [pluto_actions]);
    const on_focus_neighbor = (0, Preact_js_1.useCallback)((...args) => pluto_actions.focus_on_neighbor(...args), [pluto_actions]);
    const on_change = (0, Preact_js_1.useCallback)((val) => pluto_actions.set_local_cell(cell_id, val), [cell_id, pluto_actions]);
    const variables = (0, Preact_js_1.useMemo)(() => Object.keys(cell_dependencies?.downstream_cells_map ?? {}), [cell_dependencies]);
    // We need to unmount & remount when a destructive error occurs.
    // For that reason, we will use a simple react key and increment it on error
    const [key, setKey] = (0, Preact_js_1.useState)(0);
    const cell_key = (0, Preact_js_1.useMemo)(() => cell_id + key, [cell_id, key]);
    const [, resetError] = (0, Preact_js_1.useErrorBoundary)((error) => {
        console.log(`An error occurred in the CodeMirror code, resetting CellInput component. See error below:\n\n${error}\n\n -------------- `);
        setKey(key + 1);
        resetError();
    });
    const remount = (0, Preact_js_1.useMemo)(() => () => setKey(key + 1));
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = (0, Preact_js_1.useState)(/** @type {any} */ (null));
    const [cm_highlighted_range, set_cm_highlighted_range] = (0, Preact_js_1.useState)(/** @type {{from, to}?} */ (null));
    const [cm_highlighted_line, set_cm_highlighted_line] = (0, Preact_js_1.useState)(null);
    const [cm_diagnostics, set_cm_diagnostics] = (0, Preact_js_1.useState)([]);
    (0, useEventListener_js_1.useEventListener)(window, "cell_diagnostics", (e) => {
        if (e.detail.cell_id === cell_id) {
            set_cm_diagnostics(e.detail.diagnostics);
        }
    }, [cell_id, set_cm_diagnostics]);
    (0, useEventListener_js_1.useEventListener)(window, "cell_highlight_range", (e) => {
        if (e.detail.cell_id == cell_id && e.detail.from != null && e.detail.to != null) {
            set_cm_highlighted_range({ from: e.detail.from, to: e.detail.to });
        }
        else {
            set_cm_highlighted_range(null);
        }
    }, [cell_id]);
    (0, useEventListener_js_1.useEventListener)(window, "cell_focus", (0, Preact_js_1.useCallback)((e) => {
        if (e.detail.cell_id === cell_id) {
            if (e.detail.line != null) {
                const ch = e.detail.ch;
                if (ch == null) {
                    set_cm_forced_focus([
                        { line: e.detail.line, ch: 0 },
                        { line: e.detail.line, ch: Infinity },
                        { scroll: true, definition_of: e.detail.definition_of },
                    ]);
                }
                else {
                    set_cm_forced_focus([
                        { line: e.detail.line, ch: ch },
                        { line: e.detail.line, ch: ch },
                        { scroll: true, definition_of: e.detail.definition_of },
                    ]);
                }
            }
        }
    }, []));
    // When you click to run a cell, we use `waiting_to_run` to immediately set the cell's traffic light to 'queued', while waiting for the backend to catch up.
    const [waiting_to_run, set_waiting_to_run] = (0, Preact_js_1.useState)(false);
    (0, Preact_js_1.useEffect)(() => {
        set_waiting_to_run(false);
    }, [queued, running, output?.last_run_timestamp, depends_on_disabled_cells, running_disabled]);
    // We activate animations instantly BUT deactivate them NSeconds later.
    // We then toggle animation visibility using opacity. This saves a bunch of repaints.
    const activate_animation = (0, RunArea_js_1.useDebouncedTruth)(running || queued || waiting_to_run);
    const class_code_differs = code !== (cell_input_local?.code ?? code);
    const no_output_yet = (output?.last_run_timestamp ?? 0) === 0;
    const code_not_trusted_yet = process_waiting_for_permission && no_output_yet;
    // during the initial page load, force_hide_input === true, so that cell outputs render fast, and codemirrors are loaded after
    let show_input = !force_hide_input && (code_not_trusted_yet || errored || class_code_differs || cm_forced_focus != null || !code_folded);
    const [line_heights, set_line_heights] = (0, Preact_js_1.useState)([15]);
    const node_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    const disable_input_ref = (0, Preact_js_1.useRef)(disable_input);
    disable_input_ref.current = disable_input;
    const should_set_waiting_to_run_ref = (0, Preact_js_1.useRef)(true);
    should_set_waiting_to_run_ref.current = !running_disabled && !depends_on_disabled_cells;
    (0, useEventListener_js_1.useEventListener)(window, "set_waiting_to_run_smart", (e) => {
        if (e.detail.cell_ids.includes(cell_id))
            set_waiting_to_run(should_set_waiting_to_run_ref.current);
    }, [cell_id, set_waiting_to_run]);
    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions);
    const on_delete = (0, Preact_js_1.useCallback)(() => {
        pluto_actions.confirm_delete_multiple("Delete", pluto_actions.get_selected_cells(cell_id, selected));
    }, [pluto_actions, selected, cell_id]);
    const on_submit = (0, Preact_js_1.useCallback)(() => {
        if (!disable_input_ref.current) {
            pluto_actions.set_and_run_multiple([cell_id]);
        }
    }, [pluto_actions, cell_id]);
    const on_change_cell_input = (0, Preact_js_1.useCallback)((new_code) => {
        if (!disable_input_ref.current) {
            if (code_folded && cm_forced_focus != null) {
                pluto_actions.fold_remote_cells([cell_id], false);
            }
            on_change(new_code);
        }
    }, [code_folded, cm_forced_focus, pluto_actions, on_change]);
    const on_add_after = (0, Preact_js_1.useCallback)(() => {
        pluto_actions.add_remote_cell(cell_id, "after");
    }, [pluto_actions, cell_id, selected]);
    const on_code_fold = (0, Preact_js_1.useCallback)(() => {
        pluto_actions.fold_remote_cells(pluto_actions.get_selected_cells(cell_id, selected), !code_folded);
    }, [pluto_actions, cell_id, selected, code_folded]);
    const on_run = (0, Preact_js_1.useCallback)(() => {
        pluto_actions.set_and_run_multiple(pluto_actions.get_selected_cells(cell_id, selected));
    }, [pluto_actions, cell_id, selected]);
    const set_show_logs = (0, Preact_js_1.useCallback)((show_logs) => pluto_actions.update_notebook((notebook) => {
        notebook.cell_inputs[cell_id].metadata.show_logs = show_logs;
    }), [pluto_actions, cell_id]);
    const set_cell_disabled = (0, Preact_js_1.useCallback)(async (new_val) => {
        await pluto_actions.update_notebook((notebook) => {
            notebook.cell_inputs[cell_id].metadata["disabled"] = new_val;
        });
        // we also 'run' the cell if it is disabled, this will make the backend propage the disabled state to dependent cells
        await on_submit();
    }, [pluto_actions, cell_id, on_submit]);
    const any_logs = (0, Preact_js_1.useMemo)(() => !lodash_js_1.default.isEmpty(logs), [logs]);
    const skip_as_script_jump = (0, Preact_js_1.useCallback)(on_jump(hasTargetBarrier("skip_as_script"), pluto_actions, cell_id), [pluto_actions, cell_id]);
    const disabled_jump = (0, Preact_js_1.useCallback)(on_jump(hasTargetBarrier("disabled"), pluto_actions, cell_id), [pluto_actions, cell_id]);
    return (0, Preact_js_1.html) `
        <pluto-cell
            key=${cell_key}
            ref=${node_ref}
            class=${(0, ClassTable_js_1.cl)({
        queued: queued || (waiting_to_run && is_process_ready),
        internal_test_queued: !is_process_ready && (queued || waiting_to_run),
        running,
        activate_animation,
        errored,
        selected,
        code_differs: class_code_differs,
        code_folded,
        skip_as_script,
        running_disabled,
        depends_on_disabled_cells,
        depends_on_skipped_cells,
        show_input,
        shrunk: Object.values(logs).length > 0,
        hooked_up: output?.has_pluto_hook_features ?? false,
        no_output_yet,
    })}
            id=${cell_id}
        >
            ${variables.map((name) => (0, Preact_js_1.html) `<span id=${encodeURI(name)} />`)}
            <button
                onClick=${() => {
        pluto_actions.add_remote_cell(cell_id, "before");
    }}
                class="add_cell before"
                title="Add cell (Ctrl + Enter)"
                tabindex=${is_first_cell ? undefined : "-1"}
            >
                <span></span>
            </button>
            <pluto-shoulder draggable="true" title="Drag to move cell">
                <button onClick=${on_code_fold} class="foldcode" title="Show/hide code">
                    <span></span>
                </button>
            </pluto-shoulder>
            <pluto-trafficlight></pluto-trafficlight>
            ${code_not_trusted_yet
        ? (0, Preact_js_1.html) `<${SafePreviewUI_js_1.SafePreviewOutput} />`
        : cell_api_ready
            ? (0, Preact_js_1.html) `<${CellOutput_js_1.CellOutput} errored=${errored} ...${output} sanitize_html=${sanitize_html} cell_id=${cell_id} />`
            : (0, Preact_js_1.html) ``}
            <${CellInput_js_1.CellInput}
                local_code=${cell_input_local?.code ?? code}
                remote_code=${code}
                global_definition_locations=${global_definition_locations}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                show_input=${show_input}
                skip_static_fake=${is_first_cell}
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
                set_cell_disabled=${set_cell_disabled}
                cm_highlighted_line=${cm_highlighted_line}
                cm_highlighted_range=${cm_highlighted_range}
                cm_diagnostics=${cm_diagnostics}
                onerror=${remount}
            />
            ${show_logs && cell_api_ready
        ? (0, Preact_js_1.html) `<${Logs_js_1.Logs}
                      logs=${Object.values(logs)}
                      line_heights=${line_heights}
                      set_cm_highlighted_line=${set_cm_highlighted_line}
                      sanitize_html=${sanitize_html}
                  />`
        : null}
            <${RunArea_js_1.RunArea}
                cell_id=${cell_id}
                running_disabled=${running_disabled}
                depends_on_disabled_cells=${depends_on_disabled_cells}
                on_run=${on_run}
                on_interrupt=${() => {
        pluto_actions.interrupt_remote(cell_id);
    }}
                set_cell_disabled=${set_cell_disabled}
                runtime=${runtime}
                running=${running}
                code_differs=${class_code_differs}
                queued=${queued}
                on_jump=${disabled_jump}
            />
            <button
                onClick=${() => {
        pluto_actions.add_remote_cell(cell_id, "after");
    }}
                class="add_cell after"
                title="Add cell (Ctrl + Enter)"
            >
                <span></span>
            </button>
            ${skip_as_script
        ? (0, Preact_js_1.html) `<div
                      class="skip_as_script_marker"
                      title=${`This cell is directly flagged as disabled in file. Click to know more!`}
                      onClick=${(e) => {
            (0, open_pluto_popup_js_1.open_pluto_popup)({
                type: "info",
                source_element: e.target,
                body: (0, Preact_js_1.html) `This cell is currently stored in the notebook file as a Julia <em>comment</em>, instead of <em>code</em>.<br />
                                  This way, it will not run when the notebook runs as a script outside of Pluto.<br />
                                  Use the context menu to enable it again`,
            });
        }}
                  ></div>`
        : depends_on_skipped_cells
            ? (0, Preact_js_1.html) `<div
                      class="depends_on_skipped_marker"
                      title=${`This cell is indirectly flagged as disabled in file. Click to know more!`}
                      onClick=${(e) => {
                (0, open_pluto_popup_js_1.open_pluto_popup)({
                    type: "info",
                    source_element: e.target,
                    body: (0, Preact_js_1.html) `This cell is currently stored in the notebook file as a Julia <em>comment</em>, instead of <em>code</em>.<br />
                                  This way, it will not run when the notebook runs as a script outside of Pluto.<br />
                                  An upstream cell is <b> indirectly</b> <em>disabling in file</em> this one; enable
                                  <span onClick=${skip_as_script_jump} style="cursor: pointer; text-decoration: underline"> the upstream one</span> to affect
                                  this cell.`,
                });
            }}
                  ></div>`
            : null}
        </pluto-cell>
    `;
};
exports.Cell = Cell;
/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  [key: string]: any,
 * }} props
 * */
const IsolatedCell = ({ cell_input: { cell_id, metadata }, cell_result: { logs, output, published_object_keys }, hidden, sanitize_html = true }) => {
    const node_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions);
    const { show_logs } = metadata;
    return (0, Preact_js_1.html) `
        <pluto-cell ref=${node_ref} id=${cell_id} class=${hidden ? "hidden-cell" : "isolated-cell"}>
            ${cell_api_ready ? (0, Preact_js_1.html) `<${CellOutput_js_1.CellOutput} ...${output} sanitize_html=${sanitize_html} cell_id=${cell_id} />` : (0, Preact_js_1.html) ``}
            ${show_logs ? (0, Preact_js_1.html) `<${Logs_js_1.Logs} logs=${Object.values(logs)} line_heights=${[15]} set_cm_highlighted_line=${() => { }} />` : null}
        </pluto-cell>
    `;
};
exports.IsolatedCell = IsolatedCell;
