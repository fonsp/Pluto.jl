import { EditorState, EditorView, julia_andrey, defaultHighlightStyle } from "../../imports/CodemirrorPlutoSetup.js"
import { pluto_syntax_colors } from "../CellInput.js"

// @ts-ignore
import hljs from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.2.0/build/es/highlight.min.js"

/** @param {HTMLElement} code_element */
export let highlight = (code_element, language) => {
    language = language.toLowerCase()
    language = language === "jl" ? "julia" : language

    if (code_element.children.length === 0) {
        if (language === "julia") {
            const editorview = new EditorView({
                state: EditorState.create({
                    // Remove references to `Main.workspace#xx.` in the docs since
                    // its shows up as a comment and can be confusing
                    doc: code_element.innerText
                        .trim()
                        .replace(/Main.workspace#\d+\./, "")
                        .replace(/Main.workspace#(\d+)/, 'Main.var"workspace#$1"'),

                    extensions: [
                        pluto_syntax_colors,
                        defaultHighlightStyle.fallback,
                        EditorState.tabSize.of(4),
                        // TODO Other languages possibly?
                        language === "julia" ? julia_andrey() : null,
                        EditorView.lineWrapping,
                        EditorView.editable.of(false),
                    ].filter((x) => x != null),
                }),
            })
            code_element.replaceChildren(editorview.dom)
            // Weird hack to make it work inline 🤷‍♀️
            // Probably should be using [HighlightTree](https://codemirror.net/6/docs/ref/#highlight.highlightTree)
            editorview.dom.style.setProperty("display", "inline-flex", "important")
            editorview.dom.style.setProperty("background-color", "transparent", "important")
        } else {
            if (language === "htmlmixed") {
                code_element.classList.remove("language-htmlmixed")
                code_element.classList.add("language-html")
            }
            hljs.highlightElement(code_element)
        }
    }
}
