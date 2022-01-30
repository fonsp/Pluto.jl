import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { WelcomeViewer } from "./components/WelcomeViewer.js"

render(html`<${WelcomeViewer} />`, document.querySelector("main"))
