import { html, useRef, useEffect } from "../common/Preact.js"

export const Logs = ({ logs }) => {
    return html`
        <pluto-logs>
            ${logs.map((log, i) => {
                return html`<${Dot} level=${log.level} body=${log.msg} x=${i} y=${log.line - 1} /> `
            })}
        </pluto-logs>
    `
}

const Dot = ({ body, x, y, level }) => {
    const node_ref = useRef(null)
    const label_ref = useRef(null)
    useEffect(() => {
        label_ref.current.innerHTML = body
    }, [body])

    useEffect(() => {
        node_ref.current.style.top = `${17 * y}px`
        node_ref.current.style.left = `${17 * x}px`
    }, [x, y])
    return html` <pluto-log-dot class=${level} ref=${node_ref}><div ref=${label_ref}></div></pluto-log-dot>`
}
