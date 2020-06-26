import { html, render } from "./common/Preact.js"

import { Editor } from "./components/Editor.js"

import "./common/Polyfill.js"

render(html`<${Editor} />`, document.body)
