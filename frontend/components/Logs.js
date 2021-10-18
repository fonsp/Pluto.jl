import _ from "../imports/lodash.js"
import { cl } from "../common/ClassTable.js"
import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import { SimpleOutputBody } from "./TreeView.js"

// Defined in editor.css
const GRID_WIDTH = 10
const RESIZE_THROTTLE = 60

export const Logs = ({ logs, line_heights, set_cm_highlighted_line }) => {
    const container = useRef(null)
    const [from, setFrom] = useState(0)
    const [to, setTo] = useState(Math.round(1000 / GRID_WIDTH))
    const logsWidth = logs.length * GRID_WIDTH
    useEffect(() => {
        if (!container.current) return
        const elem = container.current
        const fn = () => {
            const w = elem.clientWidth
            const scroll_left = elem.scrollLeft
            setFrom(Math.min(logs.length - 1, Math.round((scroll_left - w) / GRID_WIDTH)))
            setTo(Math.round((scroll_left + 2 * w) / GRID_WIDTH))
        }
        const l = _.throttle(fn, RESIZE_THROTTLE)
        document.addEventListener("resize", l)
        elem.addEventListener("scroll", l)
        return () => {
            elem.removeEventListener("scroll", l)
            document.removeEventListener("resize", l)
        }
    }, [container.current, logsWidth])
    const logsStyle = useMemo(
        () => `grid-template-rows: ${line_heights.map((y) => y + "px").join(" ")} repeat(auto-fill, 15px); width: ${logs.length * GRID_WIDTH}px;`,
        [logs.length, line_heights]
    )
    const is_hidden_input = line_heights[0] === 0
    if (logs.length === 0) return null
    return html`
        <pluto-logs-container ref=${container}>
            <pluto-logs style="${logsStyle}">
                ${logs.map((log, i) => {
                    return html`<${Dot}
                        set_cm_highlighted_line=${set_cm_highlighted_line}
                        show=${logs.length < 50 || (from <= i && i < to)}
                        level=${log.level}
                        msg=${log.msg}
                        kwargs=${log.kwargs}
                        mykey=${`log${i}`}
                        key=${`log${i}`}
                        x=${i}
                        y=${is_hidden_input ? 0 : log.line - 1}
                    /> `
                })}
            </pluto-logs>
        </pluto-logs-container>
    `
}

const mimepair_output = (pair) => html`<${SimpleOutputBody} cell_id=${"adsf"} mime=${pair[1]} body=${pair[0]} persist_js_state=${false} />`

const Dot = ({ set_cm_highlighted_line, show, msg, kwargs, x, y, level }) => {
    const node_ref = useRef(null)
    // const label_ref = useRef(null)
    // useEffect(() => {
    //     label_ref.current.innerHTML = body
    // }, [body])
    const [inspecting, set_inspecting] = useState(false)

    useLayoutEffect(() => {
        node_ref.current.style.gridColumn = `${x + 1}`
        node_ref.current.style.gridRow = `${y + 1}`
    }, [x, y])

    useLayoutEffect(() => {
        if (inspecting && show) {
            const f = (e) => {
                if (!e.target.closest || e.target.closest("pluto-log-dot-positioner") !== node_ref.current) {
                    set_inspecting(false)
                    set_cm_highlighted_line(null)
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

    return show
        ? html` <pluto-log-dot-positioner
              ref=${node_ref}
              class=${cl({ inspecting })}
              onClick=${() => {
                  set_inspecting(true)
                  set_cm_highlighted_line(y+1)
              }}
              onMouseenter=${() => set_cm_highlighted_line(y+1)}
              onMouseleave=${() => set_cm_highlighted_line(null)}
          >
              <pluto-log-dot-sizer>
                  <pluto-log-dot class=${level}
                      >${mimepair_output(msg)}${kwargs.map(
                          ([k, v]) =>
                              html` <pluto-log-dot-kwarg><pluto-key>${k}</pluto-key> <pluto-value>${mimepair_output(v)}</pluto-value></pluto-log-dot-kwarg> `
                      )}</pluto-log-dot
                  >
              </pluto-log-dot-sizer>
          </pluto-log-dot-positioner>`
        : html`<pluto-log-dot-positioner ref=${node_ref}></pluto-log-dot-positioner>`
}
