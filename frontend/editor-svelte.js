import "./common/NodejsCompatibilityPolyfill.js"
import Editor from "./Editor.svelte"
// import { parse_launch_params } from "./common/parse_launch_params.js"

export const parse_launch_params = () => {
    const url_params = new URLSearchParams(window.location.search)

    return {
        //@ts-ignore
        notebook_id: url_params.get("id") ?? window.pluto_notebook_id,
        //@ts-ignore
        statefile: url_params.get("statefile") ?? window.pluto_statefile,
        //@ts-ignore
        statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
        //@ts-ignore
        notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
        //@ts-ignore
        notebookfile_integrity: url_params.get("notebookfile_integrity") ?? window.pluto_notebookfile_integrity,
        //@ts-ignore
        disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
        //@ts-ignore
        preamble_html: url_params.get("preamble_html") ?? window.pluto_preamble_html,
        //@ts-ignore
        isolated_cell_ids: url_params.has("isolated_cell_id") ? url_params.getAll("isolated_cell_id") : window.pluto_isolated_cell_ids,
        //@ts-ignore
        binder_url: url_params.get("binder_url") ?? window.pluto_binder_url,
        //@ts-ignore
        pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_pluto_server_url,
        //@ts-ignore
        slider_server_url: url_params.get("slider_server_url") ?? window.pluto_slider_server_url,
        //@ts-ignore
        recording_url: url_params.get("recording_url") ?? window.pluto_recording_url,
        //@ts-ignore
        recording_url_integrity: url_params.get("recording_url_integrity") ?? window.pluto_recording_url_integrity,
        //@ts-ignore
        recording_audio_url: url_params.get("recording_audio_url") ?? window.pluto_recording_audio_url,
    }
}

const url_params = new URLSearchParams(window.location.search)

// 解析启动参数
const launch_params = {
    ...parse_launch_params(),
    //@ts-ignore
    statefile: url_params.get("statefile") ?? window.pluto_statefile,
    //@ts-ignore
    statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
    //@ts-ignore
    disable_ui: url_params.get("disable_ui") === "true" ? true : url_params.get("disable_ui") === "false" ? false : window.pluto_disable_ui,
    //@ts-ignore
    isolated_cell_id: url_params.get("isolated_cell_id") ?? window.pluto_isolated_cell_id,
}

console.log("Launch parameters: ", launch_params)
console.log("🎉 Svelte 版本编辑器正在运行！")

// 等待DOM加载完成
function initializeEditor() {
    const targetElement = document.querySelector("#app")
    if (!targetElement) {
        console.error("目标元素 #app 未找到")
        return
    }

    console.log("创建 Svelte 编辑器实例...")

    try {
        // 创建 Svelte 应用
        const app = new Editor({
            target: targetElement,
            props: {
                launch_params: launch_params,
                skip_custom_element: false,
            },
        })

        console.log("Svelte 编辑器创建成功！")

        // 添加到全局作用域用于调试
        window.plutoSvelteApp = app

        return app
    } catch (error) {
        console.error("创建 Svelte 编辑器失败:", error)
        throw error
    }
}

// 在页面上添加 Svelte 版本指示器（用于调试）
function addDebugIndicator() {
    const indicator = document.createElement("div")
    indicator.id = "svelte-debug-indicator"
    indicator.style.cssText =
        "position:fixed;top:10px;right:10px;background:#4caf50;color:white;padding:5px 10px;border-radius:5px;font-size:12px;z-index:9999;"
    indicator.textContent = "🔥 Svelte 编辑器"
    document.body.appendChild(indicator)

    // 5秒后自动隐藏
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator)
        }
    }, 5000)
}

// 初始化函数
function init() {
    console.log("开始初始化 Svelte 编辑器...")

    try {
        addDebugIndicator()
        const app = initializeEditor()

        if (app) {
            console.log("✅ Svelte 编辑器初始化完成！")
        }
    } catch (error) {
        console.error("❌ Svelte 编辑器初始化失败:", error)

        // 显示错误信息
        const errorDiv = document.createElement("div")
        errorDiv.style.cssText =
            "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#ff4444;color:white;padding:20px;border-radius:8px;z-index:10000;"
        errorDiv.innerHTML = `
            <h3>Svelte 编辑器初始化失败</h3>
            <p>${error.message}</p>
            <pre style="font-size:12px;">${error.stack}</pre>
        `
        document.body.appendChild(errorDiv)
    }
}

// 确保DOM加载完成后初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
} else {
    // DOM已经加载完成
    init()
}

export default initializeEditor
