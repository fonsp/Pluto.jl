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
} from "https://cdn.jsdelivr.net/gh/JuliaPluto/codemirror-pluto-setup@e27d21e/dist/index.es.min.js"

const htmlParser = htmlLanguage.parser
const mdParser = markdownLanguage.parser
const wrapper = parseMixed((node, input) => {
    if (node.type.id !== 69 && node.type.id !== 68 /* TemplateString */) {
        return null
    }
    //Looking for tag OR MacroIdentifier 
    const tagNode = node.node.prevSibling || node.node.parent.prevSibling
    console.log(input.read(tagNode.from, tagNode.to))
    const tag = input.read(tagNode.from, tagNode.to)
    console.log({...node}, {...input}, node.type.name, node.type.id, node.from, node.to)
    console.log(tag)
    let parser

    if (tag === "html" || tag === "@htl") {
        parser = htmlParser
    } else if (tag === "md") {
        parser = mdParser
        console.log("going for markdown")
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

    console.log(overlay)
    return { parser, overlay: overlay }
})

const id = julia_andrey_original()

id.language.parser = id.language.parser.configure({ wrap: wrapper })
const julia_andrey = () => id
console.log(id)

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
}
