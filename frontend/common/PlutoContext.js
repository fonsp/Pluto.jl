import { createContext } from "../imports/Preact.js"

export let PlutoActionsContext = createContext()
// export let PlutoActionsContext = createContext(/** @type {Record<string,Function?>?} */ (null))
export let PlutoBondsContext = createContext(/** @type {import("../components/Editor.js").BondValuesDict?} */ (null))
export let PlutoJSInitializingContext = createContext(/** @type {SetWithEmptyCallback<HTMLElement>?} */ (null))

// Hey copilot, create a class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
/**
 * A class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
 * @template T
 * @extends {Set<T>}
 */
export class SetWithEmptyCallback extends Set {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
        super()
        this.callback = callback
    }

    /**
     * @param {T} value
     */
    delete(value) {
        let result = super.delete(value)
        if (result && this.size === 0) {
            this.callback()
        }
        return result
    }
}
// THANKS COPILOT ❤️
