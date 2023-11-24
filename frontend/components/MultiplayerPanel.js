import _ from "../imports/lodash.js"
import { html, useEffect, useRef, useContext, useState, useLayoutEffect, useCallback } from "../imports/Preact.js"
import { PerfectCursor } from "../imports/PerfectCursors.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"

// TODO: investigate why effect is bad with low throttle rate?
// ....  update notebook should be pretty fast.
const CURSOR_THROTTLE_RATE = 100

const mouse_data_to_point = ({relative_to_cell, relative_x, relative_y}) => {
    const cell_elt = document.getElementById(relative_to_cell)

    if (cell_elt === null) {
        // Cell might not be synced
        return [relative_x, relative_y]
    }

    return [
        relative_x + cell_elt.offsetLeft,
        relative_y + cell_elt.offsetTop,
    ]
}

const update_mouse_data = (mouseX, mouseY) => {
    const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

    let best_index = null
    let best_dist = Infinity
    let relative_x = mouseX
    let relative_y = mouseY

    const mousePt = [mouseX, mouseY]

    for (let cell_elt of cell_nodes) {
        const dist_with_cell = dist2(mousePt, [cell_elt.offsetLeft, cell_elt.offsetTop])
        if (dist_with_cell < best_dist) {
            best_dist = dist_with_cell
            best_index = cell_elt.id
            relative_x = mouseX - cell_elt.offsetLeft
            relative_y = mouseY - cell_elt.offsetTop
        }
    }

    return { relative_to_cell: best_index, relative_x, relative_y }
}

// https://github.com/steveruizok/perfect-cursors/tree/main?tab=readme-ov-file#usage-in-react
const usePerfectCursor = (cb, point) => {
    const [pc] = useState(() => new PerfectCursor(cb))

    useLayoutEffect(() => {
        if (point) pc.addPoint(point)
        return pc.dispose()
    }, [pc])

    const onPointChange = useCallback(
        (point) => pc.addPoint(point),
     [pc])

    return onPointChange
}

const hexToRGBA = (hex, alpha) => `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,8),16)},${alpha})`
const dist2 = ([x1,y1], [x2,y2]) => (x1 - x2) ^ 2 + (y1 - y2) ^ 2

const Cursor = ({ mouse: point, color }) => {
    if (!point) return
    const r = useRef(null)

    const animate = useCallback((point) => {
        const elm = r.current
        if (!elm) return
        elm.style.setProperty("transform", `translate(${point[0]}px, ${point[1]}px)`)
    }, [])

    const onPointMove = usePerfectCursor(animate)
    useLayoutEffect(() => onPointMove(point), [point, onPointMove])

    color = color ?? "#eeeeee"

    return html`
    <div
      ref=${r}
      style=${{
        position: "fixed",
        top: -10,
        left: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        border: "solid 8px " + hexToRGBA(color , 0.5 ),
        backgroundColor: color,
      }}
    ></div>
    `
}

const usePassiveDocumentEventListener = (event_name, handler_fn, deps) => {
    useEffect(() => {
        document.addEventListener(event_name, handler_fn)
        return () => window.removeEventListener(event_name, handler_fn)
    }, deps)
}

export const MultiplayerPanel = ({ users, client_id }) => {
    if (!users || Object.keys(users).length == 1) return
    const { update_notebook } = useContext(PlutoActionsContext)

    usePassiveDocumentEventListener("mousemove", _.throttle((event) => {
        update_notebook(notebook => {
            if (!(client_id in notebook.users)) return
            notebook.users[client_id].mouse = update_mouse_data(event.pageX, event.pageY)
        })
    }, CURSOR_THROTTLE_RATE), [client_id])

    // usePassiveDocumentEventListener("blur", update_notebook(notebook => {
    //     if (!(client_id in notebook.users)) return
    //     notebook.users[client_id].mouse = null
    // }), [])

    return html`
        <div className="pluto-multiplayer">
            <ul>
                ${Object.entries(users).map(
                    ([clientID, { name, mouse, color, focused_cell }]) =>
                        html`<li key=${clientID} style=${`color: ${color};`}>${name} - ${focused_cell}
                            ${client_id == clientID || !mouse ? null : html`<${Cursor} mouse=${mouse_data_to_point(mouse)} color=${color} />`}
                    </li>`
                )}
            </ul>
        </div>
    `
}
