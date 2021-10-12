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
    PostgreSQL
} from "https://cdn.jsdelivr.net/gh/JuliaPluto/codemirror-pluto-setup@32e0fbb/dist/index.es.min.js"

const htmlParser = htmlLanguage.parser
const mdParser = markdownLanguage.parser
const postgresParser = PostgreSQL.language.parser
const sqlLang = sql({config: {dialect: PostgreSQL}})

const juliaWrapper = parseMixed((node, input) => {
    if (node.type.id < 68 && node.type.id > 71 /* Strings */) {
        return null
    }
    //Looking for tag OR MacroIdentifier 
    const tagNode = node.node?.prevSibling || node.node?.parent?.prevSibling
    if (!tagNode){
        // If you can't find a tag node, something is broken in the julia syntax,
        // so parse it as Julia. Probably wrong interpolation!
        return null
    }
    const tag = input.read(tagNode.from, tagNode.to)
    let parser

    if (tag === "@htl") {
        parser = htmlParser
    } else if (tag === "html" ) {
        return {
            parser: htmlParser
        }
    } else if (tag === "md") {
        return {
            parser: mdParser
        }
    } else if (tag === "sql"){
        parser = postgresParser
    } else {
        return null
    }

    const overlay = [] //: { from: number, to: number }[] = [];
    let from = node.from
    console.log(node.node.firstChild)
    for (let child = node.node.firstChild; child !== null; child = child?.nextSibling) {
        overlay.push({ from, to: child.from })
        from = child.to
    }

    if (overlay.length === 0) {
        return { parser }
    }

    overlay.push({ from, to: node.to })

    // TODO: replace $() from overlays - add placeholder??
    // Remove quotes from strings
    if(node.type.id === 69){ // Triple Quote String
        overlay[0].from += 3
        overlay[overlay.length - 1].to -= 3
    }
    if(node.type.id === 68){ // Single quote string
        overlay[0].from += 1
        overlay[overlay.length - 1].to -= 1
    }
    // console.log(">>> ", overlay.map(({from, to}) => input.read(from, to)).join(""))
    return { parser, overlay: overlay }
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
    sqlLang
}
