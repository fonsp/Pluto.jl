import _ from "../../imports/lodash.js"

import { utf8index_to_ut16index } from "../../common/UnicodeTools.js"

import {
    EditorState,
    EditorSelection,
    EditorView,
    keymap,
    indentMore,
    autocompletion,
    completionKeymap,
    syntaxTree,
    StateField,
    StateEffect,
} from "../../imports/CodemirrorPlutoSetup.js"
import { get_selected_doc_from_state } from "./LiveDocsFromCursor.js"
import { cl } from "../../common/ClassTable.js"

// These should be imported from  @codemirror/autocomplete
let completionState = autocompletion()[0]
let start_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Ctrl-Space").run
let select_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Enter")
let acceptCompletion = (/** @type {EditorView} */ view, option) => {
    let apply = option.completion.apply || option.completion.label
    let result = option.source
    if (typeof apply == "string") {
        view.dispatch({
            changes: { from: result.from, to: result.to, insert: apply },
            selection: { anchor: result.from + apply.length },
            userEvent: "input.complete",
        })
    } else {
        apply(view, option.completion, result.from, result.to)
    }
}

/** @type {any} */
const TabCompletionEffect = StateEffect.define()
const tabCompletionState = StateField.define({
    create() {
        return false
    },

    update(value, tr) {
        // Tab was pressed
        for (let effect of tr.effects) {
            if (effect.is(TabCompletionEffect)) return true
        }
        // Autocomplete window was closed
        if (tr.startState.field(completionState, false)?.open != null && tr.state.field(completionState, false)?.open == null) {
            return false
        }
        return value
    },
})

/** @param {EditorView} cm */
const tab_completion_command = (cm) => {
    // This will return true if the autocomplete select popup is open
    if (select_autocomplete_command.run(cm)) {
        return true
    }

    let selection = cm.state.selection.main
    let last_char = cm.state.sliceDoc(selection.from - 1, selection.from)

    if (!selection.empty) return false
    // Some exceptions for when to trigger tab autocomplete
    if (/^(\t| |\n|\=|\)|)$/.test(last_char)) return false

    cm.dispatch({
        effects: TabCompletionEffect.of(10),
    })
    return start_autocomplete_command(cm)
}

// Remove this if we find that people actually need the `?` in their queries, but I very much doubt it.
// (Also because the ternary operator does require a space before the ?, thanks Julia!)
let open_docs_if_autocomplete_is_open_command = (cm) => {
    let autocompletion_open = cm.state.field(completionState, false)?.open ?? false
    if (autocompletion_open) {
        window.dispatchEvent(new CustomEvent("open_live_docs"))
        return true
    }
}

/** @param {EditorView} cm */
let complete_and_also_type = (cm) => {
    // Possibly autocomplete
    select_autocomplete_command.run(cm)
    // And then do nothing, in the hopes that codemirror will add whatever we typed
    return false
}

const pluto_autocomplete_keymap = [
    { key: "Tab", run: tab_completion_command },
    { key: "?", run: open_docs_if_autocomplete_is_open_command },
    { key: ".", run: complete_and_also_type },
]

/**
 * @param {(query: string) => void} on_update_doc_query
 */
let update_docs_from_autocomplete_selection = (on_update_doc_query) => {
    return EditorView.updateListener.of((update) => {
        let autocompletion_state = update.state.field(completionState, false)
        let open_autocomplete = autocompletion_state?.open
        if (open_autocomplete == null) return

        let selected_option = open_autocomplete.options[open_autocomplete.selected]
        let text_to_apply = selected_option.completion.apply ?? selected_option.completion.label
        if (typeof text_to_apply !== "string") return

        // Apply completion to state, which will yield us a `Transaction`.
        // The nice thing about this is that we can use the resulting state from the transaction,
        // without updating the actual state of the editor.
        let result_transaction = update.state.update({
            changes: { from: selected_option.source.from, to: selected_option.source.to, insert: text_to_apply },
        })

        // So we can use `get_selected_doc_from_state` on our virtual state
        let docs_string = get_selected_doc_from_state(result_transaction.state)
        if (docs_string != null) {
            on_update_doc_query(docs_string)
        }
    })
}

// TODO Maybe use this again later?
// const no_autocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|"

let match_unicode_complete = (ctx) => ctx.matchBefore(/\\[^\s"'.`]*/)
let match_symbol_complete = (ctx) => ctx.matchBefore(/\.\:[^\s"'`()\[\].]*/)

let unicode_hint_generator = (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) => async (ctx) => {
    let unicode_match = match_unicode_complete(ctx)
    if (unicode_match == null) return null

    let message = await request_autocomplete({ text: unicode_match.text })

    return {
        from: unicode_match.from,
        to: unicode_match.to,
        // This is an important one when you not only complete, but also replace something.
        // @codemirror/autocomplete automatically filters out results otherwise >:(
        filter: false,
        // TODO Add "detail" that shows the unicode character
        // TODO Add "apply" with the unicode character so it autocompletes that immediately
        options: message.results.map(([text], i) => {
            return {
                label: text,
            }
        }),
        // TODO Do something docs_prefix ish when we also have the apply text
    }
}

let override_text_to_apply_in_field_expression = (text) => {
    return !/^[@a-zA-Z_][a-zA-Z0-9!_]*\"?$/.test(text) ? (text === ":" ? `:(${text})` : `:${text}`) : null
}

const juliahints_cool_generator = (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) => async (ctx) => {
    // Let the unicode source handle "\..." completions
    // - Putting it in a separate function so to maybe optimise it with local options later (all unicode symbols could be loaded at startup)
    //   And possibly we want to show unicode AND extra symbols later
    if (match_unicode_complete(ctx)) return null

    let to_complete = ctx.state.sliceDoc(0, ctx.pos)

    // Another rough hack... If it detects a `.:`, we want to cut out the `:` so we get all results from julia,
    // but then codemirror will put the `:` back in filtering
    let is_symbol_completion = match_symbol_complete(ctx)
    if (is_symbol_completion) {
        to_complete = to_complete.slice(0, is_symbol_completion.from + 1) + to_complete.slice(is_symbol_completion.from + 2)
    }

    let { start, stop, results } = await request_autocomplete({ text: to_complete })

    if (is_symbol_completion) {
        // If this is a symbol completion thing, we need to add the `:` back in by moving the end a bit furher
        stop = stop + 1
    }

    let to_complete_onto = to_complete.slice(0, start)
    let is_field_expression = to_complete_onto.slice(-1) === "."
    return {
        from: start,
        to: stop,

        // This tells codemirror to not query this function again as long as the string
        // we are completing has the same prefix as we complete now, and there is no weird characters (subjective)
        // e.g. Base.ab<TAB>, will create a regex like /^ab[^weird]*$/, so when now typing `s`,
        //      we'll get `Base.abs`, it finds the `abs` matching our span, and it will filter the existing results.
        //      If we backspace however, to `Math.a`, `a` does no longer match! So it will re-query this function.
        span: RegExp(`^${_.escapeRegExp(ctx.state.sliceDoc(start, stop))}[^\\s"'()\\[\\].{}]*`),
        options: [
            ...results.map(([text, type_description, is_exported, is_from_notebook, completion_type], i) => {
                // (quick) fix for identifiers that need to be escaped
                // Ideally this is done with Meta.isoperator on the julia side
                let text_to_apply = is_field_expression ? override_text_to_apply_in_field_expression(text) ?? text : text
                return {
                    label: text,
                    apply: text_to_apply,
                    type: cl({
                        c_notexported: !is_exported,
                        [`c_${type_description}`]: type_description != null,
                        [`completion_${completion_type}`]: completion_type != null,
                        c_from_notebook: is_from_notebook,
                    }),
                    boost: 99 - i / results.length,
                }
            }),
            // This is a small thing that I really want:
            // You want to see what fancy symbols a module has? Pluto will show these at the very end of the list,
            // for Base there is no way you're going to find them! With this you can type `.:` and see all the fancy symbols.
            // TODO This whole block shouldn't use `override_text_to_apply_in_field_expression` but the same
            //      `Meta.isoperator` thing mentioned above
            ...results
                .filter(([text]) => is_field_expression && override_text_to_apply_in_field_expression(text) != null)
                .map(([text, type_description, is_exported], i) => {
                    let text_to_apply = override_text_to_apply_in_field_expression(text)

                    return {
                        label: text_to_apply,
                        apply: text_to_apply,
                        type: (is_exported ? "" : "c_notexported ") + (type_description == null ? "" : "c_" + type_description),
                        boost: -99 - i / results.length, // Display below all normal results
                        // Non-standard
                        is_not_exported: !is_exported,
                    }
                }),
        ],
    }
}

/**
 * @typedef PlutoAutocompleteResults
 * @type {{ start: number, stop: number, results: Array<[string, (string | null), boolean, boolean, (string | null)]> }}
 *
 * @typedef PlutoRequestAutocomplete
 * @type {(options: { text: string }) => Promise<PlutoAutocompleteResults>}
 */

/**
 * @param {object} props
 * @param {PlutoRequestAutocomplete} props.request_autocomplete
 * @param {(query: string) => void} props.on_update_doc_query
 */
export let pluto_autocomplete = ({ request_autocomplete, on_update_doc_query }) => {
    return [
        tabCompletionState,
        autocompletion({
            activateOnTyping: false,
            override: [
                unicode_hint_generator(request_autocomplete),
                juliahints_cool_generator(request_autocomplete),
                // TODO completion for local variables
            ],
            defaultKeymap: false, // We add these manually later, so we can override them if necessary
            maxRenderedOptions: 512, // fons's magic number
            optionClass: (c) => c.type,
        }),

        // If there is just one autocomplete result, apply it directly
        EditorView.updateListener.of((update) => {
            let autocompletion_state = update.state.field(completionState, false)
            let is_tab_completion = update.state.field(tabCompletionState, false)

            if (autocompletion_state?.open != null && is_tab_completion && autocompletion_state.open.options.length === 1) {
                acceptCompletion(update.view, autocompletion_state.open.options[0])
            }
        }),

        update_docs_from_autocomplete_selection(on_update_doc_query),

        keymap.of(pluto_autocomplete_keymap),
        keymap.of(completionKeymap),
    ]
}
