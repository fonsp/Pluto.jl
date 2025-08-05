"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scroll_cell_into_view = exports.Scroller = void 0;
const useEventListener_js_1 = require("../common/useEventListener.js");
const Preact_js_1 = require("../imports/Preact.js");
/**
 * Utility component that scrolls the page automatically, when the pointer is
 * moved to the upper or lower 30%.
 *
 * Useful for things like selections and drag-and-drop.
 */
const Scroller = ({ active }) => {
    const pointer = (0, Preact_js_1.useRef)();
    const onmove = (e) => {
        pointer.current = { x: e.clientX, y: e.clientY };
    };
    (0, useEventListener_js_1.useEventListener)(window, "pointermove", onmove, []);
    (0, useEventListener_js_1.useEventListener)(window, "dragover", onmove, []);
    (0, Preact_js_1.useEffect)(() => {
        if (active.up || active.down) {
            let prev_time = null;
            let current = true;
            const scroll_update = (timestamp) => {
                if (current) {
                    if (prev_time == null) {
                        prev_time = timestamp;
                    }
                    const dt = timestamp - prev_time;
                    prev_time = timestamp;
                    if (pointer.current) {
                        const y_ratio = pointer.current.y / window.innerHeight;
                        if (active.up && y_ratio < 0.3) {
                            window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000);
                        }
                        else if (active.down && y_ratio > 0.7) {
                            window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000);
                        }
                    }
                    window.requestAnimationFrame(scroll_update);
                }
            };
            window.requestAnimationFrame(scroll_update);
            return () => (current = false);
        }
    }, [active.up, active.down]);
    return null;
};
exports.Scroller = Scroller;
const scroll_cell_into_view = (/** @type {string} */ cell_id) => {
    document.getElementById(cell_id)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
    });
};
exports.scroll_cell_into_view = scroll_cell_into_view;
