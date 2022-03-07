import { render as ssr_render } from "https://esm.sh/preact-render-to-string@5.1.20?target=es2020"

import { html } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor } from "./components/Editor.js"

// it's like a Rube Goldberg machine
console.log(ssr_render(html`<${Editor} />`))
