"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactWidget = void 0;
const Preact_js_1 = require("../../imports/Preact.js");
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
/**
 * Use this Widget to render (P)react components as codemirror widgets.
 */
class ReactWidget extends CodemirrorPlutoSetup_js_1.WidgetType {
    /** @param {import("../../imports/Preact.js").ReactElement} element */
    constructor(element) {
        super();
        this.element = element;
    }
    eq(other) {
        return false;
    }
    toDOM() {
        let span = document.createElement("span");
        (0, Preact_js_1.render)(this.element, span);
        return span;
    }
    updateDOM(dom) {
        (0, Preact_js_1.render)(this.element, dom);
        return true;
    }
}
exports.ReactWidget = ReactWidget;
