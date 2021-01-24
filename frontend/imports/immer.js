// @ts-nocheck
import immer, { produceWithPatches, applyPatches, enablePatches, setAutoFreeze } from "https://cdn.jsdelivr.net/npm/immer@8.0.0/dist/immer.esm.js"

export { applyPatches, produceWithPatches }
export default immer

enablePatches()
// Probably https://github.com/immerjs/immer/issues/576, in conjuction with not-only-using-immer for this.setState
setAutoFreeze(false)
