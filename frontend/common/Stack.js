/**
 * @template T
 * @type {Stack<T>}
 */
export class Stack {
    /**
     * @param {number} max_size
     */
    constructor(max_size) {
        this.max_size = max_size
        this.arr = []
    }
    /**
     * @param {T} item
     * @returns {void}
     */
    push(item) {
        this.arr.push(item)
        if (this.arr.length > this.max_size) {
            this.arr.shift()
        }
    }
    /**
     * @returns {T[]}
     */
    get() {
        return this.arr
    }
}
