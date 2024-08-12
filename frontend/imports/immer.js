// @ts-nocheck
import immer, { produceWithPatches, applyPatches, enablePatches, setAutoFreeze } from "https://cdn.jsdelivr.net/npm/immer@8.0.0/dist/immer.esm.js"

export { applyPatches, produceWithPatches }
export default immer

enablePatches()

// we have some Editor.setState functions that use immer, so Editor.this.state becomes an "immer immutable frozen object". But we also have some Editor.setState functions that don't use immer, and they try to _mutate_ Editor.this.state. This gives errors like https://github.com/immerjs/immer/issues/576

// The solution is to tell immer not to create immutable objects

setAutoFreeze(false)
