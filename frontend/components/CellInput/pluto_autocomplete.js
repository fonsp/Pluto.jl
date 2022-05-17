import _ from "../../imports/lodash.js"

import { utf8index_to_ut16index } from "../../common/UnicodeTools.js"

import {
    EditorState,
    EditorSelection,
    EditorView,
    keymap,
    indentMore,
    autocomplete,
    syntaxTree,
    StateField,
    StateEffect,
} from "../../imports/CodemirrorPlutoSetup.js"
import { get_selected_doc_from_state } from "./LiveDocsFromCursor.js"
import { cl } from "../../common/ClassTable.js"
import { ScopeStateField } from "./scopestate_statefield.js"

let { autocompletion, completionKeymap, completionStatus, acceptCompletion } = autocomplete

// These should be imported from  @codemirror/autocomplete, but they are not exported.
let completionState = autocompletion()[0]
let applyCompletion = (/** @type {EditorView} */ view, option) => {
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
        if (
            tr.startState.field(completionState, false).open != null &&
            tr.startState.field(completionState, false) !== tr.state.field(completionState, false)
        ) {
            return false
        }
        return value
    },
})

/** @param {EditorView} cm */
const tab_completion_command = (cm) => {
    // This will return true if the autocomplete select popup is open
    if (acceptCompletion(cm)) {
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
    return autocomplete.startCompletion(cm)
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
    acceptCompletion(cm)
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
        // Can't use this yet as it has not enough info to apply the change (source.from and source.to)
        // let selected_completion = autocomplete.selectedCompletion(update.state)

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

/** Are we matching something like `\lambd...`? */
let match_latex_complete = (ctx) => ctx.matchBefore(/\\[^\s"'.`]*/)
/** Are we matching something like `:writing_a_symbo...`? */
let match_symbol_complete = (ctx) => ctx.matchBefore(/\.\:[^\s"'`()\[\].]*/)
/** Are we matching exactly `~/`? */
let match_expanduser_complete = (ctx) => ctx.matchBefore(/~\//)

/** Use the completion results from the Julia server to create CM completion objects, but only for path completions (TODO: broken) and latex completions. */
let julia_special_completions_to_cm = (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) => async (ctx) => {
    let unicode_match = match_latex_complete(ctx) || match_expanduser_complete(ctx)
    if (unicode_match == null) return null

    let to_complete = ctx.state.sliceDoc(0, ctx.pos)
    let { start, stop, results } = await request_autocomplete({ text: to_complete })

    return {
        from: start,
        to: stop,
        // This is an important one when you not only complete, but also replace something.
        // @codemirror/autocomplete automatically filters out results otherwise >:(
        filter: false,
        // TODO Add "detail" that shows the unicode character
        // TODO Add "apply" with the unicode character so it autocompletes that immediately
        options: results.map(([text], i) => {
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

/**
 * @param {Map<String,import("./scopestate_statefield.js").Definition>} definitions
 * @param {Set<String>} proposed
 * @param {number} context_pos
 */
const generate_scopestate_completions = function* (definitions, proposed, context_pos) {
    let i = 0
    for (let [name, { valid_from }] of definitions.entries()) {
        if (!proposed.has(name) && valid_from < context_pos) {
            yield {
                label: name,
                type: "c_Any",
                boost: 99 - i,
            }
            i += 1
        }
    }
}

/** Use the completion results from the Julia server to create CM completion objects. */
const julia_code_completions_to_cm = (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) => async (ctx) => {
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

    const definitions = ctx.state.field(ScopeStateField).definitions
    const proposed = new Set()

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
        // span: RegExp(`^${_.escapeRegExp(ctx.state.sliceDoc(start, stop))}[^\\s"'()\\[\\].{}]*`),
        options: [
            ...results.map(([text, type_description, is_exported, is_from_notebook, completion_type], i) => {
                // (quick) fix for identifiers that need to be escaped
                // Ideally this is done with Meta.isoperator on the julia side
                let text_to_apply = is_field_expression ? override_text_to_apply_in_field_expression(text) ?? text : text

                if (definitions.has(text)) proposed.add(text)

                return {
                    label: text,
                    apply: text_to_apply,
                    type: cl({
                        c_notexported: !is_exported,
                        [`c_${type_description}`]: type_description != null,
                        [`completion_${completion_type}`]: completion_type != null,
                        c_from_notebook: is_from_notebook,
                    }),
                    boost: 50 - i / results.length,
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

            ...Array.from(generate_scopestate_completions(definitions, proposed, ctx.pos)),
        ],
    }
}

const complete_anyword = async (ctx) => {
    const results_from_cm = await autocomplete.completeAnyWord(ctx)
    return {
        from: results_from_cm.from,
        options: results_from_cm.options.map(({ label }, i) => ({
            // See https://github.com/codemirror/codemirror.next/issues/788 about `type: null`
            label,
            apply: label,
            type: null,
            boost: 0 - i,
        })),
    }
}

const local_variables_completion = (ctx) => {
    let scopestate = ctx.state.field(ScopeStateField)
    let unicode = ctx.tokenBefore(["Identifier"])

    if (unicode === null) return null

    let { from, to, text } = unicode

    return {
        from,
        to,
        options: scopestate.locals
            .filter(
                ({ validity, name }) =>
                    name.startsWith(text) /** <- NOTE: A smarter matching strategy can be used here */ && from > validity.from && to <= validity.to
            )
            .map(({ name }, i) => ({
                // See https://github.com/codemirror/codemirror.next/issues/788 about `type: null`
                label: name,
                apply: name,
                type: null,
                boost: 99 - i,
            })),
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
    let last_query = null
    let last_result = null
    /**
     * To make stuff a bit easier, we let all the generators fetch all the time and run their logic, but just do one request.
     * Previously I had checks to make sure when `unicode_hint_generator` matches it wouldn't fetch in `julia_code_completions_to_cm`..
     * but that became cumbersome with `expanduser` autocomplete.. also because THERE MIGHT be a case where
     * `~/` actually needs a different completion? Idk, I decided to put this "memoize last" thing here deal with it.
     * @type {PlutoRequestAutocomplete}
     **/
    let memoize_last_request_autocomplete = async (options) => {
        if (_.isEqual(options, last_query)) {
            return await last_result
        } else {
            last_query = options
            last_result = request_autocomplete(options)
            return await last_result
        }
    }

    return [
        tabCompletionState,
        autocompletion({
            activateOnTyping: false,
            override: [
                julia_special_completions_to_cm(memoize_last_request_autocomplete),
                julia_code_completions_to_cm(memoize_last_request_autocomplete),
                complete_anyword,
                // TODO: Disabled because of performance problems, see https://github.com/fonsp/Pluto.jl/pull/1925. Remove `complete_anyword` once fixed. See https://github.com/fonsp/Pluto.jl/pull/2013
                // local_variables_completion,
            ],
            defaultKeymap: false, // We add these manually later, so we can override them if necessary
            maxRenderedOptions: 512, // fons's magic number
            optionClass: (c) => c.type,
        }),

        // If there is just one autocomplete result, apply it directly
        EditorView.updateListener.of((update) => {
            // AGAIN, can't use this here again, because the currentCompletions *do not contain all the info to apply the completion*
            // let open_completions = autocomplete.currentCompletions(update.state)
            let autocompletion_state = update.state.field(completionState, false)
            let is_tab_completion = update.state.field(tabCompletionState, false)

            if (
                autocompletion_state?.open != null &&
                is_tab_completion &&
                completionStatus(update.state) === "active" &&
                autocompletion_state.open.options.length === 1
            ) {
                // We can't use `acceptCompletion` here because that function has a minimum delay of 75ms between creating the completion options and applying one.
                applyCompletion(update.view, autocompletion_state.open.options[0])
            }
        }),

        EditorView.updateListener.of((update) => {
            for (let transaction of update.transactions) {
                let picked_completion = transaction.annotation(autocomplete.pickedCompletion)
                if (picked_completion) {
                    if (
                        typeof picked_completion.apply === "string" &&
                        picked_completion.apply.endsWith("/") &&
                        picked_completion.type?.match(/(^| )completion_path( |$)/)
                    ) {
                        autocomplete.startCompletion(update.view)
                    }
                }
            }
        }),

        update_docs_from_autocomplete_selection(on_update_doc_query),

        keymap.of(pluto_autocomplete_keymap),
        keymap.of(completionKeymap),
    ]
}
