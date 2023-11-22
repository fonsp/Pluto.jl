import _ from "../imports/lodash.js"
import { html, useEffect, useRef, useContext, useState, useLayoutEffect, useCallback } from "../imports/Preact.js"
import { PerfectCursor } from "../imports/PerfectCursors.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"

// TODO: investigate why effect is bad with low throttle rate?
// ....  update notebook should be pretty fast.
const CURSOR_THROTTLE_RATE = 100

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
            notebook.users[client_id].mouse = [
                event.clientX,
                event.clientY,
            ]
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
                            ${client_id == clientID ? null : html`<${Cursor} mouse=${mouse} color=${color} />`}
                    </li>`
                )}
            </ul>
        </div>
    `
}
