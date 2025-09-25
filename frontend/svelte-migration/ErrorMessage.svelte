<script>
    import { onMount, onDestroy } from 'svelte'
    import { t, th } from "../common/lang.js"
    
    export let body
    export let cell_id
    export let last_run_timestamp
    
    // Extract properties from body
    $: msg = body?.msg || ""
    $: stacktrace = body?.stacktrace || []
    $: plain_error = body?.plain_error || false
    
    // Helper functions
    function frame_is_important_heuristic(frame, frame_index, limited_stacktrace, frame_cell_id) {
        if (frame_cell_id != null) return true

        const funcname = frame.func || ""
        const params = frame.call ? frame.call.split('(')[1] : null

        if (["_collect", "collect_similar", "iterate", "error", "macro expansion"].includes(funcname)) {
            return false
        }

        if (funcname.includes("throw")) return false

        // too sciency
        if (frame.inlined) return false

        // makes no sense anyways
        if (frame.line < 1) return false

        if (params == null) {
            // no type signature... must be some function call that got optimized away or something special
            // probably not directly relevant
            return false
        }

        if ((funcname.match(/#/g) || []).length >= 2) {
            // anonymous function: #plot#142
            return false
        }

        return true
    }
    
    function extract_cell_id(file) {
        if (file.includes("#@#==#")) return null
        const sep = "#==#"
        const sep_index = file.indexOf(sep)
        if (sep_index != -1) {
            return file.substring(sep_index + sep.length, sep_index + sep.length + 36)
        } else {
            return null
        }
    }
    
    function ignore_funccall(frame) {
        return frame.call === "top-level scope"
    }
    
    function ignore_location(frame) {
        return frame.file === "none"
    }
    
    function noline(line) {
        return line == null || line < 1
    }
    
    function funcname_args(call) {
        const anon_match = call.indexOf(")(")
        if (anon_match != -1) {
            return [call.substring(0, anon_match + 1), call.substring(anon_match + 1)]
        } else {
            const bracket_index = call.indexOf("(")
            if (bracket_index != -1) {
                return [call.substring(0, bracket_index), call.substring(bracket_index)]
            } else {
                return [call, ""]
            }
        }
    }
    
    // Compute limited stacktrace
    $: limited_stacktrace = stacktrace.filter((frame, i) => {
        const frame_cell_id = extract_cell_id(frame.file)
        return frame_is_important_heuristic(frame, i, limited_stacktrace, frame_cell_id)
    }).slice(0, 20)
</script>

<div class="pluto-stacktrace">
    {#if msg}
        <div class="error-message">{msg}</div>
    {/if}
    
    {#if limited_stacktrace.length > 0}
        <div class="stacktrace-header">
            <secret-h1>{t("t_header_list_of_error_messages")}</secret-h1>
        </div>
        <ol>
            {#each limited_stacktrace as frame, i}
                {@const frame_cell_id = extract_cell_id(frame.file)}
                {@const line = frame.line}
                <li class:from_this_notebook={frame_cell_id != null} class:from_this_cell={frame_cell_id === cell_id}>
                    <div class="classical-frame">
                        {#if !ignore_funccall(frame)}
                            {@const call_funcname_args = funcname_args(frame.call || "")}
                            {@const funcname = call_funcname_args[0]}
                            {@const funcname_display = funcname.match(/^#\d+(#\d+)?$/) ? th("t_anonymous_function_abbr") : funcname}
                            <mark>
                                <strong>{funcname_display}</strong>
                                <s-span class="language-julia">{call_funcname_args[1]}</s-span>
                            </mark>
                        {/if}
                        
                        {#if !ignore_location(frame)}
                            <div class="frame-source">
                                {t("t_stack_frame_location")}&nbsp;
                                {#if frame_cell_id != null}
                                    <a
                                        internal-file={frame.file}
                                        href={"#" + frame_cell_id}
                                        on:click={(e) => {
                                            e.preventDefault()
                                            window.dispatchEvent(
                                                new CustomEvent("cell_focus", {
                                                    detail: {
                                                        cell_id: frame_cell_id,
                                                        line: noline(line) ? null : line - 1,
                                                    },
                                                })
                                            )
                                        }}
                                    >
                                        {(frame_cell_id == cell_id ? t("t_stack_frame_this_cell") : t("t_stack_frame_other_cell")).replaceAll(" ", "\xa0")}
                                        {noline(line) ? null : html`:<em>${t("t_stack_frame_line")}&nbsp;${line}</em>`}
                                    </a>
                                {:else}
                                    <a title={frame.path} class="remote-url" href={frame?.url?.startsWith?.("https") ? frame.url : null}>
                                        <em>{frame.file.replace(/#@#==#.*/, "")}{noline(frame.line) ? null : `:${frame.line}`}</em>
                                    </a>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ol>
    {/if}
</div>