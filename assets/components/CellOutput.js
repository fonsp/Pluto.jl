import { html } from "./Editor.js"
import {render, Component } from "https://unpkg.com/preact@10.4.4?module"

import { ErrorMessage } from "./ErrorMessage.js"

export class CellOutput extends Component {
	render() {
		return html`
		<celloutput>
			<assignee>${this.props.rootassignee}</assignee>
			${renderOutput(this.props)}
		</celloutput>
		`
	}
}

function renderOutput({mime, body, cell_id}) {
    switch(mime){
        case "image/png":
        case "image/jpg":
        case "image/gif":
			return html`<div><img src=${body} /></div>`
        break
        case "text/html":
        case "image/svg+xml":// TODO: don't run scripts here
        case "application/vnd.pluto.tree+xml":
            return html`<${RawHTMLContainer} body=${body}/>`
        break
        case "application/vnd.pluto.stacktrace+json":
            return html`<div><${ErrorMessage} cell_id=${cell_id} ...${JSON.parse(body)} /></div>`
        break
        
        case "text/plain":
        default:
            if (body) {
                return html`<div><pre><code>${body}</code></pre></div>`
            } else {
                return html`<div></div>`
            }
        break
    }
}

export class RawHTMLContainer extends Component {
	componentDidMount() {
		this.base.innerHTML = this.props.body

		// based on https://stackoverflow.com/a/26716182
		// to execute all scripts in the output html:
		try {
			Array.from(this.base.querySelectorAll("script")).map((script) => {
				this.base.currentScript = script // available inside user JS as `this.currentScript`
				if (script.src != "") {
					if (!Array.from(document.head.querySelectorAll("script")).map(s => s.src).includes(script)) {
						const tag = document.createElement("script")
						tag.src = script.src
						document.head.appendChild(tag)
						// might be wise to wait after adding scripts to head
						// maybe use a better method?
					}
				} else {
					const result = Function(script.innerHTML).bind(this.base)()
					if (result && result.nodeType === Node.ELEMENT_NODE) {
						script.parentElement.insertBefore(result, script)
					}
				}
			})
		} catch (err) {
			console.error("Couldn't execute script:")
			console.error(err)
			// TODO: relay to user
		}

		// convert LaTeX to svg
		try {
			MathJax.typeset([this.base])
		} catch (err) {
			console.info("Failed to typeset TeX:")
			console.info(err)
		}
	}

	render() {
		return html`<div></div>`
	}
}



    // TODO:
    // const oldHeight = outputNode.scrollHeight
    // const oldScroll = window.scrollY
    
    // TODO
    // // Scroll the page to compensate for changes in page height:
    // const newHeight = outputNode.scrollHeight
    // const newScroll = window.scrollY

    // if (notebookNode.querySelector("cell:focus-within")) {
    //     const cellsAfterFocused = notebookNode.querySelectorAll("cell:focus-within ~ cell")
    //     if (cellsAfterFocused.length == 0 || !Array.from(cellsAfterFocused).includes(cellNode)) {
    //         window.scrollTo(window.scrollX, oldScroll + (newHeight - oldHeight))
    //     }
    // }