"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awesome_line_wrapping = exports.get_start_tabs = void 0;
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
const ReactWidget_js_1 = require("./ReactWidget.js");
const Preact_js_1 = require("../../imports/Preact.js");
const ARBITRARY_INDENT_LINE_WRAP_LIMIT = 12;
const get_start_tabs = (line) => /^\t*/.exec(line)?.[0] ?? "";
exports.get_start_tabs = get_start_tabs;
const get_decorations = (/** @type {import("../../imports/CodemirrorPlutoSetup.js").EditorState} */ state) => {
    let decorations = [];
    // TODO? Don't create new decorations when a line hasn't changed?
    for (let i of lodash_js_1.default.range(0, state.doc.lines)) {
        let line = state.doc.line(i + 1);
        const num_tabs = (0, exports.get_start_tabs)(line.text).length;
        if (num_tabs === 0)
            continue;
        const how_much_to_indent = Math.min(num_tabs, ARBITRARY_INDENT_LINE_WRAP_LIMIT);
        const offset = how_much_to_indent * state.tabSize;
        const linerwapper = CodemirrorPlutoSetup_js_1.Decoration.line({
            attributes: {
                style: `--indented: ${offset}ch;`,
                class: "awesome-wrapping-plugin-the-line",
            },
        });
        // Need to push before the tabs one else codemirror gets madddd
        decorations.push(linerwapper.range(line.from, line.from));
        if (how_much_to_indent > 0) {
            decorations.push(CodemirrorPlutoSetup_js_1.Decoration.mark({
                class: "awesome-wrapping-plugin-the-tabs",
            }).range(line.from, line.from + how_much_to_indent));
        }
        if (num_tabs > how_much_to_indent) {
            for (let i of lodash_js_1.default.range(how_much_to_indent, num_tabs)) {
                decorations.push(CodemirrorPlutoSetup_js_1.Decoration.replace({
                    widget: new ReactWidget_js_1.ReactWidget((0, Preact_js_1.html) `<span style=${{ opacity: 0.2 }}>⇥ </span>`),
                    block: false,
                }).range(line.from + i, line.from + i + 1));
            }
        }
    }
    return CodemirrorPlutoSetup_js_1.Decoration.set(decorations);
};
/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
exports.awesome_line_wrapping = CodemirrorPlutoSetup_js_1.StateField.define({
    create(state) {
        return get_decorations(state);
    },
    update(deco, tr) {
        if (!tr.docChanged)
            return deco;
        return get_decorations(tr.state);
    },
    provide: (f) => CodemirrorPlutoSetup_js_1.EditorView.decorations.from(f),
});
