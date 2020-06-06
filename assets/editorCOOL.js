import { Editor } from "./components/Editor.js"
import { html as preacthtml, render } from "https://unpkg.com/htm/preact/standalone.module.js"

render(preacthtml`<${Editor} />`, document.body)
