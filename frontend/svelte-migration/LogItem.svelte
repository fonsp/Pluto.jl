<script>
    import { cl } from "../common/ClassTable.js"
    import SimpleOutputBody from "./SimpleOutputBody.svelte"
    import { ansi_to_html } from "../imports/AnsiUp.js"
    import { open_pluto_popup } from "../common/open_pluto_popup.js"
    import { t, th } from "../common/lang.js"
    import { get_included_external_source } from "../common/external_source.js"

    export let log
    export let processed
    export let handleMouseEnter
    export let handleMouseLeave
    export let handleMoreInfoClick
    export let sanitize_html
    
    // Access the help_circle_icon directly
    const help_circle_icon = get_included_external_source("help_circle_icon")?.href
</script>

<pluto-log-dot-positioner
    class={cl({ [processed.display_level]: true })}
    on:mouseenter={() => handleMouseEnter(processed.is_progress, log.line - 1)}
    on:mouseleave={handleMouseLeave}
    role="button"
    tabindex="0"
>
    <pluto-log-icon></pluto-log-icon>
    <pluto-log-dot class={processed.display_level}>
        {#if processed.is_progress}
            <pluto-progress-name>{log.msg && log.msg.length > 0 ? log.msg[0] : ''}</pluto-progress-name>
            <pluto-progress-bar-container>
                <pluto-progress-bar 
                    style="background-size: {processed.progress * 100}% 100%;">
                    {Math.ceil(100 * processed.progress)}%
                </pluto-progress-bar>
            </pluto-progress-bar-container>
        {:else if processed.is_stdout}
            <a
                class="stdout-info"
                title={t("t_logs_click_for_more_info")}
                href="#"
                on:click={(e) => {
                    console.log("Button clicked!");
                    e.preventDefault();
                    handleMoreInfoClick(e, th("t_logs_stdout"));
                }}
                aria-label={t("t_logs_stdout_info")}
            >
                <img alt="❔" src={help_circle_icon} style="width: 17px;" />
            </a>
            <pre>{@html log.msg && log.msg.length > 0 ? ansi_to_html(log.msg[0]) : ''}</pre>
        {:else}
            {#if log.msg}
                <SimpleOutputBody 
                    cell_id="cell_id_not_known" 
                    mime={log.msg[1]} 
                    body={log.msg[0]} 
                    persist_js_state={false} 
                    sanitize_html={sanitize_html} 
                />
            {/if}
            {#each log.kwargs as [k, v], j}
                <pluto-log-dot-kwarg>
                    <pluto-key>{k}</pluto-key>
                    <pluto-value>
                        <SimpleOutputBody 
                            cell_id="cell_id_not_known" 
                            mime={v[1]} 
                            body={v[0]} 
                            persist_js_state={false} 
                            sanitize_html={sanitize_html} 
                        />
                    </pluto-value>
                </pluto-log-dot-kwarg>
            {/each}
        {/if}
    </pluto-log-dot>
</pluto-log-dot-positioner>

<style>
  .stdout-info img {
    filter: var(--image-filters);
    width: 17px;
  }
  
  .stdout-info {
    display: block;
    height: 17px;
    padding: 4px;
    box-sizing: content-box;
    background: var(--pkg-popup-buttons-bg-color);
    border-radius: 10px;
    z-index: 1000;
    margin-left: -4px;
    position: absolute;
    right: 2px;
    top: 2px;
    pointer-events: auto;
  }
</style>