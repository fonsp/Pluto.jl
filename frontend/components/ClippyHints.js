import _ from "../imports/lodash.js"
import { cl } from "../common/ClassTable.js"
import { html, useState, useEffect, useLayoutEffect, useRef, useMemo } from "../imports/Preact.js"
import { SimpleOutputBody } from "./TreeView.js"

/**
 * @param {{
 *  clippy_hints: import("./Cell.js").ClippyHint[],
 * }} props
 * */
export const ClippyHints = ({ clippy_hints }) => {
    const container = useRef(null)

    return html`
        <pluto-hints ref=${container}>
            ${clippy_hints.map((hint) => {
                const { level, message } = hint

                return html`<${Hint} level=${level} message=${message} />`
            })}
        </pluto-hints>
    `
}

const Hint = ({ level, message }) => {
    const node_ref = useRef(null)
    const [inspecting, set_inspecting] = useState(false)

    useLayoutEffect(() => {
        if (inspecting) {
            const f = (e) => {
                if (!e.target.closest || e.target.closest("pluto-hint") !== node_ref.current) {
                    set_inspecting(false)
                }
            }
            window.addEventListener("click", f)
            window.addEventListener("blur", f)

            return () => {
                window.removeEventListener("click", f)
                window.removeEventListener("blur", f)
            }
        }
    }, [inspecting])

    return html` <pluto-hint
        ref=${node_ref}
        class=${cl({ inspecting }) + " " + level}
        onClick=${() => {
            set_inspecting(true)
        }}
    >
        <div class="content">${message}</div>
    </pluto-hint>`
}
