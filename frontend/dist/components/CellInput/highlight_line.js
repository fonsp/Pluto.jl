"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightRangePlugin = exports.highlightLinePlugin = exports.HighlightRangeFacet = exports.HighlightLineFacet = void 0;
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
const highlighted_line = CodemirrorPlutoSetup_js_1.Decoration.line({
    attributes: { class: "cm-highlighted-line" },
});
const highlighted_range = CodemirrorPlutoSetup_js_1.Decoration.mark({
    attributes: { class: "cm-highlighted-range" },
});
/**
 * @param {EditorView} view
 */
function create_line_decorations(view) {
    let line_number = view.state.facet(exports.HighlightLineFacet);
    if (line_number == null || line_number == undefined || line_number < 0 || line_number > view.state.doc.lines) {
        return CodemirrorPlutoSetup_js_1.Decoration.set([]);
    }
    let line = view.state.doc.line(line_number);
    return CodemirrorPlutoSetup_js_1.Decoration.set([highlighted_line.range(line.from, line.from)]);
}
/**
 * @param {EditorView} view
 */
function create_range_decorations(view) {
    let range = view.state.facet(exports.HighlightRangeFacet);
    if (range == null) {
        return CodemirrorPlutoSetup_js_1.Decoration.set([]);
    }
    let { from, to } = range;
    if (from < 0 || from == to) {
        return CodemirrorPlutoSetup_js_1.Decoration.set([]);
    }
    // Check if range is within document bounds
    const docLength = view.state.doc.length;
    if (from > docLength || to > docLength) {
        return CodemirrorPlutoSetup_js_1.Decoration.set([]);
    }
    return CodemirrorPlutoSetup_js_1.Decoration.set([highlighted_range.range(from, to)]);
}
/**
 * @type Facet<number?, number?>
 */
exports.HighlightLineFacet = CodemirrorPlutoSetup_js_1.Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
});
/**
 * @type Facet<{from: number, to: number}?, {from: number, to: number}?>
 */
exports.HighlightRangeFacet = CodemirrorPlutoSetup_js_1.Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
});
const highlightLinePlugin = () => CodemirrorPlutoSetup_js_1.ViewPlugin.fromClass(class {
    updateDecos(view) {
        this.decorations = create_line_decorations(view);
    }
    /**
     * @param {EditorView} view
     */
    constructor(view) {
        this.decorations = CodemirrorPlutoSetup_js_1.Decoration.set([]);
        this.updateDecos(view);
    }
    /**
     * @param {ViewUpdate} update
     */
    update(update) {
        if (update.docChanged || update.state.facet(exports.HighlightLineFacet) !== update.startState.facet(exports.HighlightLineFacet)) {
            this.updateDecos(update.view);
        }
    }
}, {
    decorations: (v) => v.decorations,
});
exports.highlightLinePlugin = highlightLinePlugin;
const highlightRangePlugin = () => CodemirrorPlutoSetup_js_1.ViewPlugin.fromClass(class {
    updateDecos(view) {
        this.decorations = create_range_decorations(view);
    }
    /**
     * @param {EditorView} view
     */
    constructor(view) {
        this.decorations = CodemirrorPlutoSetup_js_1.Decoration.set([]);
        this.updateDecos(view);
    }
    /**
     * @param {ViewUpdate} update
     */
    update(update) {
        if (update.docChanged || update.state.facet(exports.HighlightRangeFacet) !== update.startState.facet(exports.HighlightRangeFacet)) {
            this.updateDecos(update.view);
        }
    }
}, {
    decorations: (v) => v.decorations,
});
exports.highlightRangePlugin = highlightRangePlugin;
