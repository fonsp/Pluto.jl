import { createContext } from "../imports/Preact.js"

export let PlutoContext = createContext()
export let PlutoBondsContext = createContext(/** @type {{ [key: string]: { value: any } }} */ (null))
export let PlutoJSInitializingContext = createContext()

// Create a class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
export class SetWithEmptyCallback extends Set {
    constructor(callback) {
        super()
        this.callback = callback
    }

    delete(value) {
        let result = super.delete(value)
        if (result && this.size === 0) {
            this.callback()
        }
        return result
    }
}
// THANKS COPILOT ❤️
