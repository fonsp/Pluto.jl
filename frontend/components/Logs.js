import { cl } from "../common/ClassTable.js"
import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import { SimpleOutputBody } from "./TreeView.js"

// Defined in editor.css
const GRID_WIDTH = 10
const RESIZE_DEBOUNCE = 60

export const Logs = ({ logs, line_heights }) => {
    const container = useRef(null)
    const [from, setFrom] = useState(0)
    const [to, setTo] = useState(Math.round(1000 / GRID_WIDTH))
    const logsWidth = logs.length * GRID_WIDTH
    useEffect(() => {
        if (!container.current) return
        const elem = container.current
        const fn = () => {
            const w = elem.clientWidth
            const scrollY = elem.scrollLeft
            const elements = Math.round(w / GRID_WIDTH + 0.5)
            const hiddenElements = Math.round(elem.scrollLeft / GRID_WIDTH)
            console.table({ w, elements, hiddenElements, scrollY })
            setFrom(hiddenElements)
            setTo(hiddenElements + elements)
        }
        const l = _.debounce(fn, RESIZE_DEBOUNCE)
        document.addEventListener("resize", l)
        elem.addEventListener("scroll", l)
        return () => {
            elem.removeEventListener("scroll", l)
            document.removeEventListener("resize", l)
        }
    }, [container.current, logsWidth])
    const logsStyle = useMemo(
        () => `grid-template-rows: ${line_heights.map((y) => y + "px").join(" ")} repeat(auto-fill, 15px)}; width: ${logs.length * GRID_WIDTH}px;`,
        [logs.length, line_heights]
    )

    return html`
        <pluto-logs-container ref=${container}>
            <pluto-logs style="${logsStyle}">
                <div style="grid-row: 1 / 20"></div>
                ${[...logs.slice(from, to)].map((log, i) => {
                    return html`<${Dot} level=${log.level} msg=${log.msg} kwargs=${log.kwargs} x=${from + i} y=${log.line - 1} /> `
                })}
            </pluto-logs>
        </pluto-logs-container>
    `
}

const mimepair_output = (pair) => html`<${SimpleOutputBody} cell_id=${"adsf"} mime=${pair[1]} body=${pair[0]} persist_js_state=${false} />`

const Dot = ({ msg, kwargs, x, y, level }) => {
    const node_ref = useRef(null)
    // const label_ref = useRef(null)
    // useEffect(() => {
    //     label_ref.current.innerHTML = body
    // }, [body])

    useLayoutEffect(() => {
        node_ref.current.style.gridColumn = `${x + 1}`
        node_ref.current.style.gridRow = `${y + 1}`
    }, [x, y])

    const [inspecting, set_inspecting] = useState(false)
    useLayoutEffect(() => {
        if (inspecting) {
            const f = (e) => {
                if (!e.target.closest || e.target.closest("pluto-log-dot-positioner") !== node_ref.current) {
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

    return html` <pluto-log-dot-positioner
        ref=${node_ref}
        class=${cl({ inspecting })}
        onClick=${() => {
            set_inspecting(true)
        }}
    >
        <pluto-log-dot-sizer>
            <pluto-log-dot class=${level}
                >${mimepair_output(msg)}${kwargs.map(
                    ([k, v]) => html` <pluto-log-dot-kwarg><pluto-key>${k}</pluto-key> <pluto-value>${mimepair_output(v)}</pluto-value></pluto-log-dot-kwarg> `
                )}</pluto-log-dot
            >
        </pluto-log-dot-sizer>
    </pluto-log-dot-positioner>`
}
