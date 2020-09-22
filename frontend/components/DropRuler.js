import { html, Component } from "../common/Preact.js"

export class DropRuler extends Component {
    constructor() {
        super()
        this.dropee = null
        this.cell_edges = []
        this.mouse_position = {}
        this.precompute_cell_edges = () => {
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))
            this.cell_edges = cell_nodes.map((el) => el.offsetTop)
            this.cell_edges.push(last(cell_nodes).offsetTop + last(cell_nodes).scrollHeight)
        }
        this.getDropIndexOf = ({ pageX, pageY }, always_round_nearest = false) => {
            const notebook = document.querySelector("pluto-notebook")

            const rounding_mode = always_round_nearest
                ? "nearest"
                : pageX < notebook.offsetLeft
                ? "floor"
                : pageX > notebook.offsetLeft + notebook.scrollWidth
                ? "ceil"
                : "nearest"

            const f =
                rounding_mode === "ceil"
                    ? (x) => (x >= 0 ? x : Infinity)
                    : rounding_mode === "floor"
                    ? (x) => (x <= 0 ? -x : Infinity)
                    : rounding_mode === "nearest"
                    ? Math.abs
                    : Math.abs

            const distances = this.cell_edges.map((p) => f(p - pageY - 8)) // 8 is the magic computer number: https://en.wikipedia.org/wiki/8
            return argmin(distances)
        }

        this.state = {
            dragging: false,
            drop_index: 0,
        }
    }

    componentDidMount() {
        document.addEventListener("dragstart", (e) => {
            if (!e.target.matches("pluto-shoulder")) {
                this.setState({
                    dragging: false,
                })
                this.dropee = null
            } else {
                this.dropee = e.target.parentElement
                this.precompute_cell_edges()

                this.setState(
                    {
                        dragging: true,
                        drop_index: this.getDropIndexOf(e, true),
                    },
                    () => {
                        let prev_time = null
                        const scroll_update = (timestamp) => {
                            if (prev_time == null) {
                                prev_time = timestamp
                            }
                            const dt = timestamp - prev_time
                            prev_time = timestamp

                            const y_ratio = this.mouse_position.clientY / window.innerHeight
                            if (y_ratio < 0.3) {
                                window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000)
                            }
                            if (y_ratio > 0.7) {
                                window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000)
                            }
                            if (this.state.dragging) {
                                window.requestAnimationFrame(scroll_update)
                            }
                        }
                        window.requestAnimationFrame(scroll_update)
                    }
                )
            }
        })
        document.addEventListener("dragover", (e) => {
            // Called continuously during drag
            this.mouse_position = e

            this.setState({
                drop_index: this.getDropIndexOf(e, true),
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
            const drop_index = this.getDropIndexOf(e, true)
            const friends = this.props.selected_friends(this.dropee.id)
            this.props.requests.move_remote_cells(friends, drop_index)
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

const last = (x) => x[x.length - 1]
