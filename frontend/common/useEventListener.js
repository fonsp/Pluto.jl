import { useCallback, useEffect } from "../imports/Preact.js"

/**
 * @typedef EventListenerAddable
 * @type Document | HTMLElement | Window | EventSource | MediaQueryList | null
 */

export const useEventListener = (
    /** @type {EventListenerAddable | import("../imports/Preact.js").Ref<EventListenerAddable>} */ element,
    /** @type {string} */ event_name,
    /** @type {EventListenerOrEventListenerObject} */ handler,
    /** @type {any[] | undefined} */ deps
) => {
    let handler_cached = useCallback(handler, deps)
    useEffect(() => {
        /** @type {EventListenerAddable} */
        const useme = element != null && "current" in element ? element.current : element

        if (useme == null) return
        useme.addEventListener(event_name, handler_cached)
        return () => useme.removeEventListener(event_name, handler_cached)
    }, [element, event_name, handler_cached])
}
