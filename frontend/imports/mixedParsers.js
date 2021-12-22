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
    julia_andrey_original,
    parseCode,
} from "./CodemirrorPlutoSetup.js"

const htmlParser = htmlLanguage.parser
const mdParser = markdownLanguage.parser
const mdParserExt = markdownLanguage.parser.configure(parseCode({ htmlParser }))
const postgresParser = PostgreSQL.language.parser
const sqlLang = sql({ dialect: PostgreSQL })
const pythonParser = pythonLanguage.parser

const MD_SIMPLE_TAGS = ["md", "mermaid"].flatMap((x) => [x, `@${x}`])
const MD_EXTENDED_TAGS = ["cm", "markdown", "mdx", "mdl", "markdownliteral"].flatMap((x) => [x, `@${x}`])
const juliaWrapper = parseMixed((node, input) => {
    if (!["TripleString", "String", "CommandString"].includes(node.type.name)) {
        return null
    }
    const offset = node.name === "TripleString" ? 3 : 1
    const defaultOverlay = [{ from: node.from + offset, to: Math.min(node.to - offset, input.length) }]

    if (defaultOverlay[0].from >= defaultOverlay[0].to) {
        return null
    }

    //Looking for tag OR MacroIdentifier
    const tagNode = node.node?.prevSibling || node.node?.parent?.prevSibling
    if (!tagNode) {
        // If you can't find a tag node, something is broken in the julia syntax,
        // so parse it as Julia. Probably wrong interpolation!
        return null
    }
    const tag = input.read(tagNode.from, tagNode.to)
    let parser

    if (tag === "@htl") {
        parser = htmlParser
    } else if (tag === "html") {
        return {
            parser: htmlParser,
            overlay: defaultOverlay,
        }
    } else if (MD_SIMPLE_TAGS.includes(tag)) {
        return {
            parser: mdParser,
            overlay: defaultOverlay,
        }
    } else if (MD_EXTENDED_TAGS.includes(tag)) {
        return {
            parser: mdParserExt,
        }
    } else if (tag === "@javascript") {
        return {
            parser: javascriptLanguage.parser,
            overlay: defaultOverlay,
        }
    } else if (tag === "py" || tag === "pyr" || tag === "python") {
        return {
            parser: pythonParser,
            overlay: defaultOverlay,
        }
    } else if (tag === "sql") {
        parser = postgresParser
    } else {
        return null
    }

    let overlay = [] //: { from: number, to: number }[] = [];
    let from = node.from
    for (let child = node.node.firstChild; child !== null && child.to <= node.to; child = child?.nextSibling) {
        overlay.push({ from, to: child.from })
        from = child.to
    }

    if (overlay.length === 0 || node.node.firstChild === null) {
        return { parser }
    }
    overlay.push({ from, to: node.to })
    // TODO: replace $() from overlays - add placeholder??
    // Remove quotes from strings
    if (node.type.name === "TripleString") {
        // Triple Quote String
        overlay[0].from += 3
        overlay[overlay.length - 1].to -= 3
    } else {
        // Single quote string
        overlay[0].from += 1
        overlay[overlay.length - 1].to -= 1
    }
    // If javascript, we want to unescape some characters
    // Until the parser is smarter, we remove the selection from the syntax highlighting overlay.
    if (["@htl", "@javascript", ...MD_EXTENDED_TAGS].includes(tag)) {
        overlay = overlay.flatMap(({ from, to }) => {
            const text = input.read(from, to)
            const newlines = [...text.matchAll(/\\n/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
            const escdollars = [...text.matchAll(/\\\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 1 }))
            const escjuliadollars = [...text.matchAll(/[^\\]\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
            const extraOverlaysNegatives = _.sortBy([...newlines, ...escdollars, ...escjuliadollars], "from")

            const result = []
            let f = from,
                t = to
            extraOverlaysNegatives.forEach(({ from: newFrom, to: newTo }) => {
                result.push({ from: f, to: newFrom })
                f = newTo
            })
            result.push({ from: f, to: t })
            // console.log(result, { from, to }, result.map(({ from, to }) => input.read(from, to)).join(" - "))
            return result
        })
    }

    return { parser, overlay }
})

const julia_andrey = julia_andrey_original()

julia_andrey.language.parser = julia_andrey.language.parser.configure({ wrap: juliaWrapper })

export { julia_andrey, sqlLang, pythonLanguage, javascript, htmlLanguage, javascriptLanguage, python, markdown, html }
