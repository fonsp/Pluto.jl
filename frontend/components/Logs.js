import _ from "../imports/lodash.js"
import { cl } from "../common/ClassTable.js"
import { html, useState, useEffect, useLayoutEffect, useRef, useMemo } from "../imports/Preact.js"
import { SimpleOutputBody } from "./TreeView.js"
import { help_circle_icon } from "./Popup.js"

// Defined in editor.css
const GRID_WIDTH = 10
const RESIZE_THROTTLE = 60
const PROGRESS_LOG_LEVEL = "LogLevel(-1)"

const is_progress_log = (log) => {
    return log.level == PROGRESS_LOG_LEVEL && log.kwargs.find((kwarg) => kwarg[0] === "progress") !== undefined
}

export const Logs = ({ logs, line_heights, set_cm_highlighted_line }) => {
    const container = useRef(null)
    const [from, setFrom] = useState(0)
    const [to, setTo] = useState(Math.round(1000 / GRID_WIDTH))
    const progress_logs = logs.filter(is_progress_log)
    const latest_progress_logs = progress_logs.reduce((progress_logs, log) => ({ ...progress_logs, [log.id]: log }), {})
    const [_, grouped_progress_and_logs] = logs.reduce(
        ([seen, final_logs], log) => {
            const ipl = is_progress_log(log)
            if (ipl && !(log.id in seen)) {
                return [{ ...seen, [log.id]: true }, [...final_logs, latest_progress_logs[log.id]]]
            } else if (!ipl) {
                return [seen, [...final_logs, log]]
            }
            return [seen, final_logs]
        },
        [{}, []]
    )
    const logsWidth = grouped_progress_and_logs.length * GRID_WIDTH

    const logsStyle = useMemo(
        () => `grid-template-rows: ${line_heights.map((y) => y + "px").join(" ")} repeat(auto-fill, 15px); width: ${logsWidth}px;`,
        [logsWidth, line_heights]
    )

    useEffect(() => {
        if (!container.current) return
        const elem = container.current
        const fn = () => {
            const w = elem.clientWidth
            const scroll_left = elem.scrollLeft
            setFrom(Math.min(logs.length - 1, Math.round((scroll_left - w) / GRID_WIDTH)))
            setTo(Math.round((scroll_left + 2 * w) / GRID_WIDTH))
        }
        const l = fn // _.throttle(fn, RESIZE_THROTTLE)
        document.addEventListener("resize", l)
        elem.addEventListener("scroll", l)
        return () => {
            elem.removeEventListener("scroll", l)
            document.removeEventListener("resize", l)
        }
    }, [container.current, logsWidth])
    const is_hidden_input = line_heights[0] === 0
    if (logs.length === 0) {
        return null
    }

    return html`
        <pluto-logs-container ref=${container}>
            <pluto-logs style="${logsStyle}">
                ${grouped_progress_and_logs.map((log, i) => {
                    return html`<${Dot}
                        set_cm_highlighted_line=${set_cm_highlighted_line}
                        show=${logs.length < 50 || (from <= i && i < to)}
                        level=${log.level}
                        msg=${log.msg}
                        kwargs=${log.kwargs}
                        mykey=${`log${i}`}
                        key=${i}
                        x=${i}
                        y=${is_hidden_input ? 0 : log.line - 1}
                    /> `
                })}
            </pluto-logs>
        </pluto-logs-container>
    `
}

const Progress = ({ progress }) => {
    const bar_ref = useRef(null)

    useLayoutEffect(() => {
        bar_ref.current.style.backgroundSize = `${progress * 100}% 100%`
    }, [progress])

    return html`<pluto-progress-bar ref=${bar_ref}>${Math.ceil(100 * progress)}%</pluto-progress-bar>`
}

const mimepair_output = (pair) => html`<${SimpleOutputBody} cell_id=${"adsf"} mime=${pair[1]} body=${pair[0]} persist_js_state=${false} />`

const Dot = ({ set_cm_highlighted_line, show, msg, kwargs, x, y, level }) => {
    const node_ref = useRef(null)
    // const label_ref = useRef(null)
    // useEffect(() => {
    //     label_ref.current.innerHTML = body
    // }, [body])
    const [inspecting, set_inspecting] = useState(false)

    const is_progress = is_progress_log({ level, kwargs })
    const is_stdout = level === "LogLevel(-555)"
    let progress = null
    if (is_progress) {
        progress = kwargs.find((p) => p[0] === "progress")[1][0]
        if (progress === "nothing") {
            progress = 0
        } else if (progress === '"done"') {
            progress = 1
        } else {
            progress = parseFloat(progress)
        }

        level = "Progress"
        y = 0
    }
    if (is_stdout) {
        level = "Stdout"
    }

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
                  is_progress || set_cm_highlighted_line(y + 1)
              }}
              onMouseenter=${() => is_progress || set_cm_highlighted_line(y + 1)}
              onMouseleave=${() => set_cm_highlighted_line(null)}
          >
              <pluto-log-dot-sizer>
                  ${is_stdout
                      ? html`<${MoreInfo}
                            body=${html`This text was written to the ${" "}<a href="https://en.wikipedia.org/wiki/Standard_streams" target="_blank"
                                    >terminal stream</a
                                >${" "}while running the cell. It is not the${" "}<em>output value</em>${" "}of this cell.`}
                        />`
                      : null}
                  <pluto-log-dot class=${level}
                      >${is_progress
                          ? html`<${Progress} progress=${progress} />`
                          : is_stdout
                          ? html`<${MoreInfo}
                                    body=${html`${"This text was written to the "}
                                        <a href="https://en.wikipedia.org/wiki/Standard_streams" target="_blank">terminal stream</a
                                        >${" while running the cell. "}<span style="opacity: .5"
                                            >${"(It is not the "}<em>return value</em>${" of the cell.)"}</span
                                        >`}
                                />
                                <pre>${msg[0]}</pre>`
                          : html`${mimepair_output(msg)}${kwargs.map(
                                ([k, v]) =>
                                    html`
                                        <pluto-log-dot-kwarg><pluto-key>${k}</pluto-key> <pluto-value>${mimepair_output(v)}</pluto-value></pluto-log-dot-kwarg>
                                    `
                            )}`}</pluto-log-dot
                  >
              </pluto-log-dot-sizer>
          </pluto-log-dot-positioner>`
        : html`<pluto-log-dot-positioner ref=${node_ref}></pluto-log-dot-positioner>`
}

const MoreInfo = ({ body }) => {
    return html`<a
        class="stdout-info"
        target="_blank"
        title="Click for more info"
        href="#"
        onClick=${(e) => {
            window.dispatchEvent(
                new CustomEvent("open pluto popup", {
                    detail: {
                        type: "info",
                        source_element: e.currentTarget,
                        body,
                    },
                })
            )
            e.preventDefault()
        }}
        ><img alt="❔" src=${help_circle_icon} width="17"
    /></a>`
}
