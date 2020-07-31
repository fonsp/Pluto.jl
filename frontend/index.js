import { html, render } from "./common/Preact.js"

import { Welcome } from "./components/Welcome.js"

import "./common/Polyfill.js"

render(html`<${Welcome} />`, document.querySelector("main"))
