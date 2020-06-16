import { html } from "../common/Html.js"
import { Component } from "https://unpkg.com/preact@10.4.4?module"

export class DropRuler extends Component {
    constructor() {
        super()
        this.elementRef = null
        this.dropee = null
        this.dropPositions = []
        this.getDropIndexOf = (pageY) => {
            const distances = this.dropPositions.map((p) => Math.abs(p - pageY))
            return argmin(distances)
        }

        this.state = {
            dragging: false,
            dropIndex: 0,
        }
    }

    componentDidMount() {
        this.elementRef = this.base
        document.ondragstart = (e) => {
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

                const cellNodes = Array.from(document.querySelectorAll("notebook > cell"))
                this.dropPositions = cellNodes.map((el) => el.offsetTop)
                this.dropPositions.push(cellNodes.last().offsetTop + cellNodes.last().scrollHeight)
            }
        }

        document.ondragover = (e) => {
            // Called continuously during drag
            this.setState({
                dropIndex: this.getDropIndexOf(e.pageY),
            })
            e.preventDefault()
        }
        document.ondragend = (e) => {
            // Called after drag, also when dropped outside of the browser or when ESC is pressed
            this.setState({
                dragging: false,
            })
        }
        document.ondrop = (e) => {
            if (!this.dropee) {
                return
            }
            // Called when drag-dropped somewhere on the page
            const dropIndex = this.getDropIndexOf(e.pageY)
            this.props.requests.move_remote_cell(this.dropee.id, dropIndex)
        }
    }

    render() {
        return html`<dropruler style=${this.state.dragging ? { display: "block", top: this.dropPositions[this.state.dropIndex] + "px" } : {}}></dropruler>`
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
