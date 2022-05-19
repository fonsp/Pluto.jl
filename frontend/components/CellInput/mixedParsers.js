import _ from "../../imports/lodash.js"

import {
    html,
    htmlLanguage,
    javascriptLanguage,
    markdownLanguage,
    markdown,
    parseMixed,
    PostgreSQL,
    pythonLanguage,
    sql,
    javascript,
    python,
    julia_andrey,
    parseCode,
} from "../../imports/CodemirrorPlutoSetup.js"

const htmlParser = htmlLanguage.parser
// @ts-ignore
const mdParserExt = markdownLanguage.parser.configure(parseCode({ htmlParser }))
const postgresParser = PostgreSQL.language.parser
const sqlLang = sql({ dialect: PostgreSQL })
const pythonParser = pythonLanguage.parser

/**
 * Markdown tags list; we create both `md""` and `@md("")` instances.
 */
const MD_TAGS = ["md", "mermaid", "cm", "markdown", "mdx", "mdl", "markdownliteral"].flatMap((x) => [x, `@${x}`])

/**
 * Julia strings are do not represent the exact code that is going to run
 * for example the following julia string:
 *
 * ```julia
 * """
 * const test = "five"
 * const five = \${test}
 * """
 * ```
 *
 * is going to be executed as javascript, after escaping the \$ to $
 *
 * ```javascript
 * """
 * const test = "five"
 * const five = ${test}
 * """
 * ```
 *
 * The overlays already remove the string interpolation parts of the julia string.
 * This hack additionally removes the `\` from the overlay for common interpolations, so the underlaying parser
 * will get the javascript version of the string, and not the julia version of the string (which is invalid js)
 *
 */
const overlayHack = (overlay, input) => {
    return overlay.flatMap(({ from, to }) => {
        const text = input.read(from, to)
        // const newlines = [...text.matchAll(/\\n/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
        // const escdollars = [...text.matchAll(/\\\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 1 }))
        // const escjuliadollars = [...text.matchAll(/[^\\]\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
        // const extraOverlaysNegatives = _.sortBy([...newlines, ...escdollars, ...escjuliadollars], "from")

        // For simplicity I removed the newlines stuff and just removed the \$ from the overlays
        // Curious to see edge cases that this misses - DRAL

        const result = []
        let last_content_start = from
        for (let { index: relative_escape_start } of text.matchAll(/\\\$/g)) {
            let next_escape_start = from + relative_escape_start
            if (last_content_start !== next_escape_start) {
                result.push({ from: last_content_start, to: next_escape_start })
            }
            last_content_start = next_escape_start + 1
        }
        if (last_content_start !== to) {
            result.push({ from: last_content_start, to: to })
        }
        return result
    })
}

const STRING_NODE_NAMES = new Set([
    "TripleString",
    "String",
    "CommandString",
    "TripleStringWithoutInterpolation",
    "StringWithoutInterpolation",
    "CommandStringWithoutInterpolation",
])

const juliaWrapper = parseMixed((node, input) => {
    if (!STRING_NODE_NAMES.has(node.type.name)) {
        return null
    }

    let is_tripple_string = node.name === "TripleString" || node.name === "TripleStringWithoutInterpolation"

    const offset = is_tripple_string ? 3 : 1
    const string_content_from = node.from + offset
    const string_content_to = Math.min(node.to - offset, input.length)

    if (string_content_from >= string_content_to) {
        return null
    }

    // Looking for tag OR MacroIdentifier
    const tagNode = node.node?.prevSibling || node.node?.parent?.prevSibling
    if (tagNode == null || (tagNode.name !== "MacroIdentifier" && tagNode.name !== "Prefix")) {
        // If you can't find a tag node, something is broken in the julia syntax,
        // so parse it as Julia. Probably wrong interpolation!
        return null
    }

    const is_macro = tagNode.name === "MacroIdentifier"

    const tag = input.read(tagNode.from, tagNode.to)
    let parser = null
    if (tag === "@htl" || tag === "html") {
        parser = htmlParser
    } else if (MD_TAGS.includes(tag)) {
        parser = mdParserExt
    } else if (tag === "@javascript" || tag === "@js" || tag === "js" || tag === "javascript") {
        parser = javascriptLanguage.parser
    } else if (tag === "py" || tag === "pyr" || tag === "python" || tag === "@python") {
        parser = pythonParser
    } else if (tag === "sql") {
        parser = postgresParser
    } else {
        return null
    }

    let overlay = []
    if (node.node.firstChild != null) {
        let last_content_start = string_content_from
        let child = node.node.firstChild.cursor()

        do {
            if (last_content_start !== child.from) {
                overlay.push({ from: last_content_start, to: child.from })
            }
            last_content_start = child.to
        } while (child.nextSibling())
        if (last_content_start < string_content_to) {
            overlay.push({ from: last_content_start, to: string_content_to })
        }
    } else {
        overlay = [{ from: string_content_from, to: string_content_to }]
    }

    // If it is a macro, thus supports interpolations (prefixed strings only have faux-interpolations) but not raw strings (`\n` will be a newline, for the character `\n` you need to do `\\n`)
    // we need to remove `\$` (which should just be `$` in the javascript)
    if (is_macro) {
        overlay = overlayHack(overlay, input)
    }

    // No overlays for markdown yet
    // (They sometimes work, but sometimes also randomly crash when adding an interpolation
    //  I guess this has something to do with the fact that markdown isn't parsed with lezer,
    //  but has some custom made thing that emulates lezer.)
    if ([...MD_TAGS].includes(tag)) {
        return { parser, overlay: [{ from: string_content_from, to: string_content_to }] }
    }

    return { parser, overlay }
})

const julia_mixed = (config) => {
    const julia = julia_andrey(config)
    // @ts-ignore
    julia.language.parser = julia.language.parser.configure({ wrap: juliaWrapper })
    return julia
}

export { julia_mixed, sqlLang, pythonLanguage, javascript, htmlLanguage, javascriptLanguage, python, markdown, html }
