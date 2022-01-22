import { julia_andrey, Text } from "../../imports/CodemirrorPlutoSetup.js"
import lodash from "../../imports/lodash.js"

import ManyKeysWeakmap from "https://esm.sh/many-keys-weakmap@1.0.0"

export let julia_parser = julia_andrey().language.parser

let TEMPLATE_CREATION_VERBOSE = false

/**
 * @template {(...args: any) => any} T
 * @param {T} fn
 * @param {(...x: Parameters<T>) => Array<any>} cachekey_resolver
 * @returns {T}
 */
let memo = (fn, cachekey_resolver = (x) => x, cache = new Map()) => {
    return /** @type {any} */ (
        (/** @type {Parameters<T>} */ ...args) => {
            let cachekey = cachekey_resolver(...args)
            // console.log(`args, cachekey:`, args, cachekey, cache.has(cachekey))
            if (cache.has(cachekey)) {
                return cache.get(cachekey)
            } else {
                // @ts-ignore
                let result = fn(...args)
                cache.set(cachekey, result)
                return result
            }
        }
    )
}

/**
 * @template {(...args: any) => any} T
 * @param {T} fn
 * @param {(...x: Parameters<T>) => Array<any>} cachekey_resolver
 * @returns {T}
 */
let weak_memo = (fn, cachekey_resolver = (...x) => x) => memo(fn, cachekey_resolver, new ManyKeysWeakmap())

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 *
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

/** @param {TreeCursor} cursor */
export let child_cursors = function* (cursor) {
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

/**
 * @typedef AstTemplate
 * @type {{
 *  name?: string,
 *  from?: number,
 *  to?: number,
 *  node: SyntaxNode,
 *  children: Array<AstTemplate>,
 * } | {
 *  pattern: (
 *      haystack: (TreeCursor | void),
 *      matches: { [key: string]: any },
 *      verbose?: boolean
 *  ) => boolean,
 * }}
 */

/**
 * @param {TreeCursor | void} haystack_cursor
 * @param {AstTemplate} template
 * @param {{ [name: string]: any }} matches
 * @param {boolean} verbose
 */
export let match_template = (haystack_cursor, template, matches, verbose = false) => {
    let previous_node = null
    if (verbose) {
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
            verbose && console.log(`pattern:`, pattern)
            if (typeof pattern !== "function") {
                console.log(`pattern:`, pattern)
                throw new Error("Unknown pattern")
            }
            verbose && console.log(`matches:`, matches)

            return pattern(haystack_cursor, matches, verbose)
        } else if ("node" in template) {
            let { node, children } = template

            if (haystack_cursor && haystack_cursor.name === "⚠") {
                // Not sure about this yet but ehhhh
                verbose && console.log(`✅ because ⚠`)
                return true
            }

            if (!haystack_cursor || haystack_cursor.name !== node.name) {
                verbose && console.log(`❌ because no cursor or name mismatch`)
                return false
            }

            if (haystack_cursor.firstChild()) {
                try {
                    let is_last_from_haystack = false
                    for (let template_child of children) {
                        if (is_last_from_haystack) {
                            verbose && console.log(`❌ because no cursor or name mismatch`)
                            return false
                        }

                        let child_does_match = match_template(haystack_cursor, template_child, matches, verbose)

                        if (!child_does_match) {
                            verbose && console.log(`❌ because a child mismatch`, template_child, haystack_cursor.toString())
                            return false
                        }

                        // This is where we actually move the haystack_cursor (in sync with the `template.children`)
                        // to give the nested match templates more freedom in move the cursor around between siblings.
                        is_last_from_haystack = !haystack_cursor.nextSibling()
                    }
                    verbose && console.log(`✅ because all children match`)
                    return true
                } finally {
                    haystack_cursor.parent()
                }
            } else {
                for (let child of template.children) {
                    if (!match_template(null, child, matches, verbose)) {
                        verbose && console.log(`❌ because a mismatch with null child`, child)
                        return false
                    }
                }
                verbose && console.log(`✅ because empty children are fine`)
                return true
            }
        } else {
            console.log(`template:`, template)
            throw new Error("waaaah")
        }
    } finally {
        if (verbose) {
            console.groupEnd()
        }
    }
}

export class JuliaCodeObject {
    /**
     * @param {TemplateStringsArray} template
     * @param {any[]} substitutions
     * */
    constructor(template, substitutions) {
        let flattened_template = []
        let flattened_substitutions = []

        flattened_template.push(template[0])
        for (let [string_part, substitution] of lodash.zip(template.slice(1), substitutions)) {
            if (substitution instanceof JuliaCodeObject) {
                flattened_template[flattened_template.length - 1] += substitution.template[0]
                for (let [sub_string_part, sub_substitution] of lodash.zip(substitution.template.slice(1), substitution.substitutions)) {
                    flattened_substitutions.push(sub_substitution)
                    flattened_template.push(sub_string_part)
                }
                flattened_template[flattened_template.length - 1] += string_part
            } else {
                flattened_substitutions.push(substitution)
                flattened_template.push(string_part)
            }
        }

        this.template = flattened_template
        this.substitutions = flattened_substitutions
    }
}

/**
 * @param {SyntaxNode} ast
 * @param {Array<{ generator: TemplateGenerator, from: number, to: number, used?: boolean }>} substitutions
 * @returns {AstTemplate}
 */
let substitutions_to_template = (ast, substitutions) => {
    for (let substitution of substitutions) {
        if (ast.from === substitution.from && ast.to === substitution.to) {
            // Hacky and weird, but it is only for validation
            substitution.used = true
            let { value, done, ...rest } = substitution.generator.next({
                from: ast.from,
                to: ast.to,
                name: ast.name,
                node: ast,
            })
            if (!done) throw new Error("Template generator not done providing ast node")
            return value
        }
    }

    return {
        node: ast,
        children: Array.from(child_nodes(ast)).map((node) => substitutions_to_template(node, substitutions)),
        name: ast.name,
        from: ast.from,
        to: ast.to,
    }
}

/**
 * @typedef TemplateMatcher
 * @type {any}
 */

/**
 * @typedef ToTemplateAST
 * @type {{
 *  name: string,
 *  from: number,
 *  to: number,
 *  node: SyntaxNode,
 * }}
 */

/**
 * @typedef TemplateGenerator
 * @type {Generator<string, TemplateMatcher, ToTemplateAST>}
 */

/**
 * @param {JuliaCodeObject | (() => TemplateGenerator)} julia_code_object
 * @returns {TemplateGenerator}
 */
export let to_template = function* (julia_code_object) {
    TEMPLATE_CREATION_VERBOSE && console.log(`to_template(`, julia_code_object, `)`)
    if (julia_code_object instanceof JuliaCodeObject) {
        let julia_code_to_parse = ""

        let subsitions = []
        for (let [string_part, substitution] of lodash.zip(julia_code_object.template, julia_code_object.substitutions)) {
            julia_code_to_parse += string_part

            if (substitution) {
                let substitution_generator = to_template(substitution)

                let { value: substitution_code, done } = substitution_generator.next()
                if (done) throw new Error("Template generator ended before taking ast node")

                subsitions.push({
                    from: julia_code_to_parse.length,
                    to: julia_code_to_parse.length + substitution_code.length,
                    generator: substitution_generator,
                })
                julia_code_to_parse += substitution_code
            }
        }
        let template_node = yield julia_code_to_parse

        let substitution_with_proper_position = subsitions.map((substitution) => {
            return {
                // Huh
                from: substitution.from + template_node.from,
                to: substitution.to + template_node.from,
                generator: substitution.generator,
                used: false,
            }
        })

        if (TEMPLATE_CREATION_VERBOSE) {
            console.log(`julia_code_to_parse:`, julia_code_to_parse)
            console.log(`template_node:`, template_node)
            console.log(`subsitions:`, subsitions)
            console.log(`substitution_with_proper_position:`, substitution_with_proper_position)
        }

        let result = substitutions_to_template(template_node.node, substitution_with_proper_position)
        let unused_substitutions = substitution_with_proper_position.filter((substitution) => !substitution.used)
        if (unused_substitutions.length > 0) {
            console.log(`unused_substitutions:`, unused_substitutions)
            throw new Error(`Unused substitutions: ${unused_substitutions}`)
        }
        return result
    } else if (typeof julia_code_object === "function") {
        return yield* julia_code_object()
    } else {
        console.log(`julia_code_object:`, julia_code_object)
        throw new Error("Unknown substition type")
    }
}

/**
 * @param {TemplateStringsArray} template
 * @param {any[]} substitutions
 * */
export let jl = weak_memo((template, ...substitutions) => {
    return new JuliaCodeObject(template, substitutions)
})

/**
 * @typedef MatchResult
 * @type {any}
 */

/**
 * @typedef ToplevelTemplate
 * @type {{
 *  match: (haystack_cursor: TreeCursor | SyntaxNode, verbose?: boolean) => void | { [key: string]: MatchResult }
 * }}
 */

export let template = weak_memo((/** @type {JuliaCodeObject} */ julia_code_object) => {
    let template_generator = to_template(julia_code_object)
    /** @type {any} */
    let { value: julia_to_parse, done: shouldnt_be_done } = template_generator.next()
    if (shouldnt_be_done) throw new Error("Template generator ended before taking ast node")

    // let template_doc = Text.of([julia_to_parse])
    let template_ast = julia_parser.parse(julia_to_parse).topNode.firstChild

    let { value: the_actual_template, done: should_be_done } = template_generator.next({
        from: 0,
        to: julia_to_parse.length,
        name: template_ast.name,
        node: /** @type {any} */ (template_ast),
    })
    if (!should_be_done) throw new Error("Template generator not done providing ast node")

    return /** @type {ToplevelTemplate} */ ({
        /**
         * @param {TreeCursor | SyntaxNode} haystack_cursor
         * @param {boolean} verbose?
         **/
        the_actual_template,
        match(haystack_cursor, verbose = false) {
            if ("cursor" in haystack_cursor) {
                haystack_cursor = haystack_cursor.cursor
            }

            if (haystack_cursor.name === "⚠") {
                return null
            }

            let matches = /** @type {{ [key: string]: MatchResult }} */ ({})

            verbose && console.group("Starting a .match")
            try {
                return match_template(haystack_cursor, the_actual_template, matches, verbose) ? matches : null
            } finally {
                console.groupEnd()
            }
        },
    })
})

export let as_string = weak_memo((/** @type {JuliaCodeObject} */ julia_code_object) => {
    let template_generator = to_template(julia_code_object)
    let { value: julia_to_parse, done } = template_generator.next()
    if (done) throw new Error("Template generator ended before taking ast node")
    return julia_to_parse
})

export let as_node = weak_memo((/** @type {JuliaCodeObject} */ julia_code_object) => {
    return /** @type {SyntaxNode} */ (/** @type {unknown} */ (julia_parser.parse(as_string(julia_code_object)).topNode.firstChild))
})

/**
 * @template {(name: string, ...args: any[]) => any} T
 * @param {T} func
 * @returns {T}
 **/
let memo_first_argument_weakmemo_rest = (func) => {
    let per_name_memo = memo((name) => {
        return weak_memo((...args) => {
            return func(name, ...args)
        })
    })

    return /** @type {any} */ (
        (name, ...args) => {
            let sub_memo = per_name_memo(name)
            return sub_memo(...args)
        }
    )
}

function* expression() {
    yield "expression"
    return {
        pattern: (cursor, matches, verbose = false) => {
            if (cursor == null) {
                verbose && console.log("cursor null")
                return false
            }
            // So we don't match keywords
            if (cursor.name[0] === cursor.name[0].toLowerCase()) {
                verbose && console.log("keyword")
                return false
            }
            return true
        },
    }
}

export const t = {
    expression: expression,
    any: expression,
    many: memo_first_argument_weakmemo_rest((name, of_what = expression) => {
        return function* many() {
            let sub_template = yield* to_template(of_what)

            return {
                pattern: function many(cursor, matches, verbose = false) {
                    if (cursor == null) return true

                    let matches_nodes = []
                    while (true) {
                        let local_match = {}
                        let did_match = match_template(cursor, sub_template, local_match, verbose)
                        if (!did_match) break
                        matches_nodes.push({ node: cursor.node, match: local_match })

                        if (!cursor.nextSibling()) break
                    }

                    if (name != null) {
                        matches[name] = matches_nodes
                    }

                    // Move back on child, as that is the child that DIDN'T match
                    cursor.prevSibling()
                    return true
                },
            }
        }
    }),

    maybe: weak_memo((what) => {
        return function* maybe() {
            let sub_template = yield* to_template(what)
            return {
                pattern: function maybe(cursor, matches, verbose = false) {
                    if (cursor == null) return true
                    if (cursor.name === "⚠") return true

                    let did_match = match_template(cursor, sub_template, matches, verbose)

                    if (did_match === false) {
                        cursor.prevSibling()
                    }
                    return true
                },
            }
        }
    }),

    // This is an escape hatch.
    // Ideally I'd want to ask for multiple different templates to match, but I can't easily get that to work yet.
    // So for now, you can ask templates to just match "Anything kinda like this",
    // and then do further matching on the result manually.
    anything_that_fits: weak_memo((what) => {
        return function* anything_that_fits() {
            // We send the template code upwards, but we fully ignore the output
            yield* to_template(what)
            return {
                pattern: function anything_that_fits(cursor, matches, verbose = false) {
                    return true
                },
            }
        }
    }),
    something_with_the_same_type_as: weak_memo((what) => {
        return function* something_with_the_same_type_as() {
            let template_generator = to_template(what)
            let { value: julia_to_parse, done: shouldnt_be_done } = template_generator.next()
            if (shouldnt_be_done) throw new Error("Template generator ended before taking ast node")

            console.log(`julia_to_parse:`, julia_to_parse)
            let ast = yield julia_to_parse

            template_generator.return()

            console.log(`ast:`, ast)

            return {
                pattern: function something_with_the_same_type_as(cursor, matches, verbose = false) {
                    return ast.name === cursor.name
                },
            }
        }
    }),

    as: memo_first_argument_weakmemo_rest((name, what = expression) => {
        return function* as() {
            let sub_template = yield* to_template(what)
            return {
                pattern: function as(cursor, matches, verbose = false) {
                    let did_match = match_template(cursor, sub_template, matches, verbose)
                    if (did_match === true) {
                        matches[name] = cursor.node
                    }
                    return did_match
                },
            }
        }
    }),

    Identifier: function* Identifier() {
        yield "identifier"
        return {
            pattern: function Identifier(cursor, matches, verbose = false) {
                console.log(`cursor:`, narrow_name(cursor), cursor.toString())
                return narrow_name(cursor) === "Identifier"
            },
        }
    },
    Number: function* Number() {
        yield "69"
        return {
            pattern: function Number(cursor, matches, verbose = false) {
                return narrow_name(cursor) === "Number"
            },
        }
    },
    String: function* String() {
        yield `"A113"`
        return {
            pattern: function String(cursor, matches, verbose = false) {
                return narrow_name(cursor) === "StringWithoutInterpolation"
            },
        }
    },
}

/**
 * @param {JuliaCodeObject} template
 * @param {ToplevelTemplate} meta_template
 * @returns {ToplevelTemplate}
 */
export let take_little_piece_of_template = weak_memo((template, meta_template) => {
    let generator = to_template(template)
    let { value: julia_to_parse, done } = generator.next()
    if (done) throw new Error("Template generator ended before taking ast node")
    let template_ast = julia_parser.parse(julia_to_parse).topNode.firstChild

    let match = null
    if ((match = meta_template.match(template_ast))) {
        let { content } = /** @type {{ content: SyntaxNode }} */ (match)

        // Need to provide the original from:to range
        let { value: the_actual_template, done } = generator.next({
            from: template_ast.from,
            to: template_ast.to,
            name: content.name,
            node: content,
        })

        if (!done) throw new Error("Template generator not done providing ast node")

        return {
            the_actual_template,
            /**
             * @param {TreeCursor | SyntaxNode} haystack_cursor
             * @param {boolean} verbose?
             * */
            match(haystack_cursor, verbose = false) {
                if ("cursor" in haystack_cursor) haystack_cursor = haystack_cursor.cursor
                if (haystack_cursor.name === "⚠") return null

                let matches = {}
                return match_template(haystack_cursor, the_actual_template, matches, verbose) ? matches : null
            },
        }
    } else {
        console.log(`meta_template:`, meta_template)
        console.log(`template:`, template)
        throw new Error("Template passed into `take_little_piece_of_template` doesn't match meta_template")
    }
})

/**
 * @param {SyntaxNode} node
 * @returns {SyntaxNode}
 **/
export let narrow = (node) => {
    if (node.firstChild && node.firstChild.from === node.from && node.firstChild.to === node.to) {
        return narrow(node.firstChild)
    } else {
        return node
    }
}

export let narrow_name = (cursor) => {
    let from = cursor.from
    let to = cursor.to
    if (cursor.firstChild()) {
        try {
            if (cursor.from === from && cursor.to === to) {
                return narrow_name(cursor)
            }
        } finally {
            cursor.parent()
        }
    }
    return cursor.name
}

/**
 * @param {(arg: any) => JuliaCodeObject} fn
 */
export let create_specific_template_maker = (fn) => {
    return (argument) => {
        let meta_template = template(fn(t.as("content")))
        return take_little_piece_of_template(fn(argument), meta_template)
    }
}
