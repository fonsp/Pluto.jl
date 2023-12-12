import { useCallback, useEffect } from "../imports/Preact.js"

export const useEventListener = (element, event_name, handler, deps) => {
    let handler_cached = useCallback(handler, deps)
    useEffect(() => {
        if (element == null) return
        element.addEventListener(event_name, handler_cached)
        return () => element.removeEventListener(event_name, handler_cached)
    }, [element, event_name, handler_cached])
}
