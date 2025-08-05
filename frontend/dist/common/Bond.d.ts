/**
 * Copied from the observable stdlib source, but we need it to be faster than Generator.input because Generator.input is async by nature, so will lag behind that one tick that is breaking the code.
 * https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js#L13
 * @param {Element} input
 * @returns {any}
 */
export function get_input_value(input: Element): any;
/**
 * Copied from the observable stdlib source (https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js) without modifications.
 * @param {Element} input
 * @returns {string}
 */
export function eventof(input: Element): string;
export function set_input_value(input: Element, new_value: any): void;
export function set_bound_elements_to_their_value(bond_nodes: NodeListOf<Element>, bond_values: import("../components/Editor.js").BondValuesDict): void;
export function add_bonds_disabled_message_handler(bond_nodes: NodeListOf<Element>, invalidation: Promise<void>): void;
export function add_bonds_listener(bond_nodes: NodeListOf<Element>, on_bond_change: (name: string, value: any) => Promise<any>, known_values: import("../components/Editor.js").BondValuesDict, invalidation: Promise<void>): void;
