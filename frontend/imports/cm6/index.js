import { EditorState, EditorSelection, Compartment } from "@codemirror/state"
import { StreamLanguage } from "@codemirror/stream-parser"
import { julia } from "@codemirror/legacy-modes/mode/julia"
import { lineNumbers } from "@codemirror/gutter"
import { keymap, EditorView, highlightSpecialChars, drawSelection, highlightActiveLine } from "@codemirror/view"
import { historyKeymap, history } from "@codemirror/history"
import { defaultKeymap, indentMore, indentLess } from "@codemirror/commands"
import { defaultHighlightStyle } from "@codemirror/highlight"
import { indentOnInput } from "@codemirror/language"
import { rectangularSelection } from "@codemirror/rectangular-selection"
import { foldGutter, foldKeymap } from "@codemirror/fold"
import { bracketMatching } from "@codemirror/matchbrackets"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets"
import { autocompletion } from "@codemirror/autocomplete"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { completionKeymap } from "@codemirror/autocomplete"
import { commentKeymap } from "@codemirror/comment"

const basicSetup = [
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    defaultHighlightStyle.fallback,
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...commentKeymap,
        ...completionKeymap,
        //    ...lint.lintKeymap,
    ]),
]
export {
    EditorState,
    EditorSelection,
    Compartment,
    EditorView,
    basicSetup,
    julia,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    StreamLanguage,
    indentMore,
    indentLess,
}
