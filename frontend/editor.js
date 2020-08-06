import { html, render } from "./common/Preact.js"

import { Editor } from "./components/Editor.js"

import "./common/Polyfill.js"

// it's like a Rube Goldberg machine
render(html`<${Editor} />`, document.body)
