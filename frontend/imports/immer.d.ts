export type Patch = {
    path: Array<string | number>
    op: "add" | "replace" | "remove"
    value: any
}

// type PatchesCallback = (patches: Array<Patch>, inversePatch: Array<Patch>) => void

declare function produce<T>(value: T, mutator: (draft: T) => void | T): T
declare function produce<T>(mutator: (draft: T) => void | T): (value: T) => T

export default produce

declare function applyPatches<T>(value: T, patches: Array<Patch>): T

export { applyPatches }

declare function produceWithPatches<T>(value: T, mutator: (draft: T) => void | T): [T, Array<Patch>, Array<Patch>]
export { produceWithPatches }
