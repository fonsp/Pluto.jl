// 从Svelte组件导出的兼容函数
import ProgressBarSvelte from './ProgressBar.svelte'

/**
 * 兼容函数：scroll_to_busy_cell
 * 用于保持与原始ProgressBar.js的API兼容性
 */
export function scroll_to_busy_cell(notebook) {
    // 使用与Svelte组件中相同的逻辑
    const running_cell_id =
        notebook == null
            ? (document.querySelector("pluto-cell.running") ?? document.querySelector("pluto-cell.queued"))?.id
            : (Object.values(notebook.cell_results).find((c) => c.running) ?? Object.values(notebook.cell_results).find((c) => c.queued))?.cell_id
    
    if (running_cell_id) {
        document.getElementById(running_cell_id)?.scrollIntoView({
            block: "center",
            behavior: "smooth",
        })
    }
}