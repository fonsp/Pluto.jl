import { html, useState, useEffect, useLayoutEffect, useRef, useContext } from "../imports/Preact.js"

export const Logs = ({ logs }) => {
    return html`
        <pluto-logs-container>
            <pluto-logs>
                <div style="grid-row: 1 / 20 "></div>
                ${logs.map((log, i) => {
                    return html`<${Dot} level=${log.level} body=${log.msg} x=${i} y=${log.line - 1} /> `
                })}
            </pluto-logs>
        </pluto-logs-container>
    `
}

const Dot = ({ body, x, y, level }) => {
    const node_ref = useRef(null)
    const label_ref = useRef(null)
    useEffect(() => {
        label_ref.current.innerHTML = body
    }, [body])

    useLayoutEffect(() => {
        // node_ref.current.style.top = `${17 * y}px`
        // node_ref.current.style.left = `${17 * x}px`
        node_ref.current.style.gridColumn = `${x + 1}`
        node_ref.current.style.gridRow = `${y + 1}`
    }, [x, y])
    return html` <pluto-log-dot class=${level} ref=${node_ref}><div ref=${label_ref}></div></pluto-log-dot>`
}
