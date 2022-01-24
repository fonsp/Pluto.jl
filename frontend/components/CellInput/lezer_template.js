import { julia_andrey, Text } from "../../imports/CodemirrorPlutoSetup.js"
import lodash from "../../imports/lodash.js"

// @ts-ignore
import ManyKeysWeakMap from "https://esm.sh/many-keys-weakmap@1.0.0"

/**
 * @param {string} julia_code
 * @returns {SyntaxNode}
 */
export let julia_to_ast = (julia_code) => {
    return /** @type {any} */ (julia_andrey().language.parser.parse(julia_code).topNode.firstChild)
}

let TEMPLATE_CREATION_VERBOSE = false

/**
 * @template {(...args: any) => any} T
 * @param {T} fn
 * @param {(...x: Parameters<T>) => any} cachekey_resolver
 * @param {WeakMap} cache
 * @returns {T}
 */
let memo = (fn, cachekey_resolver = (x) => x, cache = new Map()) => {
    return /** @type {any} */ (
        (/** @type {Parameters<T>} */ ...args) => {
            let cachekey = cachekey_resolver(...args)
            // console.log(`args, cachekey:`, args, cachekey, cache.has(cachekey))
            let result = cache.get(cachekey)
            if (result != null) {
                return result
            } else {
                // @ts-ignore
                let result = fn(...args)

                if (result == undefined) {
                    throw new Error("Memoized function returned undefined")
                }
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
let weak_memo = (fn, cachekey_resolver = (...x) => x) => memo(fn, cachekey_resolver, new ManyKeysWeakMap())

let weak_memo1 = (fn) => memo(fn, (x) => x, new WeakMap())

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
    if (verbose) {
        console.group("Current haystack:", !haystack_cursor ? null : haystack_cursor.node.name)

        console.groupCollapsed("Details")
        try {
            console.log(`template:`, template)
            console.log(`haystack_cursor:`, !haystack_cursor ? null : haystack_cursor.node.toString())

            if ("node" in template) {
                console.log(`template.node:`, template.node)
                console.log(`template.node.toString():`, template.node.toString())
            } else if ("pattern" in template) {
                console.log(`template.pattern:`, template.pattern)
            }
        } finally {
            console.groupEnd()
        }
    }

    try {
        if ("pattern" in template) {
            let pattern = template.pattern
            if (typeof pattern !== "function") {
                throw new Error(`Unknown pattern "${pattern}"`)
            }

            let matches_before_matching = {}
            if (verbose) {
                matches_before_matching = { ...matches }
                console.groupCollapsed(`Matching against pattern: ${template.pattern.name}()`)
            }

            let did_match = null
            try {
                did_match = pattern(haystack_cursor, matches, verbose)
            } finally {
                if (verbose) {
                    console.groupEnd()
                }
            }
            if (verbose) {
                if (did_match) {
                    console.log(`✅ because the pattern was happy! All hail the pattern!`)
                    if (!lodash.isEqual(matches, matches_before_matching)) {
                        let new_matches = lodash.omit(matches, Object.keys(matches_before_matching))
                        console.log(`   WE EVEN GOT NEW MATCHES SAY WHAAAAAAT:`, new_matches)
                    }
                } else {
                    console.log(`❌ because... well, you should ask the pattern that!`)
                }
            }

            return did_match
        } else if ("node" in template) {
            let { node, children } = template

            verbose && console.log(`Matching against node: ${template.node.name}`)

            if (haystack_cursor && haystack_cursor.name === "⚠") {
                // Not sure about this yet but ehhhh
                verbose && console.log(`✅ because ⚠`)
                return true
            }

            if (!haystack_cursor) {
                verbose && console.log(`❌ because no cursor left to match against`)
                return false
            }

            if (haystack_cursor.name !== node.name) {
                verbose && console.log(`❌ because name mismatch "${haystack_cursor.name}" !== "${node.name}"`)
                return false
            }

            if (haystack_cursor.firstChild()) {
                try {
                    let is_last_from_haystack = false
                    for (let template_child of children) {
                        if (is_last_from_haystack) {
                            verbose && console.log(`Haystack is empty, but there are more children in template... lets see`)
                            let child_does_match = match_template(null, template_child, matches, verbose)
                            if (!child_does_match) {
                                verbose && console.log(`❌ template child did not accept null for an answer`, template_child, haystack_cursor.toString())
                                return false
                            }
                            verbose && console.log(`👌🏽 This template child was fine with null`)
                            continue
                        }

                        // Skip comments
                        // TODO This is, I think, one of the few julia-only things right now.....
                        // .... Any sane way to factor this out?
                        while (haystack_cursor.name === "Comment" || haystack_cursor.name === "BlockComment") {
                            if (!haystack_cursor.nextSibling()) break
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

                    if (verbose && !is_last_from_haystack) {
                        let spare_children = []
                        do {
                            spare_children.push(haystack_cursor.node)
                        } while (haystack_cursor.nextSibling())
                        for (let child of spare_children) {
                            haystack_cursor.prevSibling()
                        }

                        // prettier-ignore
                        console.warn("We did match all the children of the template, but there are more in the haystack... Might want to actually not match this?", spare_children, template)
                    }

                    verbose && console.log(`✅ because all children match`)
                    return true
                } finally {
                    haystack_cursor.parent()
                }
            } else {
                if (template.children.length !== 0) {
                    verbose && console.log(`Haystack node is empty, but template has children... lets see`)

                    for (let child of template.children) {
                        if (!match_template(null, child, matches, verbose)) {
                            verbose && console.log(`❌ because child template wasn't okay with having no children`, child)
                            return false
                        }
                    }
                    verbose && console.log(`✅ All template children we're fine with having no children to check on`)
                    return true
                } else {
                    verbose && console.log(`✅ Template also has no children, yayyy`)
                    return true
                }
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
            let result = substitution.generator.next({
                name: ast.name,
                from: ast.from,
                to: ast.to,
                node: ast,
            })

            if (result.done) {
                return result.value
            } else {
                throw new Error("Template generator not done providing ast node")
            }
        }
    }

    return {
        name: ast.name,
        from: ast.from,
        to: ast.to,
        children: Array.from(child_nodes(ast)).map((node) => substitutions_to_template(node, substitutions)),
        node: ast,
    }
}

/**
 * Not sure why typescript doesn't infer the `Generator<T>` when I ask !iterater_result.done...
 * Maybe it will bite me later 🤷‍♀️
 *
 * @template T
 * @param {IteratorResult<T, unknown>} iterater_result
 * @returns {T} iterater_result
 */
let intermediate_value = (iterater_result) => {
    if (iterater_result.done) {
        throw new Error("Expected `yield`-d value, but got `return`")
    } else {
        return /** @type {any} */ (iterater_result.value)
    }
}

/**
 * Not sure why typescript doesn't infer the `Generator<T>` when I ask !iterater_result.done...
 * Maybe it will bite me later 🤷‍♀️
 *
 * @template T
 * @param {IteratorResult<unknown, T>} iterater_result
 * @returns {T} iterater_result
 */
let return_value = (iterater_result) => {
    if (iterater_result.done) {
        return /** @type {any} */ (iterater_result.value)
    } else {
        throw new Error("Expected `yield`-d value, but got `return`")
    }
}

/**
 * @typedef TemplateMatcher
 * @type {any}
 */

/**
 * @typedef LezerOffsetNode
 * @type {{
 *  name: string,
 *  from: number,
 *  to: number,
 *  node: SyntaxNode,
 * }}
 */

/**
 * @typedef TemplateGenerator
 * @type {Generator<string, AstTemplate, LezerOffsetNode>}
 */

/**
 * @typedef Substitution
 * @type {() => TemplateGenerator}
 */

/**
 * @param {JuliaCodeObject | Substitution} julia_code_object
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

                let substitution_code = intermediate_value(substitution_generator.next())

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
        let unused_substitutions = substitution_with_proper_position
            .filter((substitution) => !substitution.used)
            .map((x) => {
                return {
                    text: julia_code_to_parse.slice(x.from, x.to),
                    from: x.from,
                    to: x.to,
                }
            })
        if (unused_substitutions.length > 0) {
            console.error(`Some substitutions not applied, this means it couldn't be matched to a AST position:`, unused_substitutions)
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
export let jl_dynamic = weak_memo((template, ...substitutions) => {
    return new JuliaCodeObject(template, substitutions)
})

let template_cache = new WeakMap()
export let jl = (template, ...substitutions) => {
    if (template_cache.has(template)) {
        let { input, result } = template_cache.get(template)
        if (TEMPLATE_CREATION_VERBOSE) {
            if (!lodash.isEqual(substitutions, input)) {
                console.trace("Substitutions changed on `jl` template string.. change to `jl_dynamic` if you need this.")
            }
        }
        return result
    } else {
        let result = new JuliaCodeObject(template, substitutions)
        template_cache.set(template, {
            input: substitutions,
            result: result,
        })
        return result
    }
}

/**
 * @typedef MatchResult
 * @type {any}
 */

/**
 * @typedef Matcher
 * @type {{
 *  match: (haystack_cursor: TreeCursor | SyntaxNode, verbose?: boolean) => void | { [key: string]: MatchResult }
 * }}
 */

export let template = weak_memo1((/** @type {JuliaCodeObject} */ julia_code_object) => {
    let template_generator = to_template(julia_code_object)
    let julia_to_parse = intermediate_value(template_generator.next())
    let template_ast = julia_to_ast(julia_to_parse)

    let template_description = return_value(
        template_generator.next({
            from: 0,
            to: julia_to_parse.length,
            name: template_ast.name,
            node: /** @type {any} */ (template_ast),
        })
    )

    return /** @type {Matcher} */ ({
        /**
         * @param {TreeCursor | SyntaxNode} haystack_cursor
         * @param {boolean} verbose?
         **/
        template_description,
        match(haystack_cursor, verbose = false) {
            // Performance gain for not converting to `TreeCursor` possibly 🤷‍♀️
            if ("node" in template_description && template_description.node.name !== haystack_cursor.name) return

            if (haystack_cursor.name === "⚠") return null
            if ("cursor" in haystack_cursor) haystack_cursor = haystack_cursor.cursor

            let matches = /** @type {{ [key: string]: MatchResult }} */ ({})

            verbose && console.group("Starting a .match")
            try {
                return match_template(haystack_cursor, template_description, matches, verbose) ? matches : null
            } finally {
                verbose && console.groupEnd()
            }
        },
    })
})

export let as_string = weak_memo1((/** @type {JuliaCodeObject} */ julia_code_object) => {
    let template_generator = to_template(julia_code_object)
    let julia_to_parse = intermediate_value(template_generator.next())
    // @ts-ignore
    template_generator.return()
    return julia_to_parse
})

export let as_node = weak_memo1((/** @type {JuliaCodeObject} */ julia_code_object) => {
    return julia_to_ast(as_string(julia_code_object))
})

/**
 * @template {(name: string, other_arg: Object) => any} T
 * @param {T} func
 * @returns {T}
 **/
let memo_first_argument_weakmemo_second = (func) => {
    let fake_weakmap_no_arg = {}
    let per_name_memo = memo((name) => {
        return weak_memo1((arg) => {
            if (arg === fake_weakmap_no_arg) return func(name)
            return func(name, arg)
        })
    })

    return /** @type {any} */ (
        (name, arg = fake_weakmap_no_arg) => {
            let sub_memo = per_name_memo(name)
            return sub_memo(arg)
        }
    )
}

function* expression() {
    yield "expression"
    return {
        pattern: function expression(cursor, matches, verbose = false) {
            if (cursor == null) {
                verbose && console.log("❌ I want an expression!! YOU GIVE ME NULL???")
                return false
            }
            // So we don't match keywords
            if (cursor.name[0] === cursor.name[0].toLowerCase()) {
                verbose && console.log("❌ Keywords are not allowed!")
                return false
            }
            return true
        },
    }
}

export const t = {
    expression: expression,
    any: expression,
    many: memo_first_argument_weakmemo_second((name, of_what = expression) => {
        return function* many() {
            let sub_template = yield* to_template(of_what)

            return {
                pattern: function many(cursor, matches, verbose = false) {
                    if (cursor == null) {
                        verbose && console.log("✅ Nothing to see here... I'm fine with that - many")
                        return true
                    }

                    let matches_nodes = []
                    let did_consume_all = false
                    while (true) {
                        let local_match = {}
                        let did_match = match_template(cursor, sub_template, local_match, verbose)
                        if (!did_match) {
                            // Move back on child, as that is the child that DIDN'T match
                            // And we want to give the next template a change to maybe match it
                            cursor.prevSibling()
                            break
                        }
                        matches_nodes.push({ node: cursor.node, match: local_match })

                        if (!cursor.nextSibling()) break
                    }

                    if (name != null) {
                        matches[name] = matches_nodes
                    }
                    return true
                },
            }
        }
    }),

    maybe: weak_memo1((what) => {
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

    /**
     * This is an escape hatch.
     * Ideally I'd want to ask for multiple different templates to match, but I can't easily get that to work yet.
     * So for now, you can ask templates to just match "Anything kinda like this",
     * and then do further matching on the result manually.
     *
     * More technically, this says "match anything that will appear in my position in the AST".
     * It does not care about the type. Don't use this recklessly!
     * */
    anything_that_fits: weak_memo1((what) => {
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
    /** @type {(what: Substitution | JuliaCodeObject) => Substitution} */
    something_with_the_same_type_as: weak_memo1((what) => {
        return function* something_with_the_same_type_as() {
            let template_generator = to_template(what)
            let julia_to_parse = intermediate_value(template_generator.next())

            let ast = yield julia_to_parse

            // @ts-ignore
            template_generator.return()

            return {
                pattern: function something_with_the_same_type_as(cursor, matches, verbose = false) {
                    return cursor && ast.name === cursor.name
                },
            }
        }
    }),

    /**
     * This "higher-order" template pattern is for adding their nodes to the matches.
     * Without a pattern (e.g. `t.as("foo")`) it will default to `t.any`
     *
     * @type {(name: string, what?: Substitution | JuliaCodeObject) => Substitution}
     */
    as: memo_first_argument_weakmemo_second((name, what = expression) => {
        return function* as() {
            let sub_template = yield* to_template(what)
            return {
                pattern: function as(cursor, matches, verbose = false) {
                    let did_match = match_template(cursor, sub_template, matches, verbose)
                    if (did_match === true) {
                        matches[name] = cursor?.["node"]
                    }
                    return cursor && did_match
                },
            }
        }
    }),

    Identifier: function* Identifier() {
        yield "identifier"
        return {
            pattern: function Identifier(cursor, matches, verbose = false) {
                verbose && console.log(`cursor:`, narrow_name(cursor), cursor.toString())
                return cursor && narrow_name(cursor) === "Identifier"
            },
        }
    },
    Number: function* Number() {
        yield "69"
        return {
            pattern: function Number(cursor, matches, verbose = false) {
                return cursor && narrow_name(cursor) === "Number"
            },
        }
    },
    String: function* String() {
        yield `"A113"`
        return {
            pattern: function String(cursor, matches, verbose = false) {
                return (cursor && narrow_name(cursor) === "StringWithoutInterpolation") || narrow_name(cursor) === "TripleStringWithoutInterpolation"
            },
        }
    },
}

/**
 * @type {(template: JuliaCodeObject, meta_template: Matcher) => Matcher}
 */
export let take_little_piece_of_template = weak_memo((template, meta_template) => {
    let generator = to_template(template)
    let julia_to_parse = intermediate_value(generator.next())

    let template_ast = julia_to_ast(julia_to_parse)

    let match = null
    if ((match = meta_template.match(template_ast))) {
        let { content } = /** @type {{ content: SyntaxNode }} */ (match)

        let template_description = return_value(
            generator.next({
                name: content.name,
                node: content,
                // Need to provide the original from:to range
                from: template_ast.from,
                to: template_ast.to,
            })
        )

        return {
            template_description,
            /**
             * @param {TreeCursor | SyntaxNode} haystack_cursor
             * @param {boolean} verbose?
             * */
            match(haystack_cursor, verbose = false) {
                // Performance gain for not converting to `TreeCursor` possibly 🤷‍♀️
                if ("node" in template_description && template_description.node.name !== haystack_cursor.name) return
                // if (haystack_cursor.name === "⚠") return null
                if ("cursor" in haystack_cursor) haystack_cursor = haystack_cursor.cursor

                let matches = {}
                return match_template(haystack_cursor, template_description, matches, verbose) ? matches : null
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
        let meta_template = template(fn(t.as("content", argument)))
        return take_little_piece_of_template(fn(argument), meta_template)
    }
}
