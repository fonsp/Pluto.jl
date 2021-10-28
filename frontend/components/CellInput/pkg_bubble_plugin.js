import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { PkgStatusMark, PkgActivateMark } from "../PkgStatusMark.js"
import { html } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"

/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: any, pluto_actions: any, notebook_id: string }}
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

/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg }) {
    let widgets = []
    let seen_packages = new Set()

    const add_widget = (package_name, target) => {
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
            widgets.push(deco.range(target))
        }
    }

    for (let { from, to } of view.visibleRanges) {
        let in_import = false
        let in_selected_import = false
        let is_inside_quote = false

        let is_inside_rename_import = false
        let is_renamed_package_bubbled = false

        let is_inside_scoped_identifier = false

        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type, from, to, getNode) => {
                // `quote ... end` or `:(...)`
                if (type.name === "QuoteExpression" || type.name === "QuoteStatement") {
                    is_inside_quote = true
                }
                // `$(...)` when inside quote
                if (type.name === "InterpolationExpression") {
                    is_inside_quote = false
                }
                if (is_inside_quote) return

                // Check for Pkg.activate() and friends
                if (type.name === "CallExpression" || type.name === "MacroExpression") {
                    let node = getNode()
                    let callee = node.firstChild
                    let callee_name = view.state.sliceDoc(callee.from, callee.to)

                    if (pkg_disablers.includes(callee_name)) {
                        let deco = Decoration.widget({
                            widget: new ReactWidget(html` <${PkgActivateMark} package_name=${callee_name} /> `),
                            side: 1,
                        })
                        widgets.push(deco.range(to))
                    }
                }

                if (type.name === "ImportStatement") {
                    in_import = true
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = true
                }
                if (type.name === "RenamedIdentifier") {
                    is_inside_rename_import = true
                }
                // Don't show a buble next to the name `B` in `import A as B`
                if (is_inside_rename_import && is_renamed_package_bubbled) {
                    return
                }

                // `import .X` or `import ..X` or `import Flux.Zygote`
                // handled when leaving the ScopedIdentifier
                if (in_import && type.name === "ScopedIdentifier") {
                    is_inside_scoped_identifier = true

                    if (is_inside_rename_import && !is_renamed_package_bubbled) {
                        is_renamed_package_bubbled = true
                    }

                    return
                }

                if (in_import && type.name === "Identifier" && !is_inside_scoped_identifier) {
                    if (is_inside_rename_import && !is_renamed_package_bubbled) {
                        is_renamed_package_bubbled = true
                    }

                    let package_name = view.state.doc.sliceString(from, to)
                    // console.warn(type)
                    // console.warn("Found", package_name)
                    add_widget(package_name, to)

                    if (in_selected_import) {
                        in_import = false
                    }
                }
            },
            leave: (type, from, to, getNode) => {
                if (type.name === "QuoteExpression" || type.name === "QuoteStatement") {
                    is_inside_quote = false
                }
                if (type.name === "InterpolationExpression") {
                    is_inside_quote = true
                }
                if (type.name === "RenamedIdentifier") {
                    is_inside_rename_import = false
                    is_renamed_package_bubbled = false
                }
                if (is_inside_quote) return

                // console.log("Leave", type.name)
                if (type.name === "ImportStatement") {
                    in_import = false
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = false
                }
                if (type.name === "ScopedIdentifier" && !in_selected_import) {
                    let node = getNode()
                    if (node.parent.name === "Import") {
                        is_inside_scoped_identifier = false
                        let package_name = view.state.doc.sliceString(from, to)

                        if (package_name.startsWith(".")) {
                            return
                        }

                        package_name = package_name.split(".")[0]
                        add_widget(package_name, to)
                    }
                }
            },
        })
    }
    return Decoration.set(widgets)
}

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
