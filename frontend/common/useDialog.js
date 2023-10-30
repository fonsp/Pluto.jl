//@ts-ignore
import dialogPolyfill from "https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js"

import { useEffect, useLayoutEffect, useRef } from "../imports/Preact.js"

/**
 * @returns {[import("../imports/Preact.js").Ref<HTMLDialogElement?>, () => void, () => void, () => void]}
 */
export const useDialog = ({ light_dismiss = false } = {}) => {
    const dialog_ref = useRef(/** @type {HTMLDialogElement?} */ (null))

    useLayoutEffect(() => {
        if (dialog_ref.current != null) dialogPolyfill.registerDialog(dialog_ref.current)
    }, [dialog_ref.current])

    const open = () => dialog_ref.current?.showModal()
    const close = () => dialog_ref.current?.close()
    const toggle = () => (dialog_ref.current?.open === true ? dialog_ref.current?.close() : dialog_ref.current?.showModal())

    useEffect(() => {
        if (light_dismiss) {
            const handleclick = (e) => {
                if (dialog_ref.current?.open && dialog_ref.current.contains(e.target)) {
                    close()
                    // Avoid activating whatever was below
                    e.stopPropagation()
                    e.preventDefault()
                }
            }
            document.body.addEventListener("click", handleclick)
            return () => {
                document.body.removeEventListener("click", handleclick)
            }
        }
    }, [dialog_ref.current])

    return [dialog_ref, open, close, toggle]
}
