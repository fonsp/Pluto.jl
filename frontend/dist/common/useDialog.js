"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDialog = void 0;
//@ts-ignore
const dialog_polyfill_esm_min_js_1 = __importDefault(require("https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js"));
const Preact_js_1 = require("../imports/Preact.js");
/**
 * @returns {[import("../imports/Preact.js").Ref<HTMLDialogElement?>, () => void, () => void, () => void]}
 */
const useDialog = () => {
    const dialog_ref = (0, Preact_js_1.useRef)(/** @type {HTMLDialogElement?} */ (null));
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (dialog_ref.current != null && typeof HTMLDialogElement !== "function")
            dialog_polyfill_esm_min_js_1.default.registerDialog(dialog_ref.current);
    }, [dialog_ref.current]);
    return (0, Preact_js_1.useMemo)(() => {
        const open = () => {
            if (!dialog_ref.current?.open)
                dialog_ref.current?.showModal();
        };
        const close = () => {
            if (dialog_ref.current?.open === true)
                dialog_ref.current?.close?.();
        };
        const toggle = () => (dialog_ref.current?.open === true ? dialog_ref.current?.close?.() : dialog_ref.current?.showModal?.());
        return [dialog_ref, open, close, toggle];
    }, [dialog_ref]);
};
exports.useDialog = useDialog;
