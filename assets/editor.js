import { html } from "./common/Html.js"
import { render } from "https://unpkg.com/preact@10.4.4?module"

import { Editor } from "./components/Editor.js"

import "./common/Polyfill.js"

render(html`<${Editor} />`, document.body)
