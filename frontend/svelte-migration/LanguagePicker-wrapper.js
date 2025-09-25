import * as preact from "../imports/Preact.js"
import { html, render } from "../imports/Preact.js"
import LanguagePickerSvelte from "./LanguagePicker.svelte"

/**
 * LanguagePicker wrapper component - provides Preact compatibility for Svelte LanguagePicker component
 * This allows gradual migration from Preact to Svelte without breaking existing code
 */
export const LanguagePicker = () => {
    const containerRef = preact.createRef()
    
    preact.useEffect(() => {
        if (containerRef.current) {
            // Mount Svelte component
            const svelteComponent = new LanguagePickerSvelte({
                target: containerRef.current,
                props: {}
            })
            
            // Cleanup function
            return () => {
                svelteComponent.$destroy()
            }
        }
    }, [])
    
    return html`<div ref=${containerRef} class="language-picker-container"></div>`
}