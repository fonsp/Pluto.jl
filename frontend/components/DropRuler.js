import { html, Component } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

export class DropRuler extends Component {
    constructor() {
        super()
        this.dropee = null
        this.dropped = null
        this.cell_edges = []
        this.pointer_position = { pageX: 0, pageY: 0 }
        this.precompute_cell_edges = () => {
            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))
            this.cell_edges = cell_nodes.map((el) => el.offsetTop)
            this.cell_edges.push(last(cell_nodes).offsetTop + last(cell_nodes).scrollHeight)
        }
        this.getDropIndexOf = ({ pageX, pageY }) => {
            const distances = this.cell_edges.map((p) => Math.abs(p - pageY - 8)) // 8 is the magic computer number: https://en.wikipedia.org/wiki/8
            return argmin(distances)
        }

        this.state = {
            drag_start: false,
            drag_target: false,
            drop_index: 0,
        }
    }

    componentDidMount() {
        document.addEventListener("dragstart", (e) => {
            if (!e.dataTransfer) return
            let target = /** @type {Element} */ (e.target)
            if (target.matches("pluto-shoulder")) {
                this.dropee = target.parentElement
                e.dataTransfer.setData("text/pluto-cell", this.props.serialize_selected(this.dropee?.id))
                this.dropped = false
                this.precompute_cell_edges()

                this.setState({
                    drag_start: true,
                    drop_index: this.getDropIndexOf(e),
                })
                this.props.set_scroller({ up: true, down: true })
            } else {
                this.setState({
                    drag_start: false,
                    drag_target: false,
                })
                this.props.set_scroller({ up: false, down: false })
                this.dropee = null
            }
        })
        document.addEventListener("dragenter", (e) => {
            if (!e.dataTransfer) return
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            if (!this.state.drag_target) this.precompute_cell_edges()
            this.lastenter = e.target
            this.setState({ drag_target: true })
            e.preventDefault()
        })
        document.addEventListener("dragleave", (e) => {
            if (!e.dataTransfer) return
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            if (e.target === this.lastenter) {
                this.setState({ drag_target: false })
            }
        })
        const precompute_cell_edges_throttled = _.throttle(this.precompute_cell_edges, 4000, { leading: false, trailing: true })
        const update_drop_index_throttled = _.throttle(
            () => {
                this.setState({
                    drop_index: this.getDropIndexOf(this.pointer_position),
                })
            },
            300,
            { leading: false, trailing: true }
        )
        document.addEventListener("dragover", (e) => {
            if (!e.dataTransfer) return
            // Called continuously during drag
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            this.pointer_position = e

            precompute_cell_edges_throttled()
            update_drop_index_throttled()

            if (this.state.drag_start) {
                // Then we're dragging a cell from within the notebook. Use a move icon:
                e.dataTransfer.dropEffect = "move"
            }
            e.preventDefault()
        })
        document.addEventListener("dragend", (e) => {
            // Called after drag, also when dropped outside of the browser or when ESC is pressed
            update_drop_index_throttled.flush()
            this.setState({
                drag_start: false,
                drag_target: false,
            })
            this.props.set_scroller({ up: false, down: false })
        })
        document.addEventListener("drop", (e) => {
            if (!e.dataTransfer) return
            // Guaranteed to fire before the 'dragend' event
            // Ignore files
            if (e.dataTransfer.types[0] !== "text/pluto-cell") {
                return
            }
            this.setState({
                drag_target: false,
            })
            this.dropped = true
            if (this.dropee && this.state.drag_start) {
                // Called when drag-dropped somewhere on the page
                const drop_index = this.getDropIndexOf(e)
                const friend_ids = this.props.selected_cells.includes(this.dropee.id) ? this.props.selected_cells : [this.dropee.id]
                this.props.actions.move_remote_cells(friend_ids, drop_index)
            } else {
                // Called when cell(s) from another window are dragged onto the page
                const drop_index = this.getDropIndexOf(e)
                const data = e.dataTransfer.getData("text/pluto-cell")
                this.props.actions.add_deserialized_cells(data, drop_index)
            }
        })
    }

    render() {
        const styles = this.state.drag_target
            ? {
                  display: "block",
                  top: this.cell_edges[this.state.drop_index] + "px",
              }
            : {}
        return html`<dropruler style=${styles}></dropruler>`
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
