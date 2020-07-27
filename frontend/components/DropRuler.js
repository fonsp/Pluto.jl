import { html, Component } from "../common/Preact.js"

export class DropRuler extends Component {
    constructor() {
        super()
        this.elementRef = null
        this.dropee = null
        this.cell_edges = []
        this.precompute_cell_edges = () => {
            const cell_nodes = Array.from(document.querySelectorAll("notebook > cell"))
            this.cell_edges = cell_nodes.map((el) => el.offsetTop)
            this.cell_edges.push(cell_nodes.last().offsetTop + cell_nodes.last().scrollHeight)
        }
        this.getDropIndexOf = (pageY) => {
            const distances = this.cell_edges.map((p) => Math.abs(p - pageY - 8)) // 8 is the magic computer number: https://en.wikipedia.org/wiki/8
            return argmin(distances)
        }

        this.state = {
            dragging: false,
            drop_index: 0,

            selecting: false,
            selection_start_index: 0,
            selection_stop_index: 0,
        }
    }

    componentDidMount() {
        this.elementRef = this.base
        document.addEventListener("dragstart", (e) => {
            if (e.target.tagName != "CELLSHOULDER") {
                this.setState({
                    dragging: false,
                })
                this.dropee = null
            } else {
                this.setState({
                    dragging: true,
                })
                this.dropee = e.target.parentElement

                this.precompute_cell_edges()
            }
        })

        document.addEventListener("dragover", (e) => {
            // Called continuously during drag
            this.setState({
                drop_index: this.getDropIndexOf(e.pageY),
            })
            e.preventDefault()
        })
        document.addEventListener("dragend", (e) => {
            // Called after drag, also when dropped outside of the browser or when ESC is pressed
            this.setState({
                dragging: false,
            })
        })
        document.addEventListener("drop", (e) => {
            if (!this.dropee) {
                return
            }
            // Called when drag-dropped somewhere on the page
            const drop_index = this.getDropIndexOf(e.pageY)
            const friends = this.props.selected_friends(this.dropee.id)
            this.props.requests.move_remote_cells(friends, drop_index)
        })

        /* SELECTIONS */

        document.addEventListener("mousedown", (e) => {
            if (e.button === 0 && (e.target.tagName === "MAIN" || e.target.tagName === "NOTEBOOK" || e.target.tagName === "PREAMBLE")) {
                this.precompute_cell_edges()
                const new_index = this.getDropIndexOf(e.pageY)
                this.setState({
                    selecting: true,
                    selection_start_index: new_index,
                    selection_stop_index: new_index,
                })
                // the setState callback seems to be broken (uses the outdated state)
                // so we do it ourselves:
                this.props.on_selection({
                    selection_start_index: new_index,
                    selection_stop_index: new_index,
                })
            }
        })

        document.addEventListener("mouseup", (e) => {
            if (this.state.selecting) {
                this.setState({
                    selecting: false,
                    selection_start_index: null,
                    selection_stop_index: null,
                })
            } else {
                // if you didn't click on a UI element...
                if (
                    !e.composedPath().some((e) => {
                        const tag = e.tagName
                        return tag === "CELLSHOULDER" || tag === "BUTTON"
                    })
                ) {
                    // ...clear the selection
                    this.props.on_selection({
                        selection_start_index: null,
                        selection_stop_index: null,
                    })
                }
            }
        })

        document.addEventListener("mousemove", (e) => {
            if (this.state.selecting) {
                const new_stop_index = this.getDropIndexOf(e.pageY)
                if (new_stop_index !== this.state.selection_stop_index) {
                    this.setState({
                        selection_stop_index: new_stop_index,
                    })
                    // the setState callback seems to be broken (uses the outdated state)
                    // so we do it ourselves:
                    this.props.on_selection({
                        selection_start_index: this.state.selection_start_index,
                        selection_stop_index: new_stop_index,
                    })
                }
            }
        })

        document.addEventListener("selectstart", (e) => {
            if (this.state.selecting) {
                e.preventDefault()
            }
        })

        // Ctrl+A to select all cells
        document.addEventListener("keydown", (e) => {
            switch (e.keyCode) {
                case 65: // a
                    if (e.ctrlKey) {
                        // if you are not writing text somewhere else
                        if (document.activeElement === document.body && window.getSelection().isCollapsed) {
                            this.props.on_selection({
                                selection_start_index: 0,
                                selection_stop_index: Infinity,
                            })
                            e.preventDefault()
                        }
                    }
                    break
            }
        })
    }

    render() {
        return html`<dropruler style=${this.state.dragging ? { display: "block", top: this.cell_edges[this.state.drop_index] + "px" } : {}}></dropruler>`
    }
}

const argmin = (x) => {
    let best_val = Infinity
    let best_index = -1
    let val
    for (let i = 0; i < x.length; i++) {
        val = x[i]
        if (val < best_val) {
            best_index = i
            best_val = val
        }
    }
    return best_index
}
