import { html, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
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

function renderOutput({mime, body, cellID}) {
    switch(mime){
        case "image/png":
        case "image/jpg":
        case "image/gif":
			return html`<div><img src=${body} /></div>`
        break
        case "text/html":
        case "image/svg+xml":
        case "application/vnd.pluto.tree+xml":
            return html`<${RawHTMLContainer} body=${body}/>`
        break
        case "application/vnd.pluto.stacktrace+json":
            return html`<div><${ErrorMessage} cellID=${cellID} ...${JSON.parse(body)} /></div>`
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