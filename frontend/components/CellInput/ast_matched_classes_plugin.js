import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { PkgStatusMark, PkgActivateMark } from "../PkgStatusMark.js"
import { html } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"

export const ast_matched_classes_plugin = ({ toggleClass }) =>
    ViewPlugin.fromClass(
        class {
            run(view) {
                let simple_enough = true
                syntaxTree(view.state).iterate({
                    enter: (type, from, to, getNode) => {
                        switch (type.name) {
                            case "AssignmentExpression":
                            case "SourceFile":
                            case "Identifier":
                            case "String":
                            case "Number":
                                break
                            default:
                                if (simple_enough) {
                                    console.error(type.name)
                                }
                                simple_enough = false
                        }
                    },
                    // leave: (type, from, to) => {
                    //     if (type.name === "QuoteExpression" || type.name === "QuoteStatement") {
                    //         is_inside_quote = false
                    //     }
                    //     if (type.name === "InterpolationExpression") {
                    //         is_inside_quote = true
                    //     }
                    //     if (is_inside_quote) return

                    //     // console.log("Leave", type.name)
                    //     if (type.name === "ImportStatement") {
                    //         in_import = false
                    //     }
                    //     if (type.name === "SelectedImport") {
                    //         in_selected_import = false
                    //     }
                    // },
                })
                toggleClass("simple_expression", simple_enough)
            }

            constructor(view) {
                this.run(view)
            }

            update(update) {
                if (update.docChanged) {
                    this.run(update.view)
                }
            }
        },
        {}
    )
