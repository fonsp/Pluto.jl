import { html, Component, useRef, useLayoutEffect, useContext, useEffect, useMemo, createContext } from "../imports/Preact.js"

import { ErrorMessage } from "./ErrorMessage.js"
import { TreeView, TableView, PlutoHTMLElement, PlutoFragmentElement } from "./TreeView.js"

import { cl } from "../common/ClassTable.js"
import register from "../imports/PreactCustomElement.js"
import { PlutoHTML } from "./CellOutput/PlutoHTML.js"

export let CellOutputContext = createContext({
    cell_id: "",
    persist_js_state: false,
    last_run_timestamp: 0,
})

/**
 * @typedef CellOutputProps
 * @property {string} cell_id
 * @property {boolean?} persist_js_state
 * @property {string} rootassignee
 * @property {number} last_run_timestamp
 * @property {boolean} errored
 */

/**
 * @typedef TextPlainMimeResult
 * @property {"text/plain" | "text/html"} mime
 * @property {string} body
 *
 * @typedef ImageMimeResult
 * @property {"image/png" | "image/jpg" | "image/jpeg" | "image/gif" | "image/bmp" | "image/svg+xml"} mime
 * @property {Uint8Array} body
 *
 * @typedef ComplexMimeResult
 * @property {"application/vnd.pluto.tree+object"
 *  | "application/vnd.pluto.table+object"
 *  | "application/vnd.pluto.stacktrace+object"
 *  | "application/vnd.pluto.element+object"
 *  | "application/vnd.pluto.elementlist+object"
 * } mime
 * @property {object} body
 *
 * @typedef MimeResult
 * @type {TextPlainMimeResult | ImageMimeResult | ComplexMimeResult}
 */

export class CellOutput extends Component {
    /** @type {CellOutputProps & MimeResult} */
    props

    constructor() {
        super()
        this.state = {
            error: null,
        }

        this.old_height = 0
        // @ts-ignore Is there a way to use the latest DOM spec?
        this.resize_observer = new ResizeObserver((entries) => {
            const new_height = this.base.offsetHeight

            // Scroll the page to compensate for change in page height:
            if (document.body.querySelector("pluto-cell:focus-within")) {
                const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output") // CSS wizardry ✨
                if (
                    !(document.activeElement.tagName == "SUMMARY") &&
                    (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base))
                ) {
                    window.scrollBy(0, new_height - this.old_height)
                }
            }

            this.old_height = new_height
        })
    }

    shouldComponentUpdate({ last_run_timestamp }) {
        return last_run_timestamp !== this.props.last_run_timestamp
    }

    componentDidMount() {
        this.resize_observer.observe(this.base)
    }

    componentWillUnmount() {
        this.resize_observer.unobserve(this.base)
    }

    render() {
        const rich_output =
            this.props.errored ||
            !this.props.body ||
            (this.props.mime !== "application/vnd.pluto.tree+object" &&
                this.props.mime !== "application/vnd.pluto.table+object" &&
                this.props.mime !== "text/plain")
        const allow_translate = !this.props.errored && rich_output
        return html`
            <${CellOutputContext.Provider}
                value=${{
                    cell_id: this.props.cell_id,
                    persist_js_state: this.props.persist_js_state,
                    last_run_timestamp: this.props.last_run_timestamp,
                }}
            >
                <pluto-output
                    class=${cl({
                        rich_output,
                        scroll_y: this.props.mime === "application/vnd.pluto.table+object" || this.props.mime === "text/plain",
                    })}
                    translate=${allow_translate}
                    mime=${this.props.mime}
                >
                    <assignee translate=${false}>${this.props.rootassignee}</assignee>
                    ${this.state.error ? html`<div>${this.state.error.message}</div>` : html`<${OutputBody} mime=${this.props.mime} body=${this.props.body} />`}
                </pluto-output>
            </${CellOutputContext.Provider}>
        `
    }
}

export let PlutoImage = ({ body, mime }) => {
    // I know I know, this looks stupid.
    // BUT it is necessary to make sure the object url is only created when we are actually attaching to the DOM,
    // and is removed when we are detatching from the DOM
    let imgref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: mime }))

        imgref.current.onload = imgref.current.onerror = () => {
            if (imgref.current) {
                imgref.current.style.display = null
            }
        }
        if (imgref.current.src === "") {
            // an <img> that is loading takes up 21 vertical pixels, which causes a 1-frame scroll flicker
            // the solution is to make the <img> invisible until the image is loaded
            imgref.current.style.display = "none"
        }
        imgref.current.type = mime
        imgref.current.src = url

        return () => URL.revokeObjectURL(url)
    }, [body, mime])

    return html`<img ref=${imgref} type=${mime} src=${""} />`
}

/**
 * @param {MimeResult} props
 */
export const OutputBody = ({ mime, body }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<div><${PlutoImage} mime=${mime} body=${body} /></div>`
            break
        case "text/html":
            // Snippets starting with <!DOCTYPE or <html are considered "full pages" that get their own iframe.
            // Not entirely sure if this works the best, or if this slows down notebooks with many plots.
            // AFAIK JSServe and Plotly both trigger this code.
            // NOTE: Jupyter doesn't do this, jupyter renders everything directly in pages DOM.
            //                                                                   -DRAL
            if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
                return html`<${IframeContainer} body=${body} />`
            } else {
                return html`<${PlutoHTML} body=${body} />`
            }
            break
        case "application/vnd.pluto.tree+object":
            return html`<div>
                <${TreeView} body=${body} />
            </div>`
            break
        case "application/vnd.pluto.table+object":
            return html` <${TableView} body=${body} />`
            break
        case "application/vnd.pluto.stacktrace+object":
            return html`<div><${ErrorMessage} ...${body} /></div>`
            break
        case "application/vnd.pluto.element+object":
            return html`<${PlutoHTMLElement} ...${body} />`
            break
        case "application/vnd.pluto.elementlist+object":
            return html`<${PlutoFragmentElement} ...${body} />`
            break
        case "text/plain":
            if (body) {
                return html`<div>
                    <pre class="no-block"><code>${body}</code></pre>
                </div>`
            } else {
                return html`<div></div>`
            }
            break
        default:
            return html``
            break
    }
}

let OutputBodyWebComponent = ({ mime, body, cell_id, persist_js_state = false, last_run_timestamp }) => {
    return html`<${CellOutputContext.Provider} value=${{
        cell_id,
        persist_js_state,
        last_run_timestamp,
    }}>
        <${OutputBody} mime=${mime} body=${body} />
    </${CellOutputContext.Provider}>`
}

register(OutputBodyWebComponent, "pluto-display", ["mime", "body", "cell_id", "persist_js_state", "last_run_timestamp"])

// Hihi
let async = async (async) => async()

/** @param {{ body: string }} props */
let IframeContainer = ({ body }) => {
    let iframeref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: "text/html" }))
        iframeref.current.src = url

        async(async () => {
            await new Promise((resolve) => iframeref.current.addEventListener("load", () => resolve()))

            /** @type {Document} */
            let iframeDocument = iframeref.current.contentWindow.document
            /** Grab the <script> tag for the iframe content window resizer
             * @type {HTMLScriptElement} */
            let original_script_element = document.querySelector("#iframe-resizer-content-window-script")
            // Clone it into the iframe document, so we have the exact same script tag there
            let iframe_resizer_content_script = iframeDocument.importNode(original_script_element)
            // Fix the `src` so it isn't relative to the iframes url, but this documents url
            iframe_resizer_content_script.src = new URL(iframe_resizer_content_script.src, original_script_element.baseURI).toString()
            iframeDocument.head.appendChild(iframe_resizer_content_script)

            // Apply iframe resizer from the host side
            new Promise((resolve) => iframe_resizer_content_script.addEventListener("load", () => resolve()))
            // @ts-ignore
            window.iFrameResize({ checkOrigin: false }, iframeref.current)
        })

        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<iframe
        style=${{ width: "100%", border: "none" }}
        src=""
        ref=${iframeref}
        frameborder="0"
        allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; layout-animations; legacy-image-formats; magnetometer; microphone; midi; navigation-override; oversized-images; payment; picture-in-picture; publickey-credentials-get; sync-xhr; usb; wake-lock; screen-wake-lock; vr; web-share; xr-spatial-tracking"
        allowfullscreen
    ></iframe>`
}
