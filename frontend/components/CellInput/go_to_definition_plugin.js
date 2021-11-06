import { syntaxTree, Facet, ViewPlugin, Decoration } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"

let node_is_variable_usage = (node) => {
    let parent = node.parent

    if (parent == null) return false
    if (parent.name === "VariableDeclarator") return false
    if (parent.name === "Symbol") return false

    // If we are the first child of a FieldExpression, we are the usage
    if (parent.name === "FieldExpression" || parent.name === "MacroFieldExpression") {
        let firstchild = parent.firstChild
        if (node.from === firstchild?.from && node.to === firstchild?.to) {
            return true
        } else {
            return false
        }
    }

    // Ignore left side of an assigment
    // TODO Tuple assignment
    if (parent.name === "AssignmentExpression") {
        let firstchild = parent?.firstChild
        if (node.from === firstchild?.from && node.to === firstchild?.to) {
            return false
        }
    }

    // If we are the name of a macro of function definition, we are not usage
    if (parent.name === "MacroDefinition" || parent.name === "FunctionDefinition") {
        let function_name = parent?.firstChild?.nextSibling
        if (node.from === function_name?.from && node.to === function_name?.to) {
            return false
        }
    }

    if (parent.name === "ArgumentList") {
        if (parent.parent.name === "MacroDefinition" || parent.parent.name === "FunctionDefinition") {
            return false
        }
    }

    if (parent.name === "TypedExpression") return node_is_variable_usage(parent)
    if (parent.name === "NamedField") return node_is_variable_usage(parent)
    if (parent.name === "BareTupleExpression") return node_is_variable_usage(parent)
    if (parent.name === "MacroIdentifier") return node_is_variable_usage(parent)

    return true
}

let get_variable_marks = (state, { used_variables }) => {
    let tree = syntaxTree(state)
    let variable_nodes = new Set()
    tree.iterate({
        enter: (type, from, to, getNode) => {
            if (type.name === "Identifier") {
                let node = getNode()

                if (node_is_variable_usage(node)) {
                    variable_nodes.add(node)
                }
            }
        },
    })

    let variables_with_origin_cell = Object.entries(used_variables || {})
        .filter(([name, usage]) => usage.length > 0)
        .map(([name, usage]) => name)

    return Decoration.set(
        Array.from(variable_nodes)
            .map((variable_node) => {
                let text = state.doc.sliceString(variable_node.from, variable_node.to)

                if (variables_with_origin_cell.includes(text)) {
                    return Decoration.mark({
                        tagName: "a",
                        attributes: {
                            "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                            "data-pluto-variable": text,
                            "href": `#${text}`,
                        },
                    }).range(variable_node.from, variable_node.to)
                } else {
                    return null
                }
            })
            .filter((x) => x != null)
    )
}

export const UsedVariablesFacet = Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
})

export const go_to_definition_plugin = ViewPlugin.fromClass(
    class {
        constructor(view) {
            let used_variables = view.state.facet(UsedVariablesFacet)
            this.decorations = get_variable_marks(view.state, { used_variables })
            this.used_variables = view.state.facet(UsedVariablesFacet)
        }

        update(update) {
            // My best take on getting this to update when UsedVariablesFacet does 🤷‍♀️
            let used_variables = update.state.facet(UsedVariablesFacet)
            if (update.docChanged || update.viewportChanged || used_variables !== this.used_variables)
                this.decorations = get_variable_marks(update.state, { used_variables })
            this.used_variables = used_variables
        }
    },
    {
        decorations: (v) => v.decorations,

        eventHandlers: {
            pointerdown: (event, view) => {
                if (has_ctrl_or_cmd_pressed(event) && event.which === 1 && event.target instanceof Element) {
                    let pluto_variable = event.target.closest("[data-pluto-variable]")
                    if (!pluto_variable) return

                    let variable = pluto_variable.getAttribute("data-pluto-variable")

                    event.preventDefault()
                    let scrollto_selector = `[id='${encodeURI(variable)}']`
                    document.querySelector(scrollto_selector).scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    })

                    // TODO Something fancy where it counts going to definition as a page in history,
                    // .... so pressing/swiping back will go back to where you clicked on the definition.
                    // window.history.replaceState({ scrollTop: document.documentElement.scrollTop }, null)
                    // window.history.pushState({ scrollTo: scrollto_selector }, null)

                    let used_variables = view.state.facet(UsedVariablesFacet)

                    // TODO Something fancy where we actually emit the identifier we are looking for,
                    // .... and the cell then selects exactly that definition (using lezer and cool stuff)
                    if (used_variables[variable].length > 0) {
                        window.dispatchEvent(
                            new CustomEvent("cell_focus", {
                                detail: {
                                    cell_id: used_variables[variable][0],
                                    line: 0, // 1-based to 0-based index
                                },
                            })
                        )
                    }
                }
            },
        },
    }
)
