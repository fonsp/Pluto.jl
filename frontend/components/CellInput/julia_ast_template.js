import { julia_andrey, Text } from "../../imports/CodemirrorPlutoSetup.js"
import lodash from "../../imports/lodash.js"

let VERBOSE = false

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 *
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

let NEEDLE_PREFIX = "NEEDLE_"

/** @param {TreeCursor} cursor */
export let children = function* (cursor) {
    if (cursor.firstChild()) {
        try {
            do {
                yield cursor
            } while (cursor.nextSibling())
        } finally {
            cursor.parent()
        }
    }
}

/** @param {SyntaxNode} node */
export let child_nodes = function* (node) {
    if (node.firstChild) {
        let child = node.firstChild
        do {
            yield child
        } while ((child = child.nextSibling))
    }
}

export let all_children = function* (cursor) {
    for (let child of children(cursor)) {
        yield child
        yield* all_children(child)
    }
}

/**
 * @typedef AstTemplate
 * @type {{
 *  name?: string,
 *  from?: number,
 *  to?: number,
 *  node: SyntaxNode,
 *  children: Array<AstTemplate>,
 * } | {
 *  pattern: (haystack: (TreeCursor | void), template: AstTemplate, matches: { [key: string]: any }) => boolean,
 * }}
 */

/**
 * @param {TreeCursor | void} haystack_cursor
 * @param {AstTemplate} template
 * @param matches
 */
export let match_template = (haystack_cursor, template, matches) => {
    let previous_node = null
    if (VERBOSE) {
        console.group("Group")
        console.log(`template:`, template)
        if (haystack_cursor) {
            console.log(`cursor.node:`, haystack_cursor.node.name, haystack_cursor.node.from, haystack_cursor.node.to)
            previous_node = haystack_cursor.node
        }
    }

    try {
        if ("pattern" in template) {
            let pattern = template.pattern
            VERBOSE && console.log(`pattern:`, pattern)
            if (typeof pattern !== "function") {
                console.log(`pattern:`, pattern)
                throw new Error("Unknown pattern")
            }
            VERBOSE && console.log(`matches:`, matches)

            return pattern(haystack_cursor, template, matches)
        } else if ("node" in template) {
            let { node, children } = template

            if (haystack_cursor && haystack_cursor.name === "⚠") {
                // Not sure about this yet but ehhhh
                VERBOSE && console.log(`✅ because ⚠`)
                return true
            }

            if (!haystack_cursor || haystack_cursor.name !== node.name) {
                // This makes it so `import $x` will match `import x: y`,
                //   where `import $x` yields `Import(ImportIdentifier(Identifier))` but
                //   `import x: y` yields `Import(ScopedIdentifier(Identifier, Identifier))`
                //   So if we match on the `Identifier` in the first template, we will never match
                //   as `ScopedIdentifier` !== `ImportIdentifier`.
                //   So I need to teach the template to "jump down" when it finds a node that is exactly
                //   as big as it's only child. This means there is no syntax at all,
                //   thus no way for us to signify the difference between those nodes.
                VERBOSE && console.log(`❌ because no cursor or name mismatch`)
                return false
            }

            if (haystack_cursor.firstChild()) {
                try {
                    let is_last_from_haystack = false
                    for (let template_child of template.children) {
                        if (is_last_from_haystack) {
                            VERBOSE && console.log(`❌ because no cursor or name mismatch`)
                            return false
                        }

                        let child_does_match = match_template(haystack_cursor, template_child, matches)

                        if (!child_does_match) {
                            VERBOSE && console.log(`❌ because a child mismatch`, template_child, haystack_cursor.toString())
                            return false
                        }

                        // This is where we actually move the haystack_cursor (in sync with the `template.children`)
                        // to give the nested match templates more freedom in move the cursor around between siblings.
                        is_last_from_haystack = !haystack_cursor.nextSibling()
                    }
                    VERBOSE && console.log(`✅ because all children match`)
                    return true
                } finally {
                    haystack_cursor.parent()
                }
            } else {
                for (let child of template.children) {
                    if (!match_template(null, child, matches)) {
                        VERBOSE && console.log(`❌ because a mismatch with null child`, child)
                        return false
                    }
                }
                VERBOSE && console.log(`✅ because empty children are fine`)
                return true
            }
        } else {
            throw new Error("waaaah")
        }
    } finally {
        if (VERBOSE) {
            if (haystack_cursor) {
                console.log(`Cursor at end:`, haystack_cursor.node.name, haystack_cursor.node.from, haystack_cursor.node.to)
                // prettier-ignore
                console.log(`isEqual:`, previous_node.from === haystack_cursor.from && previous_node.to === haystack_cursor.to && previous_node.name === haystack_cursor.name)
            }
            console.groupEnd()
        }
    }
}

let julia_template_cache = new WeakMap()
let julia_code_object_cache = new WeakMap()

export class JuliaCodeObject {
    /**
     * @param {TemplateStringsArray} template
     * @param {any[]} subtitutions
     * */
    constructor(template, subtitutions) {
        this.template = template
        this.subtitutions = subtitutions
    }
}

/**
 * @param {SyntaxNode} ast
 * @param {any} code
 * @param {Array<{ code: any, generator: any }>} substitutions
 * @returns {AstTemplate}
 */
let substitutions_to_template = (ast, code, substitutions) => {
    for (let substitution of substitutions) {
        if (code.slice(ast.from, ast.to) === substitution.code) {
            return substitution.generator.next(ast).value
        }
    }

    return {
        node: ast,
        children: Array.from(child_nodes(ast)).map((node) => substitutions_to_template(node, code, substitutions)),
        name: ast.name,
        from: ast.from,
        to: ast.to,
    }
}

/**
 * @typedef GeneratorTemplate
 * @type {{ generator: (id_counter: IdCounter) => Generator<unknown, string, any> }}
 */

/**
 * @param {JuliaCodeObject | GeneratorTemplate | (() => void)} julia_code_object
 * @param {IdCounter} id_counter
 */
export let to_template = function* (julia_code_object, id_counter) {
    if (julia_code_object instanceof JuliaCodeObject) {
        let julia_code_to_parse = ""

        let subsitions = []
        for (let [string_part, substitution] of lodash.zip(julia_code_object.template, julia_code_object.subtitutions)) {
            julia_code_to_parse += string_part

            if (substitution) {
                let substitution_generator = to_template(substitution, id_counter)
                let substitution_code = substitution_generator.next().value

                subsitions.push({
                    code: substitution_code,
                    generator: substitution_generator,
                })
                julia_code_to_parse += substitution_code
            }
        }
        let template_node = yield julia_code_to_parse

        // TODO Throw if not all substitutions are used
        return substitutions_to_template(template_node, julia_code_to_parse, subsitions)
    } else if ("generator" in julia_code_object) {
        return yield* julia_code_object.generator(id_counter)
        // let generator = julia_code_object.generator(id_counter)
        // let ast = yield generator.next().value
        // let template_node = generator.next(ast).value
        // return template_node
    } else if (typeof julia_code_object === "function") {
        let id = NEEDLE_PREFIX + id_counter.nextIndex()

        let template_node = yield id
        return { pattern: julia_code_object }
    } else {
        console.log(`julia_code_object:`, julia_code_object)
        throw new Error("Unknown substition type")
    }
}

/**
 * @param {TemplateStringsArray} template
 * @param {any[]} subtitutions
 * */
export let jl = (template, ...subtitutions) => {
    // if (julia_code_object_cache.has(template)) {
    //     return julia_code_object_cache.get(template)
    // }
    let julia_code_object = new JuliaCodeObject(template, subtitutions)
    // julia_code_object_cache.set(template, julia_code_object)
    return julia_code_object
}

export class IdCounter {
    constructor() {
        this.index = 1
    }
    nextIndex() {
        return this.index++
    }
}

/** @param {JuliaCodeObject} julia_code_object */
export let template = (julia_code_object) => {
    // if (julia_template_cache.has(julia_code_object)) {
    //     return julia_template_cache.get(julia_code_object)
    // }

    let id_counter = new IdCounter()

    let template_generator = to_template(julia_code_object, id_counter)
    let julia_to_parse = template_generator.next().value

    let template_doc = Text.of([julia_to_parse])
    let template_ast = julia_andrey().language.parser.parse(julia_to_parse).topNode.firstChild

    let the_actual_template = template_generator.next(template_ast).value

    let result = {
        /** @param {TreeCursor | SyntaxNode} haystack_cursor */
        match(haystack_cursor) {
            if ("cursor" in haystack_cursor) {
                haystack_cursor = haystack_cursor.cursor
            }

            if (haystack_cursor.name === "⚠") {
                return null
            }

            let matches = {}
            return match_template(haystack_cursor, the_actual_template, matches) ? matches : null
        },
    }

    julia_template_cache.set(julia_code_object, result)
    return result
}

/** @type {(...args: Parameters<typeof jl>) => ReturnType<typeof template>} */
export let julia_ast = (...args) => {
    return template(jl(...args))

    // if (julia_ast_cache.has(template)) {
    //     return julia_ast_cache.get(template)
    // }

    // let index = 0

    // let bound = {}
    // let julia_to_parse = ""

    // for (let [string_part, substition] of lodash.zip(template, subtitions)) {
    //     julia_to_parse += string_part
    //     if (substition !== undefined) {
    //         let id = needle_prefix + index++
    //         bound[id] = substition
    //         julia_to_parse += id
    //     }
    // }

    // let template_doc = Text.of([julia_to_parse])
    // let template_ast = julia_andrey().language.parser.parse(julia_to_parse).topNode.firstChild

    // let result = {
    //     bound,
    //     ast: template_ast,
    //     doc: template_doc,
    //     /** @param {TreeCursor | SyntaxNode} haystack_cursor */
    //     match(haystack_cursor) {
    //         if ("cursor" in haystack_cursor) {
    //             haystack_cursor = haystack_cursor.cursor
    //         }

    //         let template_cursor = template_ast.cursor

    //         if (haystack_cursor.name === "⚠") {
    //             return null
    //         }

    //         let matches = {}
    //         return match_template(haystack_cursor, template_cursor, template_doc, bound, matches) ? matches : null
    //     },
    // }

    // // @ts-ignore
    // julia_ast_cache.set(template, result)
    // return result
}

/** @param {String} node_type */
let type_match_constructor = (node_type) => (name) => (cursor, template_cursor, matches, verbose) => {
    if (cursor != null && cursor.name === node_type) {
        matches[name] = cursor.node
        return true
    } else {
        return false
    }
}

export let t = {
    Expression: (name) =>
        function Expression(cursor, template_cursor, matches, verbose = false) {
            if (cursor == null) {
                verbose && console.log("cursor null")
                return false
            }
            // So we don't match keywords
            if (cursor.name[0] === cursor.name[0].toLowerCase()) {
                verbose && console.log("keyword")
                return false
            }

            if (name != null) {
                matches[name] = cursor.node
            }
            return true
        },
    any: (name) => t.Expression(name),
    multiple: (name, of_what) => {
        return function multiple(cursor, template_cursor, matches, verbose = false) {
            if (cursor == null) {
                return true
            }

            let matches_nodes = []
            while (true) {
                let local_match = {}
                let result = of_what(cursor, local_match)
                if (typeof result !== "boolean") {
                    throw new Error("AST tester function returned non-boolean")
                }
                if (!result) {
                    break
                }
                matches_nodes.push({ node: cursor.node, match: local_match })
                if (!cursor.nextSibling()) {
                    break
                }
            }
            if (name != null) {
                matches[name] = matches_nodes
            }
            cursor.prevSibling()
            return true
        }
    },
    many: (name, of_what) => {
        return {
            /**
             * @param {JuliaCodeObject} julia_code_object
             * @param {IdCounter} id_counter
             */
            generator: function* many(id_counter) {
                let sub_template_generator = to_template(of_what, id_counter)
                let ast = yield sub_template_generator.next().value
                let sub_template = sub_template_generator.next(ast).value

                return function many(cursor, template_cursor, matches, verbose = false) {
                    if (cursor == null) {
                        return true
                    }

                    let matches_nodes = []
                    while (true) {
                        let local_match = {}
                        let result = match_template(cursor, sub_template, local_match)
                        if (typeof result !== "boolean") {
                            throw new Error("AST tester function returned non-boolean")
                        }
                        if (!result) {
                            break
                        }
                        matches_nodes.push({ node: cursor.node, match: local_match })
                        if (!cursor.nextSibling()) {
                            break
                        }
                    }
                    if (name != null) {
                        matches[name] = matches_nodes
                    }
                    cursor.prevSibling()
                    return true
                }
            },
        }
    },

    maybe: (what) => {
        return {
            /**
             * @param {JuliaCodeObject} julia_code_object
             * @param {IdCounter} id_counter
             */
            generator: function* maybe(id_counter) {
                return function maybe(cursor, template_cursor, matches, verbose = false) {
                    if (cursor == null) {
                        return true
                    }

                    if (cursor.name === "⚠") {
                        return true
                    }

                    let did_match = what(cursor, matches)

                    if (did_match === false) {
                        cursor.prevSibling()
                    }
                    return true
                }
            },
        }
    },

    Identifier: type_match_constructor("Identifier"),
}
