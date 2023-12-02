import { render } from "../../imports/Preact.js"
import { WidgetType } from "../../imports/CodemirrorPlutoSetup.js"
import _ from "../../imports/lodash.js"

/**
 * Use this Widget to render (P)react components as codemirror widgets.
 */
export class ReactWidget extends WidgetType {
    /** @param {import("../../imports/Preact.js").ReactElement} element */
    constructor(element, to_compare = []) {
        super()
        this.element = element
        this.to_compare = to_compare
    }

    eq(other) {
        return _.isEqual(this.to_compare, other.to_compare)
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
