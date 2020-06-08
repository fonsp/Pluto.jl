import { Welcome, html } from "./components/Welcome.js"
import { render } from "https://unpkg.com/preact@10.4.4?module"

render(html`<${Welcome} />`, document.querySelector("main"))