import {
    EditorState,
    EditorSelection,
    Compartment,
    EditorView,
    placeholder,
    julia_legacy,
    julia_andrey as julia_andrey_original,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    StreamLanguage,
    indentMore,
    indentLess,
    tags,
    HighlightStyle,
    autocompletion,
    lineNumbers,
    highlightSpecialChars,
    foldGutter,
    drawSelection,
    indentOnInput,
    defaultHighlightStyle,
    bracketMatching,
    closeBrackets,
    rectangularSelection,
    highlightSelectionMatches,
    closeBracketsKeymap,
    searchKeymap,
    foldKeymap,
    commentKeymap,
    completionKeymap,
    syntaxTree,
    Decoration,
    ViewUpdate,
    ViewPlugin,
    WidgetType,
    Facet,
    StateField,
    StateEffect,
    Transaction,
    SelectionRange,
    indentUnit,
    combineConfig,
    NodeProp,
    parseMixed,
    markdown,
    html,
    htmlLanguage,
    markdownLanguage,
    javascript,
    javascriptLanguage,
    sql,
    PostgreSQL,
    python,
    pythonLanguage,
} from "https://cdn.jsdelivr.net/gh/JuliaPluto/codemirror-pluto-setup@0.19.2/dist/index.es.min.js"

const htmlParser = htmlLanguage.parser
const mdParser = markdownLanguage.parser
const postgresParser = PostgreSQL.language.parser
const sqlLang = sql({ config: { dialect: PostgreSQL } })
const pythonParser = pythonLanguage.parser

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
    } else if (tag === "md" || tag === "mermaid") {
        return {
            parser: mdParser,
            overlay: defaultOverlay,
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

    const overlay = [] //: { from: number, to: number }[] = [];
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
    return { parser, overlay: defaultOverlay }
})

const julia_andrey = julia_andrey_original()

julia_andrey.language.parser = julia_andrey.language.parser.configure({ wrap: juliaWrapper })

export {
    EditorState,
    EditorSelection,
    Compartment,
    EditorView,
    placeholder,
    julia_legacy,
    julia_andrey,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    StreamLanguage,
    indentMore,
    indentLess,
    tags,
    HighlightStyle,
    autocompletion,
    lineNumbers,
    highlightSpecialChars,
    foldGutter,
    drawSelection,
    indentOnInput,
    defaultHighlightStyle,
    bracketMatching,
    closeBrackets,
    rectangularSelection,
    highlightSelectionMatches,
    closeBracketsKeymap,
    searchKeymap,
    foldKeymap,
    commentKeymap,
    completionKeymap,
    syntaxTree,
    Decoration,
    ViewUpdate,
    ViewPlugin,
    WidgetType,
    Facet,
    StateField,
    StateEffect,
    Transaction,
    SelectionRange,
    indentUnit,
    combineConfig,
    NodeProp,
    markdown,
    html,
    javascript,
    javascriptLanguage,
    sqlLang,
    python,
}
