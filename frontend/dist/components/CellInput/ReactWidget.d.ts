/**
 * Use this Widget to render (P)react components as codemirror widgets.
 */
export class ReactWidget extends WidgetType {
    /** @param {import("../../imports/Preact.js").ReactElement} element */
    constructor(element: import("../../imports/Preact.js").ReactElement);
    element: import("../../imports/Preact.js").ReactElement;
    eq(other: any): boolean;
    toDOM(): HTMLSpanElement;
    updateDOM(dom: any): boolean;
}
import { WidgetType } from "../../imports/CodemirrorPlutoSetup.js";
