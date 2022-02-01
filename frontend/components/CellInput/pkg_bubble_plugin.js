import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { PkgStatusMark, PkgActivateMark } from "../PkgStatusMark.js"
import { html } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"
import { create_specific_template_maker, iterate_with_cursor, jl, jl_dynamic, narrow, t, template } from "./lezer_template.js"

/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: import("../Editor.js").NotebookPkgData, pluto_actions: any, notebook_id: string }}
 */

// This list appears multiple times in our codebase. Be sure to match edits everywhere.
export const pkg_disablers = [
    "Pkg.activate",
    "Pkg.API.activate",
    "Pkg.develop",
    "Pkg.API.develop",
    "Pkg.add",
    "Pkg.API.add",
    // https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
    "quickactivate",
    "@quickactivate",
]

function find_import_statements({ doc, tree, from, to }) {
    // This quotelevel stuff is waaaay overengineered and precise...
    // but I love making stuff like this SO LET ME OKAY
    let quotelevel = 0
    let things_to_return = []

    iterate_with_cursor({
        tree,
        from,
        to,
        enter: (cursor) => {
            // `quote ... end` or `:(...)`
            if (cursor.name === "QuoteExpression" || cursor.name === "QuoteStatement") {
                quotelevel++
            }
            // `$(...)` when inside quote
            if (cursor.name === "InterpolationExpression") {
                quotelevel--
            }
            if (quotelevel !== 0) return

            // Check for Pkg.activate() and friends
            if (cursor.name === "CallExpression" || cursor.name === "MacroExpression") {
                let node = cursor.node
                let callee = node.firstChild
                let callee_name = doc.sliceString(callee.from, callee.to)

                if (pkg_disablers.includes(callee_name)) {
                    things_to_return.push({
                        type: "package_disabler",
                        name: callee_name,
                        from: cursor.to,
                        to: cursor.to,
                    })
                }

                return
            }

            let import_specifier_template = create_specific_template_maker((x) => jl_dynamic`import A, ${x}`)
            // Because the templates can't really do recursive stuff, we need JavaScript™️!
            let unwrap_scoped_import = (specifier) => {
                let match = null
                if ((match = import_specifier_template(jl`${t.as("package")}.${t.any}`).match(specifier))) {
                    return unwrap_scoped_import(match.package)
                } else if ((match = import_specifier_template(jl`.${t.maybe(t.any)}`).match(specifier))) {
                    // Still trash!
                    return null
                } else if ((match = import_specifier_template(jl`${t.Identifier}`).match(specifier))) {
                    return specifier
                } else {
                    console.warn("Unknown nested import specifier: " + specifier.toString())
                }
            }

            let match = null
            if (
                // These templates might look funky... and they are!
                // But they are necessary to force the matching to match as specific as possible.
                // With just `import ${t.many("specifiers")}` it will match `import A, B, C`, but
                //    it will do so by giving back [`A, B, C`] as one big specifier!
                (match = template(jl`import ${t.as("specifier")}: ${t.many()}`).match(cursor)) ??
                (match = template(jl`import ${t.as("specifier")}, ${t.many("specifiers")}`).match(cursor)) ??
                (match = template(jl`using ${t.as("specifier")}: ${t.many()}`).match(cursor)) ??
                (match = template(jl`using ${t.as("specifier")}, ${t.many("specifiers")}`).match(cursor))
            ) {
                let { specifier, specifiers = [] } = match

                if (specifier) {
                    specifiers = [{ node: specifier }, ...specifiers]
                }

                for (let { node: specifier } of specifiers) {
                    specifier = narrow(specifier)

                    let match = null
                    if ((match = import_specifier_template(jl`${t.as("package")} as ${t.maybe(t.any)}`).match(specifier))) {
                        let node = unwrap_scoped_import(match.package)
                        if (node) {
                            things_to_return.push({
                                type: "package",
                                name: doc.sliceString(node.from, node.to),
                                from: node.to,
                                to: node.to,
                            })
                        }
                    } else if ((match = import_specifier_template(jl`${t.as("package")}.${t.any}`).match(specifier))) {
                        let node = unwrap_scoped_import(match.package)
                        if (node) {
                            things_to_return.push({
                                type: "package",
                                name: doc.sliceString(node.from, node.to),
                                from: node.to,
                                to: node.to,
                            })
                        }
                    } else if ((match = import_specifier_template(jl`.${t.as("scoped")}`).match(specifier))) {
                        // Trash!
                    } else if ((match = import_specifier_template(jl`${t.as("package")}`).match(specifier))) {
                        let node = unwrap_scoped_import(match.package)
                        if (node) {
                            things_to_return.push({
                                type: "package",
                                name: doc.sliceString(node.from, node.to),
                                from: node.to,
                                to: node.to,
                            })
                        }
                    } else {
                        console.warn("Unknown import specifier: " + specifier.toString())
                    }
                }

                match = null
                if ((match = template(jl`using ${t.as("specifier")}, ${t.many("specifiers")}`).match(cursor))) {
                    let { specifier } = match
                    if (specifier) {
                        if (doc.sliceString(specifier.to, specifier.to + 1) === "\n" || doc.sliceString(specifier.to, specifier.to + 1) === "") {
                            things_to_return.push({
                                type: "implicit_using",
                                name: doc.sliceString(specifier.from, specifier.to),
                                from: specifier.to,
                                to: specifier.to,
                            })
                        }
                    }
                }

                return false
            } else if (cursor.name === "ImportStatement") {
                throw new Error("What")
            }
        },
        leave: (cursor) => {
            if (cursor.name === "QuoteExpression" || cursor.name === "QuoteStatement") {
                quotelevel--
            }
            if (cursor.name === "InterpolationExpression") {
                quotelevel++
            }
        },
    })

    return things_to_return
}

/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg }) {
    let seen_packages = new Set()

    let widgets = view.visibleRanges
        .flatMap(({ from, to }) => {
            let things_to_mark = find_import_statements({
                doc: view.state.doc,
                tree: syntaxTree(view.state),
                from: from,
                to: to,
            })

            return things_to_mark.map((thing) => {
                if (thing.type === "package") {
                    let { name: package_name } = thing
                    if (package_name !== "Base" && package_name !== "Core" && !seen_packages.has(package_name)) {
                        seen_packages.add(package_name)

                        let deco = Decoration.widget({
                            widget: new ReactWidget(html`
                                <${PkgStatusMark}
                                    key=${package_name}
                                    package_name=${package_name}
                                    pluto_actions=${pluto_actions}
                                    notebook_id=${notebook_id}
                                    nbpkg=${nbpkg}
                                />
                            `),
                            side: 1,
                        })
                        return deco.range(thing.to)
                    }
                } else if (thing.type === "package_disabler") {
                    let deco = Decoration.widget({
                        widget: new ReactWidget(html` <${PkgActivateMark} package_name=${thing.name} /> `),
                        side: 1,
                    })
                    return deco.range(thing.to)
                } else if (thing.type === "implicit_using") {
                    if (thing.name === "HypertextLiteral") {
                        let deco = Decoration.widget({
                            widget: new ReactWidget(html`<span style=${{ position: "relative" }}>
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
                        })
                        return deco.range(thing.to)
                    }
                }
            })
        })
        .filter((x) => x != null)
    return Decoration.set(widgets, true)
}

/**
 * @type {Facet<import("../Editor.js").NotebookPkgData?>}
 */
export const NotebookpackagesFacet = Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
})

export const pkgBubblePlugin = ({ pluto_actions, notebook_id }) =>
    ViewPlugin.fromClass(
        class {
            update_decos(view) {
                const ds = pkg_decorations(view, { pluto_actions, notebook_id, nbpkg: view.state.facet(NotebookpackagesFacet) })
                this.decorations = ds
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.update_decos(view)
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.state.facet(NotebookpackagesFacet) !== update.startState.facet(NotebookpackagesFacet)
                ) {
                    this.update_decos(update.view)
                    return
                }
            }
        },
        {
            decorations: (v) => v.decorations,

            eventHandlers: {
                pointerdown: (e, view) => {
                    let target = e.target
                },
            },
        }
    )
