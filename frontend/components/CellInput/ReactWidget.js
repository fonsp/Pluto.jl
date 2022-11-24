import { render } from "../../imports/Preact.js"
import { WidgetType } from "../../imports/CodemirrorPlutoSetup.js"

/**
 * Use this Widget to render (P)react components as codemirror widgets.
 */
export class ReactWidget extends WidgetType {
    /** @param {import("../../imports/Preact.js").ReactElement} element */
    constructor(element) {
        super()
        this.element = element
    }

    eq(other) {
        return false
    }

    toDOM() {
        let span = document.createElement("span")
        render(this.element, span)
        return span
    }

    updateDOM(dom) {
        render(this.element, dom)
        return true
    }
}
