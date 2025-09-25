import { html, useRef, useEffect } from "../imports/Preact.js"
import RunAreaSvelte from "./RunArea.svelte"

/**
 * Preact兼容性包装器
 * 将Svelte组件包装为Preact组件
 */
export const RunArea = ({
    runtime,
    running,
    queued,
    code_differs,
    on_run,
    on_interrupt,
    set_cell_disabled,
    depends_on_disabled_cells,
    running_disabled,
    on_jump,
}) => {
    const containerRef = useRef(null)
    const svelteInstance = useRef(null)

    useEffect(() => {
        if (!containerRef.current) return

        // 创建Svelte实例
        svelteInstance.current = new RunAreaSvelte({
            target: containerRef.current,
            props: {
                runtime,
                running,
                queued,
                code_differs,
                on_run,
                on_interrupt,
                set_cell_disabled,
                depends_on_disabled_cells,
                running_disabled,
                on_jump,
            },
        })

        return () => {
            // 清理Svelte实例
            if (svelteInstance.current) {
                svelteInstance.current.$destroy()
                svelteInstance.current = null
            }
        }
    }, [])

    // 监听属性变化并更新Svelte实例
    useEffect(() => {
        if (svelteInstance.current) {
            svelteInstance.current.$set({
                runtime,
                running,
                queued,
                code_differs,
                on_run,
                on_interrupt,
                set_cell_disabled,
                depends_on_disabled_cells,
                running_disabled,
                on_jump,
            })
        }
    }, [runtime, running, queued, code_differs, on_run, on_interrupt, set_cell_disabled, depends_on_disabled_cells, running_disabled, on_jump])

    return html`<div ref=${containerRef} class="svelte-runarea-wrapper"></div>`
}

// 导出工具函数以保持兼容性
export { prettytime, useMillisSinceTruthy, useDebouncedTruth } from "../components/RunArea.js"
