<script>
    import { getContext, onMount } from "svelte"
    import { t } from "../common/lang.js"
    import { html } from "../imports/Preact.js"
    import { Cell } from "../components/Cell.js"
    
    // Props
    export let notebook
    export let cell_inputs_local
    export let last_created_cell
    export let selected_cells
    export let is_initializing
    export let is_process_ready
    export let disable_input
    export let process_waiting_for_permission
    export let sanitize_html = true
    export let inspecting_hidden_code

    // Context
    let pluto_actions = getContext("pluto_actions")

    // State
    let cell_outputs_delayed = true

    // Constants
    const render_cell_outputs_delay = (num_cells) => (num_cells > 20 ? 100 : 0)
    const render_cell_outputs_minimum = 20

    // Reactive values
    $: global_definition_locations = notebook?.cell_dependencies 
        ? Object.fromEntries(
              Object.values(notebook.cell_dependencies).flatMap((x) =>
                  Object.keys(x.downstream_cells_map)
                      .filter((variable) => !variable.includes("."))
                      .map((variable) => [variable, x.cell_id])
              )
          )
        : {}

    // Effects
    onMount(() => {
        // Add new cell when the last cell gets deleted
        if (notebook?.cell_order?.length === 0 && !is_initializing) {
            pluto_actions?.add_remote_cell_at?.(0)
        }

        // Handle hash navigation
        let oldhash = window.location.hash
        if (oldhash.length > 1) {
            let go = () => {
                window.location.hash = "#"
                window.location.hash = oldhash
            }
            go()
            // Scrolling there might trigger some codemirrors to render and change height, so let's do it again.
            if (window.requestIdleCallback) {
                window.requestIdleCallback(go)
            }
        }
    })

    $: if (cell_outputs_delayed && notebook?.cell_order?.length > 0) {
        setTimeout(() => {
            cell_outputs_delayed = false
        }, render_cell_outputs_delay(notebook.cell_order.length))
    }

    // Helper function for nbpkg fingerprint
    function nbpkg_fingerprint(nbpkg) {
        if (!nbpkg) return []
        return [
            nbpkg.enabled,
            nbpkg.restart_required_msg,
            nbpkg.restart_recommended_msg,
            nbpkg.waiting_for_permission_but_probably_disabled,
            ...(nbpkg.busy_packages || []),
        ]
    }

    // CellMemo component logic
    function shouldUpdateCellMemo(cell_result, cell_input, cell_input_local, notebook_id, cell_dependencies, selected, focus_after_creation, force_hide_input, is_process_ready, disable_input, process_waiting_for_permission, sanitize_html, nbpkg, global_definition_locations, is_first_cell, inspecting_hidden_code) {
        const { body, last_run_timestamp, mime, persist_js_state, rootassignee } = cell_result?.output || {}
        const { queued, running, runtime, errored, depends_on_disabled_cells, logs, depends_on_skipped_cells } = cell_result || {}
        const { cell_id, code, code_folded, metadata } = cell_input || {}
        
        return [
            cell_id,
            ...Object.keys(metadata || {}),
            ...Object.values(metadata || {}),
            depends_on_disabled_cells,
            depends_on_skipped_cells,
            queued,
            running,
            runtime,
            errored,
            body,
            last_run_timestamp,
            mime,
            persist_js_state,
            rootassignee,
            logs,
            code,
            code_folded,
            cell_input_local,
            notebook_id,
            cell_dependencies,
            selected,
            force_hide_input,
            focus_after_creation,
            is_process_ready,
            disable_input,
            process_waiting_for_permission,
            sanitize_html,
            ...nbpkg_fingerprint(nbpkg),
            global_definition_locations,
            is_first_cell,
            inspecting_hidden_code,
        ]
    }
</script>

<pluto-notebook id={notebook?.notebook_id}>
    {#if notebook?.cell_order}
        {#each notebook.cell_order.filter((_, i) => !(cell_outputs_delayed && i > render_cell_outputs_minimum)) as cell_id, i}
            {@const cell_result = notebook.cell_results?.[cell_id] ?? {
                cell_id: cell_id,
                queued: true,
                running: false,
                errored: false,
                runtime: null,
                output: null,
                logs: [],
            }}
            {@const cell_input = notebook.cell_inputs?.[cell_id]}
            {@const cell_dependencies = notebook?.cell_dependencies?.[cell_id] ?? {}}
            {@const cell_input_local_data = cell_inputs_local?.[cell_id]}
            {@const is_selected = selected_cells?.includes(cell_id) ?? false}
            {@const is_focus_after_creation = last_created_cell === cell_id}
            {@const is_first = i === 0}
            
                    <!-- Use Cell component directly since it's a Preact component -->
            {@html html`
                <${Cell}
                    cell_result=${cell_result}
                    cell_dependencies=${cell_dependencies}
                    cell_input=${cell_input}
                    cell_input_local=${cell_input_local_data}
                    notebook_id=${notebook?.notebook_id}
                    selected=${is_selected}
                    force_hide_input=${false}
                    focus_after_creation=${is_focus_after_creation}
                    is_process_ready=${is_process_ready}
                    disable_input=${disable_input}
                    process_waiting_for_permission=${process_waiting_for_permission}
                    sanitize_html=${sanitize_html}
                    nbpkg=${notebook?.nbpkg}
                    global_definition_locations=${global_definition_locations}
                    is_first_cell=${is_first}
                    inspecting_hidden_code=${inspecting_hidden_code}
                />
            `}
        {/each}
    {/if}
    
    {#if notebook?.cell_order?.length === 0 || (cell_outputs_delayed && notebook?.cell_order?.length >= render_cell_outputs_minimum)}
        <div
            style="
                font-family: system-ui;
                font-style: italic;
                padding: 0.3rem 1rem;
                margin: 1rem 0rem;
                border-radius: .3rem;
                background: var(--blockquote-bg);
                opacity: 0.6;
                animation: fadeintext .2s 1.5s linear;
                animation-fill-mode: both;
                margin-bottom: {Math.max(0, ((notebook?.cell_order?.length || 0) - render_cell_outputs_minimum) * 10)}rem;"
        >
            {t("t_loading_cells")}
        </div>
    {/if}
</pluto-notebook>

<style>
    pluto-notebook {
        display: block;
    }
</style>