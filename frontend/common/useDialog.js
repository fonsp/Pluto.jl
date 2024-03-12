//@ts-ignore
import dialogPolyfill from "https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js"

import { useLayoutEffect, useMemo, useRef } from "../imports/Preact.js"

/**
 * @returns {[import("../imports/Preact.js").Ref<HTMLDialogElement?>, () => void, () => void, () => void]}
 */
export const useDialog = () => {
    const dialog_ref = useRef(/** @type {HTMLDialogElement?} */ (null))

    useLayoutEffect(() => {
        if (dialog_ref.current != null && typeof HTMLDialogElement !== "function") dialogPolyfill.registerDialog(dialog_ref.current)
    }, [dialog_ref.current])

    return useMemo(() => {
        const open = () => {
            if (!dialog_ref.current?.open) dialog_ref.current?.showModal()
        }
        const close = () => {
            if (dialog_ref.current?.open === true) dialog_ref.current?.close?.()
        }
        const toggle = () => (dialog_ref.current?.open === true ? dialog_ref.current?.close?.() : dialog_ref.current?.showModal?.())

        return [dialog_ref, open, close, toggle]
    }, [dialog_ref])
}
