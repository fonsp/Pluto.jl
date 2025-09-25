import ProgressBarSvelte from "./ProgressBar.svelte"
import { html, render } from "../imports/Preact.js"
import { createRef, useEffect, useRef } from "../imports/Preact.js"

/**
 * Svelte ProgressBar 包装器 - 用于在Preact环境中使用Svelte组件
 * @param {Object} props - 组件属性
 * @param {import("../components/Editor.js").NotebookData} props.notebook - notebook数据
 * @param {number} props.backend_launch_phase - 后端启动阶段
 * @param {Record<string,any>} props.status - 状态对象
 */
export const ProgressBar = ({ notebook, backend_launch_phase, status }) => {
    const containerRef = useRef()
    const componentRef = useRef()

    useEffect(() => {
        if (containerRef.current) {
            // 创建Svelte组件实例
            componentRef.current = new ProgressBarSvelte({
                target: containerRef.current,
                props: {
                    notebook,
                    backend_launch_phase,
                    status,
                },
            })
        }

        return () => {
            // 清理组件
            if (componentRef.current) {
                componentRef.current.$destroy()
            }
        }
    }, [])

    // 更新props
    useEffect(() => {
        if (componentRef.current) {
            componentRef.current.$set({
                notebook,
                backend_launch_phase,
                status,
            })
        }
    }, [notebook, backend_launch_phase, status])

    return html`<div ref=${containerRef}></div>`
}

// 导出兼容函数
export { scroll_to_busy_cell } from "./ProgressBar-svelte-functions.js"
