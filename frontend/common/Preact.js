import { h, Component, render } from "https://unpkg.com/preact@10.4.4?module"
import htm from "https://unpkg.com/htm@3.0.4/dist/htm.module.js?module"

// import { h, Component, render } from "preact"
// import htm from "htm"

export { h, Component, render }
export const html = htm.bind(h)
