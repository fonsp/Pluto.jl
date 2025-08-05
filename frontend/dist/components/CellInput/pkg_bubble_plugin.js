"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pkgBubblePlugin = exports.NotebookpackagesFacet = exports.pkg_disablers = void 0;
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
const PkgStatusMark_js_1 = require("../PkgStatusMark.js");
const Preact_js_1 = require("../../imports/Preact.js");
const ReactWidget_js_1 = require("./ReactWidget.js");
const lezer_template_js_1 = require("./lezer_template.js");
/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: import("../Editor.js").NotebookPkgData, pluto_actions: any, notebook_id: string }}
 */
// This list appears multiple times in our codebase. Be sure to match edits everywhere.
exports.pkg_disablers = [
    "Pkg.activate",
    "Pkg.API.activate",
    "Pkg.develop",
    "Pkg.API.develop",
    "Pkg.add",
    "Pkg.API.add",
    "TestEnv.activate",
    // https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
    "quickactivate",
    "@quickactivate",
];
/**
 * @param {object} a
 * @param {EditorState} a.state
 * @param {Number} a.from
 * @param {Number} a.to
 */
function find_import_statements({ state, from, to }) {
    const doc = state.doc;
    const tree = (0, CodemirrorPlutoSetup_js_1.syntaxTree)(state);
    let things_to_return = [];
    let currently_using_or_import = "import";
    let currently_selected_import = false;
    (0, lezer_template_js_1.iterate_with_cursor)({
        tree,
        from,
        to,
        enter: (node) => {
            let go_to_parent_afterwards = null;
            if (node.name === "QuoteExpression" || node.name === "FunctionDefinition")
                return false;
            if (node.name === "import")
                currently_using_or_import = "import";
            if (node.name === "using")
                currently_using_or_import = "using";
            // console.group("exploring", node.name, doc.sliceString(node.from, node.to), node)
            if (node.name === "CallExpression" || node.name === "MacrocallExpression") {
                let callee = node.node.firstChild;
                if (callee) {
                    let callee_name = doc.sliceString(callee.from, callee.to);
                    if (exports.pkg_disablers.includes(callee_name)) {
                        things_to_return.push({
                            type: "package_disabler",
                            name: callee_name,
                            from: node.from,
                            to: node.to,
                        });
                    }
                }
                return false;
            }
            if (node.name === "ImportStatement") {
                currently_selected_import = false;
            }
            if (node.name === "SelectedImport") {
                currently_selected_import = true;
                node.firstChild();
                go_to_parent_afterwards = true;
            }
            if (node.name === "ImportPath") {
                const package_name = doc.sliceString(node.from, node.to).split(".")[0];
                if (package_name === "")
                    return false;
                const item = {
                    type: "package",
                    name: package_name,
                    from: node.from,
                    to: node.to,
                };
                things_to_return.push(item);
                // This is just for show... might delete it later
                if (currently_using_or_import === "using" && !currently_selected_import)
                    things_to_return.push({ ...item, type: "implicit_using" });
            }
            if (go_to_parent_afterwards) {
                node.parent();
                return false;
            }
        },
    });
    return things_to_return;
}
/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg }) {
    let seen_packages = new Set();
    let widgets = view.visibleRanges
        .flatMap(({ from, to }) => {
        let things_to_mark = find_import_statements({
            state: view.state,
            from: from,
            to: to,
        });
        return things_to_mark.map((thing) => {
            if (thing.type === "package") {
                let { name: package_name } = thing;
                if (package_name !== "Base" && package_name !== "Core" && !seen_packages.has(package_name)) {
                    seen_packages.add(package_name);
                    let deco = CodemirrorPlutoSetup_js_1.Decoration.widget({
                        widget: new ReactWidget_js_1.ReactWidget((0, Preact_js_1.html) `
                                <${PkgStatusMark_js_1.PkgStatusMark}
                                    key=${package_name}
                                    package_name=${package_name}
                                    pluto_actions=${pluto_actions}
                                    notebook_id=${notebook_id}
                                    nbpkg=${nbpkg}
                                />
                            `),
                        side: 1,
                    });
                    return deco.range(thing.to);
                }
            }
            else if (thing.type === "package_disabler") {
                let deco = CodemirrorPlutoSetup_js_1.Decoration.widget({
                    widget: new ReactWidget_js_1.ReactWidget((0, Preact_js_1.html) ` <${PkgStatusMark_js_1.PkgActivateMark} package_name=${thing.name} /> `),
                    side: 1,
                });
                return deco.range(thing.to);
            }
            else if (thing.type === "implicit_using") {
                if (thing.name === "HypertextLiteral") {
                    let deco = CodemirrorPlutoSetup_js_1.Decoration.widget({
                        widget: new ReactWidget_js_1.ReactWidget((0, Preact_js_1.html) `<span style=${{ position: "relative" }}>
                                <div
                                    style=${{
                            position: `absolute`,
                            display: `inline`,
                            left: 0,
                            whiteSpace: `nowrap`,
                            opacity: 0.3,
                            pointerEvents: `none`,
                        }}
                                >
                                    : @htl, @htl_str
                                </div>
                            </span>`),
                        side: 1,
                    });
                    return deco.range(thing.to);
                }
            }
        });
    })
        .filter((x) => x != null);
    return CodemirrorPlutoSetup_js_1.Decoration.set(widgets, true);
}
/**
 * @type {Facet<import("../Editor.js").NotebookPkgData?, import("../Editor.js").NotebookPkgData?>}
 */
exports.NotebookpackagesFacet = CodemirrorPlutoSetup_js_1.Facet.define({
    combine: (values) => values[0],
    compare: lodash_js_1.default.isEqual,
});
const pkgBubblePlugin = ({ pluto_actions, notebook_id_ref }) => CodemirrorPlutoSetup_js_1.ViewPlugin.fromClass(class {
    update_decos(view) {
        const ds = pkg_decorations(view, { pluto_actions, notebook_id: notebook_id_ref.current, nbpkg: view.state.facet(exports.NotebookpackagesFacet) });
        this.decorations = ds;
    }
    /**
     * @param {EditorView} view
     */
    constructor(view) {
        this.update_decos(view);
    }
    /**
     * @param {ViewUpdate} update
     */
    update(update) {
        if (update.docChanged ||
            update.viewportChanged ||
            update.state.facet(exports.NotebookpackagesFacet) !== update.startState.facet(exports.NotebookpackagesFacet)) {
            this.update_decos(update.view);
            return;
        }
    }
}, {
    // @ts-ignore
    decorations: (v) => v.decorations,
});
exports.pkgBubblePlugin = pkgBubblePlugin;
