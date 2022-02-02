import { julia_andrey, NodeProp, syntaxTree, Text } from "../../imports/CodemirrorPlutoSetup.js"
import lodash from "../../imports/lodash.js"

// @ts-ignore
import ManyKeysWeakMap from "https://cdn.esm.sh/v64/many-keys-weakmap@1.0.0/es2021/many-keys-weakmap.js"

/**
 * @param {string} julia_code
 * @returns {SyntaxNode}
 */
export let julia_to_ast = (julia_code) => {
    return /** @type {any} */ (julia_andrey().language.parser.parse(julia_code).topNode.firstChild)
}

const TEMPLATE_CREATION_VERBOSE = false

/**
 * Settings this to `"VALIDITY"` will enable some (currently, one) slow validations.
 * Might be useful to run set this to `"VALIDITY"` every so often to make sure there are no bugs.
 * In production this should always to `"SPEED"`
 *
 * @type {"SPEED" | "VALIDITY"}
 */
const PERFORMANCE_MODE = /** @type {any} */ ("SPEED")

const IS_IN_VALIDATION_MODE = PERFORMANCE_MODE === "VALIDITY"

/**
 * @template {Array} P
 * @template {(...args: P) => any} T
 * @param {T} fn
 * @param {(...args: P) => any} cachekey_resolver
 * @param {WeakMap} cache
 * @returns {T}
 */
let memo = (fn, cachekey_resolver = /** @type {any} */ ((x) => x), cache = new Map()) => {
    return /** @type {any} */ (
        (/** @type {P} */ ...args) => {
            let cachekey = cachekey_resolver(...args)
            let result = cache.get(cachekey)
            if (result != null) {
                return result
            } else {
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

/**
 * @template {(arg: any) => any} T
 * @param {T} fn
 * @returns {T}
 */
let weak_memo1 = (fn) => memo(fn, (x) => x, new WeakMap())

// Good luck figuring anything out from these types 💕

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 *
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
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
 * @typedef Templatable
 * @type {JuliaCodeObject | Substitution}
 */

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

            if (!haystack_cursor) {
                if (node.name === "end") {
                    verbose && console.log(`✅ No node left to match, but it was the end anyway`)
                    return true
                }
                verbose && console.log(`❌ because no cursor left to match against`)
                return false
            }

            if (haystack_cursor.type.isError) {
                // Not sure about this yet but ehhhh
                verbose && console.log(`✅ because ⚠`)
                return true
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
 * @param {Templatable} julia_code_object
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
            throw new Error(`Some substitutions not applied, this means it couldn't be matched to a AST position:`, unused_substitutions)
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

/** @type {WeakMap<TemplateStringsArray, { input: Array<Templatable>, result: JuliaCodeObject }>} */
let template_cache = new WeakMap()
/**
 * @param {TemplateStringsArray} template
 * @param {Array<Templatable>} substitutions
 */
export let jl = (template, ...substitutions) => {
    let cached = template_cache.get(template)
    if (cached != null) {
        let { input, result } = cached
        if (IS_IN_VALIDATION_MODE) {
            if (!lodash.isEqual(substitutions, input)) {
                console.trace("Substitutions changed on `jl` template string.. change to `jl_dynamic` if you need this.")
            }
        }
        return result
    } else {
        // Uncomment this if you want to check if the cache is working
        // console.log("Creating template for", template, substitutions)
        let result = new JuliaCodeObject(template, substitutions)
        template_cache.set(template, {
            input: substitutions,
            result: result,
        })
        return result
    }
}

/**
 * Turns a ``` jl`` ``` (or substitution) into a template with a `.match(cursor)` method.
 *
 * @type {(code: Templatable) => Matcher}
 */
export let template = weak_memo1((julia_code_object) => {
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
            if (haystack_cursor.type.isError) return null

            if ("cursor" in haystack_cursor) haystack_cursor = haystack_cursor.cursor

            let matches = /** @type {{ [key: string]: MatchResult }} */ ({})

            verbose && console.groupCollapsed(`Starting a match at ${haystack_cursor.name}`)
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

export let as_doc = weak_memo1((/** @type {JuliaCodeObject} */ julia_code_object) => {
    return Text.of([as_string(julia_code_object)])
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

    return /** @type {T} */ (
        (name, arg = fake_weakmap_no_arg) => {
            let sub_memo = per_name_memo(name)
            return sub_memo(arg)
        }
    )
}

/** @type {Substitution} */
function* any() {
    yield "expression"
    return {
        pattern: function expression(cursor, matches, verbose = false) {
            if (!cursor) {
                verbose && console.log("❌ I want anything!! YOU GIVE ME NULL???")
                return false
            }
            if (cursor.type.is("keyword")) {
                verbose && console.log("❌ Keywords are not allowed!")
                return false
            }
            return true
        },
    }
}

/**
 * @param {TemplateGenerator} template_generator
 * @return {TemplateGenerator}
 * */
function* narrow_template(template_generator) {
    let ast = yield intermediate_value(template_generator.next())

    if (ast.node.firstChild && ast.node.from === ast.node.firstChild.from && ast.node.to === ast.node.firstChild.to) {
        console.log("Narrowing!!!!", ast.node, ast.node.firstChild)
        return {
            node: ast.node,
            from: ast.from,
            to: ast.to,
            children: [
                return_value(
                    template_generator.next({
                        ...ast,
                        node: ast.node.firstChild,
                    })
                ),
            ],
        }
    } else {
        return return_value(template_generator.next(ast))
    }
}

export const t = /** @type {const} */ ({
    any: any,
    /**
     * Match no, one, or multiple! Like `*` in regex.
     * It stores it's matches as `{ [name]: Array<{ node: SyntaxNode, matches: MatchResult }> }`
     *
     * If name isn't provided it will not store any of the matches.. useful if you really really don't care about something.
     *
     * @type {(name?: string, what?: Templatable) => Substitution}
     */
    many: memo_first_argument_weakmemo_second((name, of_what = any) => {
        return function* many() {
            let template_generator = to_template(of_what)
            let ast = yield intermediate_value(template_generator.next())

            // Ugly but it works
            let narrowed_node = null
            let sub_template = null
            if (ast.node.firstChild && ast.node.from === ast.node.firstChild.from && ast.node.to === ast.node.firstChild.to) {
                narrowed_node = ast.node
                sub_template = return_value(
                    template_generator.next({
                        ...ast,
                        node: ast.node.firstChild,
                    })
                )
            } else {
                sub_template = return_value(template_generator.next(ast))
            }

            // let sub_template = yield* narrow_template(to_template(of_what))

            return {
                narrowed_node,
                sub_template,
                pattern: function many(cursor, matches, verbose = false) {
                    if (!cursor) {
                        verbose && console.log("✅ Nothing to see here... I'm fine with that - many")
                        return true
                    }

                    if (narrowed_node) {
                        if (cursor.name !== narrowed_node.name) {
                            verbose && console.log("❌ Tried to go in, but she wasn't my type - many")
                            cursor.prevSibling()
                            return true
                        }
                        cursor.firstChild()
                    }

                    try {
                        let matches_nodes = []
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
                    } finally {
                        if (narrowed_node) {
                            cursor.parent()
                        }
                    }
                },
            }
        }
    }),

    /**
     * Match either a single node or none. Like `?` in regex.
     * @type {(what: Templatable) => Substitution}
     */
    maybe: weak_memo1((what) => {
        return function* maybe() {
            let sub_template = yield* to_template(what)
            return {
                sub_template,
                pattern: function maybe(cursor, matches, verbose = false) {
                    if (!cursor) return true
                    if (cursor.type.isError) return true

                    let did_match = match_template(cursor, sub_template, matches, verbose)

                    if (did_match === false) {
                        // Roll back position because we didn't match
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
     *
     * @type {(what: Templatable) => Substitution}
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
    /**
     * This is an escape hatch, like {@linkcode anything_that_fits},
     * but it does also check for node type at least.
     *
     * @type {(what: Templatable) => Substitution}
     * */
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
     * @type {(name: string, what?: Templatable) => Substitution}
     */
    as: memo_first_argument_weakmemo_second((name, what = any) => {
        return function* as() {
            let sub_template = yield* to_template(what)
            return {
                sub_template,
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

    /** @type {Substitution} */
    Identifier: function* Identifier() {
        yield "identifier"
        return {
            pattern: function Identifier(cursor, matches, verbose = false) {
                return cursor && narrow_name(cursor) === "Identifier"
            },
        }
    },
    /** @type {Substitution} */
    Number: function* Number() {
        yield "69"
        return {
            pattern: function Number(cursor, matches, verbose = false) {
                return cursor && narrow_name(cursor) === "Number"
            },
        }
    },
    /** @type {Substitution} */
    String: function* String() {
        yield `"A113"`
        return {
            pattern: function String(cursor, matches, verbose = false) {
                return cursor && (narrow_name(cursor) === "StringWithoutInterpolation" || narrow_name(cursor) === "TripleStringWithoutInterpolation")
            },
        }
    },
})

/**
 * Basically exists for {@linkcode create_specific_template_maker}
 *
 * @type {(template: Templatable, meta_template: Matcher) => Matcher}
 */
export let take_little_piece_of_template = weak_memo((template, meta_template) => {
    let template_generator = to_template(template)
    let julia_to_parse = intermediate_value(template_generator.next())

    // Parse the AST from the template, but we don't send it back to the template_generator yet!
    let template_ast = julia_to_ast(julia_to_parse)

    let match = null
    // Match our created template code to the meta-template, which will yield us the part of the
    // AST that falls inside the "content" in the meta-template.
    if ((match = meta_template.match(template_ast))) {
        let { content } = /** @type {{ content: SyntaxNode }} */ (match)

        let possible_parents = []
        while (content.firstChild && content.firstChild.from == content.from && content.firstChild.to == content.to) {
            possible_parents.push(content.type)
            content = content.firstChild
        }

        if (content == null) {
            console.log(`match:`, match)
            throw new Error("No content match?")
        }

        // Now we send just the `content` back to the template generator, which will happily accept it...
        // (We do send the original from:to though, as these are the from:to's that are also in the template AST still)
        let template_description = return_value(
            template_generator.next({
                name: content.name,
                node: content,
                // Need to provide the original from:to range
                from: template_ast.from,
                to: template_ast.to,
            })
        )

        // And for some reason this works?
        // Still feels like it shouldn't... it feels like I conjured some dark magic and I will be swiming in tartarus soon...

        return {
            possible_parents,
            template_description,
            /**
             * @param {TreeCursor | SyntaxNode} haystack_cursor
             * @param {boolean} verbose?
             * */
            match(haystack_cursor, verbose = false) {
                if (haystack_cursor.type.isError) {
                    verbose && console.log(`❌ Short circuiting because haystack(${haystack_cursor.name}) is an error`)
                    return false
                }
                if ("cursor" in haystack_cursor) haystack_cursor = haystack_cursor.cursor

                // Should possible parents be all-or-nothing?
                // So either it matches all the possible parents, or it matches none?
                let depth = 0
                for (let possible_parent of possible_parents) {
                    if (haystack_cursor.type === possible_parent) {
                        let parent_from = haystack_cursor.from
                        let parent_to = haystack_cursor.to
                        // Going in
                        if (haystack_cursor.firstChild()) {
                            if (haystack_cursor.from === parent_from && haystack_cursor.to === parent_to) {
                                verbose && console.log(`✅ Matched parent, going one level deeper (${possible_parent})`)
                                depth++
                            } else {
                                haystack_cursor.parent()
                                verbose &&
                                    console.log(
                                        `❌ Was matching possible parent (${possible_parent}), but it wasn't filling?! That's weird.... ${haystack_cursor.toString()}`
                                    )
                                for (let i = 0; i < depth; i++) {
                                    haystack_cursor.parent()
                                }
                                return false
                            }
                        }
                    } else {
                        break
                    }
                }

                // prettier-ignore
                verbose && console.groupCollapsed(`Starting a specific at match haystack(${haystack_cursor.name}) vs. template(${"node" in template_description ? template_description.name : template_description.pattern.name})`)

                try {
                    let matches = {}
                    return match_template(haystack_cursor, template_description, matches, verbose) ? matches : null
                } finally {
                    // ARE FOR LOOPS REALLY THE BEST I CAN DO HERE??
                    for (let i = 0; i < depth; i++) {
                        haystack_cursor.parent()
                    }

                    verbose && console.groupEnd()
                }
            },
        }
    } else {
        console.log(`meta_template:`, meta_template)
        console.log(`template:`, template)
        throw new Error("Template passed into `take_little_piece_of_template` doesn't match meta_template")
    }
})

/**
 * Sometimes nodes are nested at the exact same position:
 * `struct X end`, here `X` could be both a `Definition(Identifier)` or just the `Identifier`.
 * This function will get you the deepest node, so in the above example, it would be `Identifier`.
 * If the node has multiple children, or the child is offset, it will return the original node.
 *
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

/**
 * Effecient, cursor-based, version of `narrow(node)`,
 * for if all you care about is the name.
 *
 * Which will be most of the time..
 *
 * @param {TreeCursor} cursor
 * @return {string}
 */
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
 * This allows for selecting the unselectable!
 * By default templates need to match the topnode of their AST, but sometimes we want to match something on a special position.
 *
 * ```create_specific_template_maker(x => jl_dynamic`import X: ${x}`)``` will match specifiers that could occur specifically on the `${x}` position.
 *
 * NOTE: Inside `create_specific_template_maker` you'll have to use `jl_dynamic` not going to explain why.
 *
 * @param {(subtemplate: Templatable) => Templatable} fn
 */
export let create_specific_template_maker = (fn) => {
    return (argument) => {
        let meta_template = template(fn(t.as("content", argument)))
        return take_little_piece_of_template(fn(argument), meta_template)
    }
}

/**
 * Like Lezers `iterate`, but instead of `{ from, to, getNode() }`
 * this will give `enter()` and `leave()` the `cursor` (which can be effeciently matches with lezer template)
 *
 * @param {{
 *  tree: any,
 *  enter: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  leave?: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  from?: number,
 *  to?: number,
 * }} options
 */
export function iterate_with_cursor({ tree, enter, leave, from = 0, to = tree.length }) {
    let cursor = tree.cursor()
    while (true) {
        let mustLeave = false
        if (cursor.from <= to && cursor.to >= from && (cursor.type.isAnonymous || enter(cursor) !== false)) {
            if (cursor.firstChild()) continue
            if (!cursor.type.isAnonymous) mustLeave = true
        }
        while (true) {
            if (mustLeave && leave) leave(cursor)
            mustLeave = cursor.type.isAnonymous
            if (cursor.nextSibling()) break
            if (!cursor.parent()) return
            mustLeave = true
        }
    }
}

///////////////////////////////////
// FULL ON UTILITY FUNCTIONS
///////////////////////////////////

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
 * Not sure why typescript doesn't infer the `Generator<_, T>` when I ask !iterater_result.done...
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
