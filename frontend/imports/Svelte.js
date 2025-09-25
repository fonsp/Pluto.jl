// Svelte imports using local npm packages
// These will be resolved by Vite from node_modules

// Svelte lifecycle functions
export { onMount, onDestroy, beforeUpdate, afterUpdate, tick, createEventDispatcher } from "svelte"

// Svelte stores for state management
export { writable, readable, derived, get } from "svelte/store"

// HTML template function (similar to htm for Preact)
export { html } from "https://esm.sh/htm@3.1.1/mini"

// Utility functions
export { default as immer } from "https://esm.sh/immer@10.0.3"
export { default as lodash } from "https://esm.sh/lodash-es@4.17.21"

// Re-export commonly used functions for easy access
export const { produce } = immer
export const { debounce, throttle, cloneDeep, isEqual, pick, omit } = lodash
