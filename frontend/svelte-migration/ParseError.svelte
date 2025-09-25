<script>
    import { onMount, onDestroy } from 'svelte'
    import { t } from "../common/lang.js"
    
    export let body
    export let cell_id
    export let last_run_timestamp
    
    // Extract diagnostics from body
    $: diagnostics = body?.diagnostics || []
    
    onMount(() => {
        // Dispatch cell_diagnostics event
        window.dispatchEvent(
            new CustomEvent("cell_diagnostics", {
                detail: {
                    cell_id,
                    diagnostics,
                },
            })
        )
    })
    
    onDestroy(() => {
        // Clean up diagnostics
        window.dispatchEvent(new CustomEvent("cell_diagnostics", { detail: { cell_id, diagnostics: [] } }))
    })
    
    // Helper functions
    function cell_is_unedited(cell_id) {
        return document.querySelector(`pluto-cell[id="${cell_id}"].code_differs`) == null
    }
    
    function handleMouseEnter(from, to) {
        if (cell_is_unedited(cell_id)) {
            window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from, to } }))
        }
    }
    
    function handleMouseLeave() {
        window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from: null, to: null } }))
    }
</script>

<jlerror class="syntax-error">
    <header>
        <p>Syntax error</p>
        <!-- FixWithAIButton would go here -->
    </header>
    <section>
        <div class="stacktrace-header">
            <secret-h1>{t("t_header_list_of_syntax_errors")}</secret-h1>
        </div>
        <ol>
            {#each diagnostics as diagnostic, i}
                {@const message = diagnostic.message}
                {@const from = diagnostic.from}
                {@const to = diagnostic.to}
                {@const line = diagnostic.line}
                <li
                    class="from_this_notebook from_this_cell important"
                    on:mouseenter={() => handleMouseEnter(from, to)}
                    on:mouseleave={handleMouseLeave}
                >
                    <div class="classical-frame">
                        {message}
                        <div class="frame-source">
                            {t("t_stack_frame_location")}&nbsp;
                            <a
                                internal-file={"#==#" + cell_id}
                                href={"#" + cell_id}
                                on:click={(e) => {
                                    e.preventDefault()
                                    window.dispatchEvent(
                                        new CustomEvent("cell_focus", {
                                            detail: {
                                                cell_id: cell_id,
                                                line: line - 1,
                                            },
                                        })
                                    )
                                }}
                            >
                                {t("t_stack_frame_this_cell").replaceAll(" ", "\xa0")}
                                {line ? html`:<em>${t("t_stack_frame_line")}&nbsp;${line}</em>` : null}
                            </a>
                        </div>
                    </div>
                </li>
            {/each}
        </ol>
    </section>
</jlerror>