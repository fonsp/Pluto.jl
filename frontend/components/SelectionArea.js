import { html, Component } from "../imports/Preact.js"

import { has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"

const get_element_position_in_document = (element) => {
    let top = 0
    let left = 0

    do {
        top += element.offsetTop || 0
        left += element.offsetLeft || 0
        element = element.offsetParent
    } while (element)

    return {
        top: top,
        left: left,
    }
}

const in_request_animation_frame = (fn) => {
    let last_known_arguments = null
    let ticking = false

    return (...args) => {
        last_known_arguments = args
        if (!ticking) {
            window.requestAnimationFrame(() => {
                fn(...last_known_arguments)
                ticking = false
            })

            ticking = true
        }
    }
}

export class SelectionArea extends Component {
    constructor() {
        super()
        this.state = {
            selection_start: null,
            selection_ends: null,
        }
    }

    componentDidMount() {
        /* SELECTIONS */
        document.addEventListener("mousedown", (e) => {
            const t = e.target.tagName
            // TODO: also allow starting the selection in one codemirror and stretching it to another cell
            if (e.button === 0 && (t === "BODY" || t === "MAIN" || t === "PLUTO-NOTEBOOK" || t === "PREAMBLE")) {
                this.props.on_selection([])
                this.setState({
                    selection_start: { x: e.pageX, y: e.pageY },
                    selection_end: { x: e.pageX, y: e.pageY },
                })
            }
        })

        document.addEventListener("mouseup", (e) => {
            if (this.state.selection_start != null) {
                this.setState({
                    selection_start: null,
                    selection_end: null,
                })
                this.props.actions.set_scroller({ up: false, down: false })
            } else {
                // if you didn't click on a UI element...
                if (
                    !e.composedPath().some((e) => {
                        const tag = e.tagName
                        return tag === "PLUTO-SHOULDER" || tag === "BUTTON"
                    })
                ) {
                    // ...clear the selection
                    this.props.on_selection([])
                }
            }
        })

        let update_selection = in_request_animation_frame(({ pageX, pageY }) => {
            let selection_start = this.state.selection_start
            if (selection_start == null) return

            let selection_end = { x: pageX, y: pageY }

            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

            let A = {
                start_left: Math.min(selection_start.x, selection_end.x),
                start_top: Math.min(selection_start.y, selection_end.y),
                end_left: Math.max(selection_start.x, selection_end.x),
                end_top: Math.max(selection_start.y, selection_end.y),
            }
            let in_selection = cell_nodes.filter((cell) => {
                let cell_position = get_element_position_in_document(cell)
                let cell_size = cell.getBoundingClientRect()

                let B = {
                    start_left: cell_position.left,
                    start_top: cell_position.top,
                    end_left: cell_position.left + cell_size.width,
                    end_top: cell_position.top + cell_size.height,
                }
                return A.start_left < B.end_left && A.end_left > B.start_left && A.start_top < B.end_top && A.end_top > B.start_top
            })

            this.props.actions.set_scroller({ up: selection_start.y > selection_end.y, down: selection_start.y < selection_end.y })
            this.props.on_selection(in_selection.map((x) => x.id))
            this.setState({
                selection_end: selection_end,
            })
        })

        document.addEventListener(
            "scroll",
            (e) => {
                if (this.state.selection_start) {
                    update_selection({ pageX: this.mouse_position.clientX, pageY: this.mouse_position.clientY + document.documentElement.scrollTop })
                }
            },
            { passive: true }
        )

        document.addEventListener("mousemove", (e) => {
            this.mouse_position = e
            if (this.state.selection_start) {
                update_selection({ pageX: e.pageX, pageY: e.pageY })
                e.preventDefault()
            }
        })

        document.addEventListener("selectstart", (e) => {
            if (this.state.selection_start) {
                e.preventDefault()
            }
        })

        // Ctrl+A to select all cells
        document.addEventListener("keydown", (e) => {
            if (e.key === "a" && has_ctrl_or_cmd_pressed(e)) {
                // if you are not writing text somewhere else
                if (document.activeElement === document.body && window.getSelection().isCollapsed) {
                    this.props.on_selection(this.props.cells.map((x) => x.cell_id))
                    e.preventDefault()
                }
            }
        })
    }

    render() {
        let { selection_start, selection_end } = this.state

        if (selection_start == null) {
            return null
        }

        return html`
            <selectarea
                style=${{
                    position: "absolute",
                    background: "rgba(40, 78, 189, 0.24)",
                    zIndex: 10,
                    top: Math.min(selection_start.y, selection_end.y),
                    left: Math.min(selection_start.x, selection_end.x),
                    width: Math.abs(selection_start.x - selection_end.x),
                    height: Math.abs(selection_start.y - selection_end.y),
                }}
            />
        `
    }
}
