import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, WidgetType, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { nbpkg_fingerprint, PkgStatusMark, PkgActivateMark, pkg_disablers } from "../PkgStatusMark.js"

/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: any, pluto_actions: any, notebook_id: string }}
 */

class PkgStatusMarkWidget extends WidgetType {
    /**
     * @param {string} package_name
     * @param {PkgstatusmarkWidgetProps} props
     */
    constructor(package_name, props) {
        super()
        this.package_name = package_name
        this.props = props
        this.on_nbpkg = console.error
    }

    eq(other) {
        return other.package_name == this.package_name
    }

    toDOM() {
        const b = PkgStatusMark({
            pluto_actions: this.props.pluto_actions,
            package_name: this.package_name,
            // refresh_cm: () => cm.refresh(),
            refresh_cm: () => {},
            notebook_id: this.props.notebook_id,
        })

        console.log(`this.props.nbpkg:`, this.props.nbpkg)
        b.on_nbpkg(this.props.nbpkg)
        this.on_nbpkg = b.on_nbpkg

        return b
    }

    ignoreEvent() {
        return false
    }
}

/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg }) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        let in_import = false
        let in_selected_import = false
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type, from, to) => {
                // console.log("Enter", type.name)
                if (type.name === "ImportStatement") {
                    in_import = true
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = true
                }
                if (in_import && type.name === "Identifier") {
                    let package_name = view.state.doc.sliceString(from, to)
                    // console.warn(type)
                    // console.warn("Found", package_name)
                    if (package_name !== "Base" && package_name !== "Core") {
                        let deco = Decoration.widget({
                            widget: new PkgStatusMarkWidget(package_name, { pluto_actions, notebook_id, nbpkg }),
                            side: 1,
                        })
                        widgets.push(deco.range(to))
                    }

                    if (in_selected_import) {
                        in_import = false
                    }
                }
            },
            leave: (type, from, to) => {
                // console.log("Leave", type.name)
                if (type.name === "ImportStatement") {
                    in_import = false
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = false
                }
            },
        })
    }
    return Decoration.set(widgets)
}

// https://codemirror.net/6/docs/ref/#rangeset.RangeCursor
export const collect_RangeCursor = (rc) => {
    let output = []
    while (rc.value != null) {
        output.push(rc.value)
        rc.next()
    }
    return output
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
                if (update.docChanged || update.viewportChanged) {
                    this.update_decos(update.view)
                    return
                }

                if (update.state.facet(NotebookpackagesFacet) !== update.startState.facet(NotebookpackagesFacet)) {
                    let nbpkg = update.state.facet(NotebookpackagesFacet)
                    collect_RangeCursor(this.decorations.iter()).forEach((pd) => {
                        pd.widget.on_nbpkg(nbpkg)
                    })
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
