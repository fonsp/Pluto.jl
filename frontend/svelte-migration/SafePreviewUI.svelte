<script>
    import { t, th } from "../common/lang.js"
    import { open_pluto_popup } from "../common/open_pluto_popup.js"
    import _ from "../imports/lodash.js"
    
    // Props
    export let process_waiting_for_permission = false
    export let risky_file_source = null
    export let restart = null
    export let warn_about_untrusted_code = false
    
    const handleInfoClick = () => {
        open_pluto_popup({
            type: "info",
            big: true,
            should_focus: true,
            body: createPopupContent()
        })
    }
    
    const createPopupContent = () => {
        // 创建容器元素
        const container = document.createElement('div')
        
        // 构建基本内容
        container.innerHTML = `
            <h1>${th("t_safe_preview")}</h1>
            <p>${th("t_safe_preview_body")}</p>
            <p>${th("t_safe_preview_run_this_notebook", { run_this_notebook: '<a href="#" id="run-notebook-link">${t("t_safe_preview_run_this_notebook_link")}</a>' })}</p>
        `
        
        // 添加运行链接的事件监听器
        const runLink = container.querySelector('#run-notebook-link')
        if (runLink) {
            runLink.addEventListener('click', handleRunClick)
        }
        
        // 如果需要显示不信任代码警告
        if (warn_about_untrusted_code) {
            const warningHtml = `
                <pluto-output translate="yes" class="rich_output">
                    <div class="markdown">
                        <div class="admonition warning">
                            <p class="admonition-title">${t("t_safe_preview_confirm_warning")}</p>
                            <p>${t("t_safe_preview_confirm_before")}</p>
                            ${risky_file_source ? `<p><code>${risky_file_source}</code></p>` : ''}
                            <p>${t("t_safe_preview_confirm_after")}</p>
                        </div>
                    </div>
                </pluto-output>
            `
            container.insertAdjacentHTML('beforeend', warningHtml)
        }
        
        return container
    }
    
    const handleRunClick = (e) => {
        e.preventDefault()
        if (restart) {
            restart(true)
        }
        window.dispatchEvent(new CustomEvent("close pluto popup"))
    }
</script>

<div class="outline-frame safe-preview"></div>
{#if process_waiting_for_permission}
    <div class="outline-frame-actions-container safe-preview">
        <div class="safe-preview-info">
            <span>
                {t("t_safe_preview")}
                <button on:click={handleInfoClick}>
                    <span><span class="info-icon pluto-icon"></span></span>
                </button>
            </span>
        </div>
    </div>
{/if}