export let PlutoActionsContext: import("../imports/Preact.js").ReactContext<any>;
export let PlutoBondsContext: import("../imports/Preact.js").ReactContext<import("../components/Editor.js").BondValuesDict>;
export let PlutoJSInitializingContext: import("../imports/Preact.js").ReactContext<SetWithEmptyCallback<HTMLElement>>;
/**
 * A class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
 * @template T
 * @extends {Set<T>}
 */
export class SetWithEmptyCallback<T> extends Set<T> {
    /**
     * @param {() => void} callback
     */
    constructor(callback: () => void);
    callback: () => void;
}
