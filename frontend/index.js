import "./common/NodejsCompatibilityPolyfill.js"
import Welcome from "./components/welcome/Welcome.svelte"

const url_params = new URLSearchParams(window.location.search)

/**
 *
 * @type {import("./components/welcome/Welcome.js").LaunchParameters}
 */
const launch_params = {
    //@ts-ignore
    featured_direct_html_links: !!(url_params.get("featured_direct_html_links") ?? window.pluto_featured_direct_html_links),

    //@ts-ignore
    featured_sources: window.pluto_featured_sources,

    // Setting the featured_sources object is preferred, but you can also specify a single featured source using the URL (and integrity), which also supports being set as a URL parameter.

    //@ts-ignore
    featured_source_url: url_params.get("featured_source_url") ?? window.pluto_featured_source_url,
    //@ts-ignore
    featured_source_integrity: url_params.get("featured_source_integrity") ?? window.pluto_featured_source_integrity,

    //@ts-ignore
    pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_server_url,
}

console.log("Launch parameters: ", launch_params)
console.log("🎉 Svelte 版本正在运行！欢迎使用 Pluto.jl Svelte 版本")

// 在页面上添加 Svelte 版本指示器（用于调试）
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const indicator = document.createElement('div');
        indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:#ff6b6b;color:white;padding:5px 10px;border-radius:5px;font-size:12px;z-index:9999;';
        indicator.textContent = '🔥 Svelte 版本';
        document.body.appendChild(indicator);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);
    });
}

// 创建 Svelte 应用
const app = new Welcome({
    target: document.querySelector("#app") || document.body,
    props: {
        launch_params: launch_params
    }
})

export default app