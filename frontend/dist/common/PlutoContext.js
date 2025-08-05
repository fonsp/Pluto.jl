"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetWithEmptyCallback = exports.PlutoJSInitializingContext = exports.PlutoBondsContext = exports.PlutoActionsContext = void 0;
const Preact_js_1 = require("../imports/Preact.js");
exports.PlutoActionsContext = (0, Preact_js_1.createContext)();
// export let PlutoActionsContext = createContext(/** @type {Record<string,Function?>?} */ (null))
exports.PlutoBondsContext = (0, Preact_js_1.createContext)(/** @type {import("../components/Editor.js").BondValuesDict?} */ (null));
exports.PlutoJSInitializingContext = (0, Preact_js_1.createContext)(/** @type {SetWithEmptyCallback<HTMLElement>?} */ (null));
// Hey copilot, create a class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
/**
 * A class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
 * @template T
 * @extends {Set<T>}
 */
class SetWithEmptyCallback extends Set {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
        super();
        this.callback = callback;
    }
    /**
     * @param {T} value
     */
    delete(value) {
        let result = super.delete(value);
        if (result && this.size === 0) {
            this.callback();
        }
        return result;
    }
}
exports.SetWithEmptyCallback = SetWithEmptyCallback;
// THANKS COPILOT ❤️
