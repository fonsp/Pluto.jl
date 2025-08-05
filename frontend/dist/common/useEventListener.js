"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEventListener = void 0;
const Preact_js_1 = require("../imports/Preact.js");
/**
 * @typedef EventListenerAddable
 * @type Document | HTMLElement | Window | EventSource | MediaQueryList | null
 */
const useEventListener = (
/** @type {EventListenerAddable | import("../imports/Preact.js").Ref<EventListenerAddable>} */ element, 
/** @type {string} */ event_name, 
/** @type {EventListenerOrEventListenerObject} */ handler, 
/** @type {any[] | undefined} */ deps) => {
    let handler_cached = (0, Preact_js_1.useCallback)(handler, deps);
    (0, Preact_js_1.useEffect)(() => {
        const e = element;
        const useme = e == null || e instanceof Document || e instanceof HTMLElement || e instanceof Window || e instanceof EventSource || e instanceof MediaQueryList
            ? /** @type {EventListenerAddable} */ (e)
            : e.current;
        if (useme == null)
            return;
        useme.addEventListener(event_name, handler_cached);
        return () => useme.removeEventListener(event_name, handler_cached);
    }, [element, event_name, handler_cached]);
};
exports.useEventListener = useEventListener;
