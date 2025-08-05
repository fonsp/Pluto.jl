/**
 * @template T
 * @type {Stack<T>}
 */
export class Stack<T> {
    /**
     * @param {number} max_size
     */
    constructor(max_size: number);
    max_size: any;
    arr: any;
    /**
     * @param {T} item
     * @returns {void}
     */
    push(item: T): void;
    /**
     * @returns {T[]}
     */
    get(): T[];
}
