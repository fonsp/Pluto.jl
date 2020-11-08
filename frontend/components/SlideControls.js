import { html } from "../imports/Preact.js"

export const SlideControls = () => {
    const calculate_slide_positions = () => {
        const height = window.innerHeight
        const headers = Array.from(document.querySelectorAll("pluto-output h1, pluto-output h2"))
        const pos = headers.map((el) => el.getBoundingClientRect())
        const edges = pos.map((rect) => rect.top + window.pageYOffset)

        const notebook_node = document.querySelector("pluto-notebook")
        edges.push(notebook_node.getBoundingClientRect().bottom + window.pageYOffset)

        const scrollPositions = headers.map((el, i) => {
            if (el.tagName == "H1") {
                // center vertically
                const slideHeight = edges[i + 1] - edges[i] - height
                return edges[i] - Math.max(0, (height - slideHeight) / 2)
            } else {
                // align to top
                return edges[i] - 20
            }
        })

        return scrollPositions
    }

    const go_previous_slide = (e) => {
        const positions = calculate_slide_positions()

        window.scrollTo(
            window.pageXOffset,
            positions.reverse().find((y) => y < window.pageYOffset - 10)
        )
    }

    const go_next_slide = (e) => {
        const positions = calculate_slide_positions()
        window.scrollTo(
            window.pageXOffset,
            positions.find((y) => y - 10 > window.pageYOffset)
        )
    }

    window.present = () => {
        document.body.classList.toggle("presentation")
    }

    return html`
        <nav id="slide_controls">
            <button class="changeslide prev" title="Previous slide" onClick=${go_previous_slide}><span></span></button>
            <button class="changeslide next" title="Next slide" onClick=${go_next_slide}><span></span></button>
        </nav>
    `
}
