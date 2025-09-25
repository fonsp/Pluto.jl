import { html, useEffect, useRef } from "../imports/Preact.js"

/**
 * 通用函数，将 Svelte 组件包装为 React/Preact 组件
 * @param {any} SvelteComponent - 要包装的 Svelte 组件
 * @param {Object} propMapping - 属性映射配置
 * @returns {Function} React/Preact 组件函数
 */
export function pluto_export_to_react(SvelteComponent, propMapping = {}) {
    return function PreactWrapper(props) {
        /** @type {{ current: HTMLElement | null }} */
        const containerRef = useRef(null)
        /** @type {{ current: any | null }} */
        const componentRef = useRef(null)

        useEffect(() => {
            if (containerRef.current) {
                try {
                    // 构建传递给 Svelte 组件的属性
                    /** @type {Object} */
                    const svelteProps = {}
                    for (const [reactProp, svelteProp] of Object.entries(propMapping)) {
                        if (props[reactProp] !== undefined) {
                            svelteProps[svelteProp] = props[reactProp]
                        }
                    }
                    
                    // 添加未映射的属性
                    for (const [propName, propValue] of Object.entries(props)) {
                        if (!(propName in propMapping)) {
                            svelteProps[propName] = propValue
                        }
                    }

                    // 创建 Svelte 组件实例
                    componentRef.current = new SvelteComponent({
                        target: containerRef.current,
                        props: svelteProps,
                    })
                } catch (error) {
                    console.error("Failed to mount Svelte component:", error)
                }
            }

            // 清理函数
            return () => {
                if (componentRef.current) {
                    try {
                        // 尝试不同的销毁方法
                        const component = /** @type {any} */ (componentRef.current)
                        if (typeof component.$destroy === "function") {
                            component.$destroy()
                        } else if (typeof component.destroy === "function") {
                            component.destroy()
                        }
                    } catch (error) {
                        console.warn("Error destroying Svelte component:", error)
                    }
                    componentRef.current = null
                }
            }
        }, []) // 只在挂载时执行一次

        // 当属性变化时更新 Svelte 组件
        useEffect(() => {
            if (componentRef.current) {
                try {
                    // 构建更新的属性
                    /** @type {Object} */
                    const svelteProps = {}
                    for (const [reactProp, svelteProp] of Object.entries(propMapping)) {
                        if (props[reactProp] !== undefined) {
                            svelteProps[svelteProp] = props[reactProp]
                        }
                    }
                    
                    // 添加未映射的属性
                    for (const [propName, propValue] of Object.entries(props)) {
                        if (!(propName in propMapping)) {
                            svelteProps[propName] = propValue
                        }
                    }

                    // 更新 Svelte 组件属性
                    const component = /** @type {any} */ (componentRef.current)
                    if (typeof component.$set === "function") {
                        // Svelte 3/4 兼容
                        component.$set(svelteProps)
                    } else if (typeof component.$$set === "function") {
                        // Svelte 5 新API
                        component.$$set(svelteProps)
                    } else {
                        console.warn("Unable to update Svelte component props - no compatible API found")
                    }
                } catch (error) {
                    console.warn("Failed to update Svelte component props:", error)
                }
            }
        }, [JSON.stringify(props)]) // 当任何属性变化时更新

        return html`<div ref=${containerRef} />`
    }
}