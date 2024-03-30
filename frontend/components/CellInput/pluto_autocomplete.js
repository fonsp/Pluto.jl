import _ from "../../imports/lodash.js"

import { EditorView, keymap, autocomplete, syntaxTree, StateField, StateEffect, Transaction } from "../../imports/CodemirrorPlutoSetup.js"
import { get_selected_doc_from_state } from "./LiveDocsFromCursor.js"
import { cl } from "../../common/ClassTable.js"
import { ScopeStateField } from "./scopestate_statefield.js"
import { open_bottom_right_panel } from "../BottomRightPanel.js"
import { ENABLE_CM_AUTOCOMPLETE_ON_TYPE } from "../CellInput.js"
import { GlobalDefinitionsFacet } from "./go_to_definition_plugin.js"

let { autocompletion, completionKeymap, completionStatus, acceptCompletion } = autocomplete

// These should be imported from  @codemirror/autocomplete, but they are not exported.
const completionState = autocompletion()[1]

/** @type {any} */
const TabCompletionEffect = StateEffect.define()
const tabCompletionState = StateField.define({
    create() {
        return false
    },

    update(value, /** @type {Transaction} */ tr) {
        // Tab was pressed
        for (let effect of tr.effects) {
            if (effect.is(TabCompletionEffect)) return true
        }
        if (!value) return false

        let previous_selected = autocomplete.selectedCompletion(tr.startState)
        let current_selected = autocomplete.selectedCompletion(tr.state)

        // Autocomplete window was closed
        if (previous_selected != null && current_selected == null) {
            return false
        }
        if (previous_selected != null && previous_selected !== current_selected) {
            return false
        }
        return value
    },
})

/** @param {EditorView} cm */
const tab_completion_command = (cm) => {
    // This will return true if the autocomplete select popup is open
    // To test the exception sink, uncomment these lines:
    // if (Math.random() > 0.7) {
    //     throw "LETS CRASH THIS"
    // }
    if (acceptCompletion(cm)) {
        return true
    }
    if (cm.state.readOnly) {
        return false
    }

    let selection = cm.state.selection.main
    if (!selection.empty) return false

    let last_char = cm.state.sliceDoc(selection.from - 1, selection.from)
    let last_line = cm.state.sliceDoc(cm.state.doc.lineAt(selection.from).from, selection.from)

    // Some exceptions for when to trigger tab autocomplete
    if ("\t \n=".includes(last_char)) return false
    // ?([1,2], 3)<TAB> should trigger autocomplete
    if (last_char === ")" && !last_line.includes("?")) return false

    cm.dispatch({
        effects: TabCompletionEffect.of(10),
    })
    return autocomplete.startCompletion(cm)
}

// Remove this if we find that people actually need the `?` in their queries, but I very much doubt it.
// (Also because the ternary operator does require a space before the ?, thanks Julia!)
let open_docs_if_autocomplete_is_open_command = (cm) => {
    if (autocomplete.completionStatus(cm.state) != null) {
        open_bottom_right_panel("docs")
        return true
    }
    return false
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

        // Option.source is now the source, we find to find the corresponding ActiveResult
        // https://github.com/codemirror/autocomplete/commit/6d9f24115e9357dc31bc265cd3da7ce2287fdcbd
        const active_result = update.view.state.field(completionState).active.find((a) => a.source == selected_option.source)
        if (!active_result?.from) return // not an ActiveResult instance

        const from = active_result.from,
            to = Math.min(active_result.to, update.state.doc.length)

        // Apply completion to state, which will yield us a `Transaction`.
        // The nice thing about this is that we can use the resulting state from the transaction,
        // without updating the actual state of the editor.
        let result_transaction = update.state.update({
            changes: {
                from,
                to,
                insert: text_to_apply,
            },
        })

        // So we can use `get_selected_doc_from_state` on our virtual state
        let docs_string = get_selected_doc_from_state(result_transaction.state)
        if (docs_string != null) {
            on_update_doc_query(docs_string)
        }
    })
}

/** Are we matching something like `\lambd...`? */
let match_special_symbol_complete = (/** @type {autocomplete.CompletionContext} */ ctx) => ctx.matchBefore(/\\[\d\w_:]*/)
/** Are we matching something like `:writing_a_symbo...`? */
let match_symbol_complete = (/** @type {autocomplete.CompletionContext} */ ctx) => ctx.matchBefore(/\.\:[^\s"'`()\[\].]*/)
/** Are we matching inside a string */
function match_string_complete(ctx) {
    const tree = syntaxTree(ctx.state)
    const node = tree.resolve(ctx.pos)
    if (node == null || (node.name !== "TripleString" && node.name !== "String")) {
        return false
    }
    return true
}

let override_text_to_apply_in_field_expression = (text) => {
    return !/^[@\p{L}\p{Sc}\d_][\p{L}\p{Nl}\p{Sc}\d_!]*"?$/u.test(text) ? (text === ":" ? `:(${text})` : `:${text}`) : null
}

const section_regular = {
    name: "Suggestions",
    header: () => document.createElement("div"),
    rank: 0,
}

const section_operators = {
    name: "Operators",
    rank: 1,
}

const field_rank_heuristic = (text, is_exported) => is_exported * 3 + (/^\p{Ll}/u.test(text) ? 2 : /^\p{Lu}/u.test(text) ? 1 : 0)

const julia_commit_characters = [".", ",", "(", "[", "{"]
const endswith_keyword_regex =
    /(baremodule|begin|break|catch|const|continue|do|else|elseif|end|export|false|finally|for|function|global|if|import|let|local|macro|module|quote|return|struct|true|try|using|while)$/

const validFor = (text) => {
    let expected_char = /[\p{L}\p{Nl}\p{Sc}\d_!]*$/u.test(text)

    return expected_char && !endswith_keyword_regex.test(text)
}

/** Use the completion results from the Julia server to create CM completion objects. */
const julia_code_completions_to_cm =
    (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) => async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        if (writing_variable_name_or_keyword(ctx)) return null
        if (match_special_symbol_complete(ctx)) return null
        if (ctx.tokenBefore(["Number", "Comment", "String", "TripleString"]) != null) return null

        let to_complete = /** @type {String} */ (ctx.state.sliceDoc(0, ctx.pos))

        // Another rough hack... If it detects a `.:`, we want to cut out the `:` so we get all results from julia,
        // but then codemirror will put the `:` back in filtering
        let is_symbol_completion = match_symbol_complete(ctx)
        if (is_symbol_completion) {
            to_complete = to_complete.slice(0, is_symbol_completion.from + 1) + to_complete.slice(is_symbol_completion.from + 2)
        }

        // no path autocompletions
        if (ctx.tokenBefore(["String"]) != null) return null

        const globals = ctx.state.facet(GlobalDefinitionsFacet)
        const is_already_a_global = (text) => text != null && Object.keys(globals).includes(text)

        let found = await request_autocomplete({ text: to_complete })
        if (!found) return null
        let { start, stop, results } = found

        if (is_symbol_completion) {
            // If this is a symbol completion thing, we need to add the `:` back in by moving the end a bit furher
            stop = stop + 1
        }

        // const definitions = ctx.state.field(ScopeStateField).definitions
        // console.debug({ definitions })
        // const proposed = new Set()

        let to_complete_onto = to_complete.slice(0, start)
        let is_field_expression = to_complete_onto.endsWith(".")
        let is_listing_all_fields_of_a_module = is_field_expression && start === stop

        return {
            from: start,
            to: stop,

            // This tells codemirror to not query this function again as long as the string matches the regex.

            // see `is_wc_cat_id_start` in Julia's source for a complete list
            // validFor: /[\p{L}\p{Nl}\p{Sc}\d_!]*$/u,
            validFor,

            commitCharacters: julia_commit_characters,

            options: [
                ...results
                    .filter(([text, _1, _2, is_from_notebook]) => !(is_from_notebook && is_already_a_global(text)))
                    .map(([text, value_type, is_exported, is_from_notebook, completion_type, _ignored], i) => {
                        // (quick) fix for identifiers that need to be escaped
                        // Ideally this is done with Meta.isoperator on the julia side
                        let text_to_apply =
                            completion_type === "method" ? to_complete : is_field_expression ? override_text_to_apply_in_field_expression(text) ?? text : text

                        value_type = value_type === "Function" && text.startsWith("@") ? "Macro" : value_type

                        return {
                            label: text,
                            apply: text_to_apply,
                            type:
                                cl({
                                    c_notexported: !is_exported,
                                    [`c_${value_type}`]: true,
                                    [`completion_${completion_type}`]: true,
                                    c_from_notebook: is_from_notebook,
                                }) ?? undefined,
                            section: section_regular,
                            // detail: completion_type,
                            boost:
                                completion_type === "keyword_argument" ? 7 : is_field_expression ? field_rank_heuristic(text_to_apply, is_exported) : undefined,
                            // boost: 50 - i / results.length,
                        }
                    }),
                // This is a small thing that I really want:
                // You want to see what fancy symbols a module has? Pluto will show these at the very end of the list,
                // for Base there is no way you're going to find them! With this you can type `.:` and see all the fancy symbols.
                // TODO This whole block shouldn't use `override_text_to_apply_in_field_expression` but the same
                //      `Meta.isoperator` thing mentioned above
                ...results
                    .filter(([text]) => is_field_expression && override_text_to_apply_in_field_expression(text) != null)
                    .map(([text, value_type, is_exported], i) => {
                        let text_to_apply = override_text_to_apply_in_field_expression(text) ?? ""

                        return {
                            label: text_to_apply,
                            apply: text_to_apply,
                            type: (is_exported ? "" : "c_notexported ") + (value_type == null ? "" : "c_" + value_type),
                            // boost: -99 - i / results.length, // Display below all normal results
                            section: section_operators,
                            // Non-standard
                            is_not_exported: !is_exported,
                        }
                    }),
            ],
        }
    }

const complete_anyword = async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    if (writing_variable_name_or_keyword(ctx)) return null
    if (match_special_symbol_complete(ctx)) return null
    if (ctx.tokenBefore(["Number", "Comment", "String", "TripleString"]) != null) return null

    const results_from_cm = await autocomplete.completeAnyWord(ctx)
    if (results_from_cm === null) return null

    const last_token = ctx.tokenBefore(["Identifier", "Number"])
    if (last_token == null || last_token.type?.name === "Number") return null

    return {
        from: results_from_cm.from,
        commitCharacters: julia_commit_characters,

        options: results_from_cm.options.map(({ label }, i) => ({
            // See https://github.com/codemirror/codemirror.next/issues/788 about `type: null`
            label,
            apply: label,
            type: undefined,
            section: section_regular,
            // boost: 0 - i,
        })),
    }
}

const from_notebook_type = "c_from_notebook completion_module c_Any"

/**
 * Are we currently writing a variable name? In that case we don't want autocomplete.
 *
 * E.g. `const hel<TAB>` should not autocomplete.
 */
const writing_variable_name_or_keyword = (/** @type {autocomplete.CompletionContext} */ ctx) => {
    let just_finished_a_keyword = ctx.matchBefore(endswith_keyword_regex)

    let after_keyword = ctx.matchBefore(/(catch|local|module|abstract type|struct|macro|const|for|function|let|do) [@\p{L}\p{Nl}\p{Sc}\d_!]*$/u)

    let inside_do_argument_expression = ctx.matchBefore(/do [\(\), \p{L}\p{Nl}\p{Sc}\d_!]*$/u)

    return just_finished_a_keyword || after_keyword || inside_do_argument_expression
}

/** @returns {Promise<autocomplete.CompletionResult?>} */
const global_variables_completion = async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    if (writing_variable_name_or_keyword(ctx)) return null
    if (match_special_symbol_complete(ctx)) return null
    if (ctx.tokenBefore(["Number", "Comment", "String", "TripleString"]) != null) return null

    const globals = ctx.state.facet(GlobalDefinitionsFacet)

    // see `is_wc_cat_id_start` in Julia's source for a complete list
    const there_is_a_dot_before = ctx.matchBefore(/\.[\p{L}\p{Nl}\p{Sc}\d_!]*$/u)
    if (there_is_a_dot_before) return null

    const from_cm = await autocomplete.completeFromList(
        Object.keys(globals).map((label) => {
            return {
                label,
                apply: label,
                type: from_notebook_type,
                section: section_regular,
            }
        })
    )(ctx)
    return from_cm == null
        ? null
        : {
              ...from_cm,
              validFor,
              commitCharacters: julia_commit_characters,
          }
}

const local_variables_completion = (/** @type {autocomplete.CompletionContext} */ ctx) => {
    let scopestate = ctx.state.field(ScopeStateField)
    let unicode = ctx.tokenBefore(["Identifier"])

    if (unicode === null) return null

    let { from, to, text } = unicode

    return {
        from,
        to,
        commitCharacters: julia_commit_characters,
        options: scopestate.locals
            .filter(
                ({ validity, name }) =>
                    name.startsWith(text) /** <- NOTE: A smarter matching strategy can be used here */ && from > validity.from && to <= validity.to
            )
            .map(({ name }, i) => ({
                // See https://github.com/codemirror/codemirror.next/issues/788 about `type: null`
                label: name,
                apply: name,
                type: undefined,
                boost: 99 - i,
            })),
    }
}
const special_latex_examples = ["\\sqrt", "\\pi", "\\approx"]
const special_emoji_examples = ["🐶", "🐱", "🐭", "🐰", "🐼", "🐨", "🐸", "🐔", "🐧"]

const special_symbols_completion = (/** @type {() => Promise<SpecialSymbols?>} */ request_special_symbols) => {
    let found = null

    const get_special_symbols = async () => {
        if (found == null) {
            let data = await request_special_symbols().catch((e) => {
                console.warn("Failed to fetch special symbols", e)
                return null
            })

            if (data != null) {
                const { latex, emoji } = data
                found = [true, false].map((is_inside_string) =>
                    [true, false].flatMap((is_emoji) =>
                        Object.entries(is_emoji ? emoji : latex).map(([label, value]) => {
                            return {
                                label,
                                apply: value != null && (!is_inside_string || is_emoji) ? value : label,
                                detail: value ?? undefined,
                                type: "c_special_symbol",
                                boost: label === "\\in" ? 3 : special_latex_examples.includes(label) ? 2 : special_emoji_examples.includes(value) ? 1 : 0,
                            }
                        })
                    )
                )
            }
        }
        return found
    }

    return async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        if (writing_variable_name_or_keyword(ctx)) return null
        if (!match_special_symbol_complete(ctx)) return null
        if (ctx.tokenBefore(["Number", "Comment"]) != null) return null

        const result = await get_special_symbols()

        let is_inside_string = match_string_complete(ctx)
        return await autocomplete.completeFromList(is_inside_string ? result[0] : result[1])(ctx)
    }
}

const continue_completing_path = EditorView.updateListener.of((update) => {
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
})

/**
 *
 * @typedef PlutoAutocompleteResult
 * @type {[
 * text: string,
 * value_type: string,
 * is_exported: boolean,
 * is_from_notebook: boolean,
 * completion_type: string,
 * special_symbol: string | null,
 * ]}
 *
 * @typedef PlutoAutocompleteResults
 * @type {{ start: number, stop: number, results: Array<PlutoAutocompleteResult> }}
 *
 * @typedef PlutoRequestAutocomplete
 * @type {(options: { text: string }) => Promise<PlutoAutocompleteResults?>}
 *
 * @typedef SpecialSymbols
 * @type {{emoji: Record<string, string>, latex: Record<string, string>}}
 */

/**
 * @param {object} props
 * @param {PlutoRequestAutocomplete} props.request_autocomplete
 * @param {() => Promise<SpecialSymbols?>} props.request_special_symbols
 * @param {(query: string) => void} props.on_update_doc_query
 */
export let pluto_autocomplete = ({ request_autocomplete, request_special_symbols, on_update_doc_query }) => {
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
            let result = await last_result
            if (result != null) return result
        }

        last_query = options
        last_result = request_autocomplete(options)
        return await last_result
    }

    return [
        tabCompletionState,
        autocompletion({
            activateOnTyping: ENABLE_CM_AUTOCOMPLETE_ON_TYPE,
            override: [
                global_variables_completion,
                special_symbols_completion(request_special_symbols),
                julia_code_completions_to_cm(memoize_last_request_autocomplete),
                complete_anyword,
                // TODO: Disabled because of performance problems, see https://github.com/fonsp/Pluto.jl/pull/1925. Remove `complete_anyword` once fixed. See https://github.com/fonsp/Pluto.jl/pull/2013
                // local_variables_completion,
            ],
            defaultKeymap: false, // We add these manually later, so we can override them if necessary
            maxRenderedOptions: 512, // fons's magic number
            optionClass: (c) => c.type ?? "",
        }),

        // continue_completing_path,

        update_docs_from_autocomplete_selection(on_update_doc_query),

        keymap.of(pluto_autocomplete_keymap),
        keymap.of(completionKeymap),
    ]
}
