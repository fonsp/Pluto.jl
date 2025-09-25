import { html, useEffect, useRef } from "../imports/Preact.js"
// @ts-ignore - Svelte component import
import FilePickerSvelte from "./FilePicker.svelte"

/**
 * Preact wrapper for the Svelte FilePicker component
 * @param {Object} props - Component props
 * @param {String} [props.value] - Current file path value
 * @param {Object} [props.suggest_new_file] - New file suggestion config
 * @param {String} [props.button_label] - Button label text
 * @param {String} [props.placeholder] - Placeholder text
 * @param {Function} [props.on_submit] - Submit callback function
 * @param {Function} [props.on_desktop_submit] - Desktop submit callback
 * @param {Object} [props.client] - Pluto connection client
 * @param {Boolean} [props.clear_on_blur] - Whether to clear on blur
 * @returns {any}
 */
export const FilePicker = (props) => {
    const containerRef = useRef(null)
    // @ts-ignore - Svelte component type
    const componentRef = useRef(/** @type {any} */ (null))

    useEffect(() => {
        if (containerRef.current) {
            // Mount the Svelte component
            // @ts-ignore - Svelte component instantiation
            const svelteProps = {
                target: containerRef.current,
                props: {
                    value: props.value ?? "",
                    suggest_new_file: props.suggest_new_file ?? null,
                    button_label: props.button_label ?? "",
                    placeholder: props.placeholder ?? "",
                    client: props.client ?? null,
                    clear_on_blur: props.clear_on_blur ?? false,
                },
            }

            // 处理可能为 undefined 的函数属性
            if (props.on_submit !== undefined) {
                svelteProps.props.on_submit = props.on_submit
            }
            if (props.on_desktop_submit !== undefined) {
                svelteProps.props.on_desktop_submit = props.on_desktop_submit
            }

            // @ts-ignore - Type assignment
            componentRef.current = new FilePickerSvelte(svelteProps)
        }

        // Cleanup function
        return () => {
            // @ts-ignore - Svelte component type
            if (componentRef.current) {
                // 尝试不同的销毁方法
                // @ts-ignore - Svelte component destroy method
                if (typeof componentRef.current.$destroy === "function") {
                    componentRef.current.$destroy()
                    // @ts-ignore - Svelte component destroy method
                } else if (typeof componentRef.current.destroy === "function") {
                    componentRef.current.destroy()
                }
                // @ts-ignore - Type assignment
                componentRef.current = /** @type {any} */ (null)
            }
        }
    }, []) // Empty dependency array - only mount once

    // Update props when they change
    useEffect(() => {
        // @ts-ignore - Svelte component type
        if (componentRef.current) {
            const svelteProps = {
                value: props.value ?? "",
                suggest_new_file: props.suggest_new_file ?? null,
                button_label: props.button_label ?? "",
                placeholder: props.placeholder ?? "",
                client: props.client ?? null,
                clear_on_blur: props.clear_on_blur ?? false,
            }

            // 处理可能为 undefined 的函数属性
            if (props.on_submit !== undefined) {
                svelteProps.on_submit = props.on_submit
            }
            if (props.on_desktop_submit !== undefined) {
                svelteProps.on_desktop_submit = props.on_desktop_submit
            }

            // Svelte 5 使用新的API来更新props
            // @ts-ignore - Svelte component $set method
            if (typeof componentRef.current.$set === "function") {
                // Svelte 3/4 兼容
                componentRef.current.$set(svelteProps)
                // @ts-ignore - Svelte component $$set method
            } else if (typeof componentRef.current.$$set === "function") {
                // Svelte 5 新API
                componentRef.current.$$set(svelteProps)
            } else {
                // 如果所有方法都失败，记录警告但不执行任何操作
                console.warn("FilePicker: Unable to update props - no compatible API found")
            }
        }
    }, [
        props.value,
        props.suggest_new_file,
        props.button_label,
        props.placeholder,
        props.on_submit,
        props.on_desktop_submit,
        props.client,
        props.clear_on_blur,
    ])

    return html`<div ref=${containerRef} class="file-picker-wrapper"></div>`
}
