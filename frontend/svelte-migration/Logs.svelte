<script>
    import _ from "../imports/lodash.js"
    import { cl } from "../common/ClassTable.js"
    import SimpleOutputBody from "./SimpleOutputBody.svelte"
    import { get_included_external_source } from "../common/external_source.js"
    import { ansi_to_html } from "../imports/AnsiUp.js"
    import { open_pluto_popup } from "../common/open_pluto_popup.js"
    import { t, th } from "../common/lang.js"
    import LogItem from "./LogItem.svelte"
    import PlutoPopup from "./PlutoPopup.svelte"

    export let logs = []
    export let line_heights = []
    export let set_cm_highlighted_line
    export let sanitize_html

    // Access the help_circle_icon directly
    const help_circle_icon = get_included_external_source("help_circle_icon")?.href

    const LOGS_VISIBLE_START = 60
    const LOGS_VISIBLE_END = 20

    const PROGRESS_LOG_LEVEL = "LogLevel(-1)"
    const STDOUT_LOG_LEVEL = "LogLevel(-555)"

    const is_progress_log = (log) => {
        return log.level == PROGRESS_LOG_LEVEL && log.kwargs.find((kwarg) => kwarg[0] === "progress") !== undefined
    }

    const is_stdout_log = (log) => {
        return log.level == STDOUT_LOG_LEVEL
    }

    $: progress_logs = logs.filter(is_progress_log)
    $: latest_progress_logs = progress_logs.reduce((progress_logs, log) => ({ ...progress_logs, [log.id]: log }), {})
    $: stdout_log = logs.reduce((stdout_log, log) => {
        if (!is_stdout_log(log)) {
            return stdout_log
        }
        if (stdout_log === null) {
            return log
        }
        return {
            ...stdout_log,
            msg: [stdout_log.msg[0] + log.msg[0]], // Append to the previous stdout
        }
    }, null)

    // 修复响应式声明问题
    $: grouped_progress_and_logs = (() => {
        const result = logs.reduce(
            ([seen_progress, seen_stdout, final_logs], log) => {
                const ipl = is_progress_log(log)
                if (ipl && !seen_progress.has(log.id)) {
                    seen_progress.add(log.id)
                    return [seen_progress, seen_stdout, [...final_logs, latest_progress_logs[log.id]]]
                } else if (!ipl) {
                    if (is_stdout_log(log) && !seen_stdout) {
                        return [seen_progress, true, [...final_logs, stdout_log]]
                    } else if (!is_stdout_log(log)) {
                        return [seen_progress, seen_stdout, [...final_logs, log]]
                    }
                }
                return [seen_progress, seen_stdout, final_logs]
            },
            [new Set(), false, []]
        )
        return result[2]
    })()

    $: is_hidden_input = line_heights && line_heights.length > 0 ? line_heights[0] === 0 : false
    
    // Helper functions
    const processLog = (log) => {
        const is_progress = is_progress_log({ level: log.level, kwargs: log.kwargs })
        const is_stdout = log.level === STDOUT_LOG_LEVEL
        let progress = 0
        let display_level = log.level
        
        if (is_progress) {
            const progress_kwarg = log.kwargs.find((p) => p[0] === "progress")
            if (progress_kwarg) {
                const progressValue = progress_kwarg[1][0]
                // Convert to string for comparison
                const progressStr = String(progressValue)
                if (progressStr === "nothing") {
                    progress = 0
                } else if (progressStr === '"done"') {
                    progress = 1
                } else {
                    // Convert string to number
                    progress = parseFloat(progressStr) || 0
                }
            }
            display_level = "Progress"
        }
        
        if (is_stdout) {
            display_level = "Stdout"
        }
        
        return {
            is_progress,
            is_stdout,
            display_level,
            progress
        }
    }
    
    // Event handlers
    function handleMouseEnter(is_progress, y) {
        if (!is_progress && set_cm_highlighted_line) {
            set_cm_highlighted_line(is_hidden_input ? 0 : y + 1)
        }
    }
    
    function handleMouseLeave() {
        if (set_cm_highlighted_line) {
            set_cm_highlighted_line(null)
        }
    }
    
    // More info handler
    function handleMoreInfoClick(e, body) {
        console.log("handleMoreInfoClick called with:", { e, body });
        // 添加更多调试信息
        console.log("Event current target:", e.currentTarget);
        console.log("Body content:", body);
        
        open_pluto_popup({
            type: "info",
            source_element: e.currentTarget,
            body: body,
        });
        e.preventDefault();
    }
    
    // Progress bar update
    function updateProgressBar(element, progress) {
        if (element) {
            element.style.backgroundSize = `${progress * 100}% 100%`;
        }
    }
</script>

{#if logs && logs.length > 0}
    <pluto-logs-container>
        <pluto-logs>
            {#if grouped_progress_and_logs.length <= LOGS_VISIBLE_END + LOGS_VISIBLE_START}
                {#each grouped_progress_and_logs as log, i}
                    {#if log}
                        {@const processed = processLog(log)}
                        <LogItem 
                            {log} 
                            {processed} 
                            {handleMouseEnter} 
                            {handleMouseLeave} 
                            {handleMoreInfoClick} 
                            {sanitize_html}
                        />
                    {/if}
                {/each}
            {:else}
                {#each grouped_progress_and_logs.slice(0, LOGS_VISIBLE_START) as log, i}
                    {#if log}
                        {@const processed = processLog(log)}
                        <LogItem 
                            {log} 
                            {processed} 
                            {handleMouseEnter} 
                            {handleMouseLeave} 
                            {handleMoreInfoClick} 
                            {sanitize_html}
                        />
                    {/if}
                {/each}
                <pluto-log-truncated>
                    {t("t_logs_truncated", { count: grouped_progress_and_logs.length - LOGS_VISIBLE_START - LOGS_VISIBLE_END })}
                </pluto-log-truncated>
                {#each grouped_progress_and_logs.slice(-LOGS_VISIBLE_END) as log, i}
                    {#if log}
                        {@const processed = processLog(log)}
                        <LogItem 
                            {log} 
                            {processed} 
                            {handleMouseEnter} 
                            {handleMouseLeave} 
                            {handleMoreInfoClick} 
                            {sanitize_html}
                        />
                    {/if}
                {/each}
            {/if}
        </pluto-logs>
    </pluto-logs-container>
    <PlutoPopup />
{/if}