import { html, useEffect, useRef } from "../imports/Preact.js"
// @ts-ignore - Svelte component import
import ExportBannerSvelte from "./ExportBanner.svelte"

/**
 * ExportBanner 包装器组件
 * 提供与原始Preact组件完全兼容的API接口
 *
 * @param {Object} props - 组件属性
 * @param {string} props.notebook_id - 笔记本ID
 * @param {string} props.print_title - 打印标题
 * @param {boolean} [props.open] - 是否打开对话框
 * @param {Function} [props.onClose] - 关闭回调函数
 * @param {string} props.notebookfile_url - 笔记本文件URL
 * @param {string} props.notebookexport_url - 笔记本导出URL
 * @param {Function} [props.start_recording] - 开始录制函数
 * @returns {import("../imports/Preact.js").ReactElement} Preact组件
 */
export const ExportBanner = (props) => {
    return html`<${ExportBannerWrapper} ...${props} />`
}

/**
 * ExportBanner包装器组件 - 管理Svelte组件实例
 */
class ExportBannerWrapper {
    constructor(props) {
        this.props = props
        this.containerRef = { current: null }
        // @ts-ignore - Svelte component type
        this.componentRef = { current: /** @type {any} */ (null) }
    }

    componentDidMount() {
        this.mountSvelteComponent()
    }

    componentDidUpdate(prevProps) {
        // 更新Svelte组件的props
        // @ts-ignore - Svelte component type
        if (this.componentRef.current) {
            try {
                // 尝试使用Svelte的$set方法更新props
                // @ts-ignore - Svelte component $set method
                const component = /** @type {any} */ (this.componentRef.current)
                if (typeof component.$set === "function") {
                    component.$set(this.props)
                } else {
                    // 如果$set方法不可用，记录警告
                    console.warn("Unable to update ExportBanner props - no compatible API found")
                }
            } catch (error) {
                console.warn("Failed to update ExportBanner props:", error)
            }
        }
    }

    componentWillUnmount() {
        this.cleanup()
    }

    mountSvelteComponent() {
        if (!this.containerRef.current) return

        try {
            // 创建Svelte组件实例
            // @ts-ignore - Svelte component instantiation
            this.componentRef.current = new ExportBannerSvelte({
                target: this.containerRef.current,
                props: this.props,
            })
        } catch (error) {
            console.error("Failed to mount ExportBanner Svelte component:", error)
        }
    }

    cleanup() {
        // @ts-ignore - Svelte component type
        if (this.componentRef.current) {
            try {
                // 销毁Svelte组件实例
                // @ts-ignore - Svelte component destroy method
                const component = /** @type {any} */ (this.componentRef.current)
                if (typeof component.$destroy === "function") {
                    component.$destroy()
                    // @ts-ignore - Svelte component destroy method
                } else if (typeof component.destroy === "function") {
                    component.destroy()
                }
            } catch (error) {
                console.warn("Error destroying ExportBanner component:", error)
            }
            // @ts-ignore - Type assignment
            this.componentRef.current = /** @type {any} */ (null)
        }
    }

    render() {
        return html`<div ref=${this.containerRef} class="export-banner-wrapper" />`
    }
}

// 为了兼容性，也提供一个函数式包装器
export const ExportBannerFunctional = (props) => {
    const containerRef = useRef(null)
    // @ts-ignore - Svelte component type
    const componentRef = useRef(/** @type {any} */ (null))

    useEffect(() => {
        if (containerRef.current) {
            try {
                // @ts-ignore - Svelte component instantiation
                componentRef.current = new ExportBannerSvelte({
                    target: containerRef.current,
                    props: props,
                })
            } catch (error) {
                console.error("Failed to mount ExportBanner Svelte component:", error)
            }
        }

        return () => {
            // @ts-ignore - Svelte component type
            if (componentRef.current) {
                try {
                    // @ts-ignore - Svelte component destroy method
                    const component = /** @type {any} */ (componentRef.current)
                    if (typeof component.$destroy === "function") {
                        component.$destroy()
                        // @ts-ignore - Svelte component destroy method
                    } else if (typeof component.destroy === "function") {
                        component.destroy()
                    }
                } catch (error) {
                    console.warn("Error destroying ExportBanner component:", error)
                }
            }
        }
    }, [])

    useEffect(() => {
        // @ts-ignore - Svelte component type
        if (componentRef.current) {
            try {
                // @ts-ignore - Svelte component $set method
                const component = /** @type {any} */ (componentRef.current)
                if (typeof component.$set === "function") {
                    component.$set(props)
                } else {
                    console.warn("Unable to update ExportBanner props - no compatible API found")
                }
            } catch (error) {
                console.warn("Failed to update ExportBanner props:", error)
            }
        }
    }, [props])

    return html`<div ref=${containerRef} class="export-banner-wrapper" />`
}
