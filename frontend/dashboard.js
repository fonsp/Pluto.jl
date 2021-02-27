import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Dashboard } from "./components/Dashboard.js"

// it's like a Rube Goldberg machine
render(html`<${Dashboard} />`, document.body)
