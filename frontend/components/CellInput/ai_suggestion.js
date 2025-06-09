import { Compartment, merge, StateField, ViewPlugin, ViewUpdate, StateEffect, EditorState, EditorView } from "../../imports/CodemirrorPlutoSetup.js"
import { LastRemoteCodeSetTimeFacet } from "../CellInput.js"

export const start_ai_suggestion = (/** @type {HTMLElement?} */ start_node, detail) =>
    new Promise(async (resolve, reject) => {
        const get_cm = () => start_node?.closest("pluto-cell")?.querySelector("pluto-input > .cm-editor .cm-content")
        const cm = get_cm()

        if (cm) {
            const get_live_cm = () => {
                const cm = get_cm()
                if (cm?.hasAttribute("data-currently-live")) {
                    return cm
                }
                return null
            }

            let live_cm = get_live_cm()
            if (!live_cm) {
                cm.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
            }
            while (!live_cm) {
                await new Promise((resolve) => setTimeout(resolve, 50))
                live_cm = get_live_cm()
            }
            live_cm.dispatchEvent(new CustomEvent("ai-suggestion", { detail }))
            resolve(true)
        } else {
            reject(new Error("Could not find an editor that belongs to this element"))
        }
    })

export const AiSuggestionPlugin = () => {
    const compartment = new Compartment()

    const ai_suggestion_transaction = (/** @type {EditorState} */ state, suggested_code, reject) => {
        const merge_ext = merge.unifiedMergeView({ original: state.doc, gutter: false, allowInlineDiffs: true })

        return reject
            ? state.update({
                  effects: compartment.reconfigure([]),
                  changes: {
                      from: 0,
                      to: state.doc.length,
                      insert: suggested_code,
                  },
              })
            : state.update({
                  effects: [
                      AISuggestionTimeEffect.of(Date.now()),
                      compartment.reconfigure([
                          //
                          merge_ext,
                          AllAccepted,
                          disable_merge_when_all_accepted(compartment),
                          dont_diff_new_changes_ext(),
                      ]),
                  ],
                  changes: {
                      from: 0,
                      to: state.doc.length,
                      insert: suggested_code,
                  },
              })
    }

    const ai_event_listener = EditorView.domEventHandlers({
        "ai-suggestion": (event, view) => {
            console.log("ai-suggestion", event)
            const { code, reject } = event.detail
            const state = view.state
            const tr = ai_suggestion_transaction(state, code, reject)
            view.dispatch(tr)
            return true
        },
    })

    return [AISuggestionTime, ai_event_listener, hello_im_available, compartment.of([])]
}

const hello_im_available = ViewPlugin.define((view) => {
    view.contentDOM.setAttribute("data-currently-live", "true")
    return {}
})

const AllAccepted = StateField.define({
    create: () => false,
    update: (all_accepted, tr) => {
        if (!tr.docChanged) all_accepted
        return merge.getOriginalDoc(tr.state).eq(tr.newDoc)
    },
})

/**
 * @type {any}
 */
const AISuggestionTimeEffect = StateEffect.define()
const AISuggestionTime = StateField.define({
    create: () => 0,
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(AISuggestionTimeEffect)) return effect.value
        }
        return value
    },
})

const disable_merge_when_all_accepted = (/** @type {Compartment} */ compartment) =>
    EditorState.transactionExtender.of((tr) => {
        const code_was_submitted_after_ai_suggestion = tr.startState.field(AISuggestionTime) < tr.startState.facet(LastRemoteCodeSetTimeFacet)

        if (code_was_submitted_after_ai_suggestion || tr.startState.field(AllAccepted)) {
            console.log("disabling merge")
            return {
                effects: [compartment.reconfigure([])],
            }
        }
        return null
    })

// TODO: Ctrl+Z is still broken for this extension
/**
 * An extension to add to the unified merge view. With this extension, when you make edits that are outside one of the existing chunks, no new chunk will be created.
 *
 * How this works: the change will also be mapped to and applied to the original doc, which means that the original doc will be updated to match the editable doc.
 */
const dont_diff_new_changes_ext = () => {
    const VERBOSE = false

    return EditorState.transactionExtender.of((tr) => {
        if (!tr.docChanged) return null
        if (!tr.isUserEvent) return null

        // if (tr.state.doc.toString().includes("alice")) {
        //     if (!merge.getOriginalDoc(tr.state).toString().includes("bob")) {
        //         const doc = merge.getOriginalDoc(tr.state)
        //         const original_changes = EditorState.create({ doc }).changes({ from: 0, to: 0, insert: "bob" })
        //         // return [
        //         //     tr,
        //         return {
        //             effects: merge.originalDocChangeEffect(tr.state, original_changes),
        //         }
        //         // ]
        //     }
        // }
        // return null

        const original_doc = merge.getOriginalDoc(tr.startState)
        const gc = merge.getChunks(tr.startState)
        if (!gc) return null

        const { chunks } = gc
        if (chunks.length === 0) return null

        const in_a_chunk = chunks.some((chunk) => {
            return tr.changes.touchesRange(chunk.fromB, chunk.toB)
        })
        if (VERBOSE) console.log("chunk info:", { tr, chunks, in_a_chunk })
        if (in_a_chunk) return null

        // What changes would be applied to the tr.startState if we rejected all chunks?
        const changespec_from_rejecting_all = chunks.map((chunk) => ({
            from: chunk.fromB,
            to: chunk.toB,
            insert: original_doc.slice(chunk.fromA, chunk.toA),
        }))
        const change_from_rejecting_all = tr.startState.changes(changespec_from_rejecting_all)

        if (VERBOSE) {
            console.log("tr.startState:\n", tr.startState.doc.toString())

            const start_state_after_reject_all = EditorState.create({ doc: tr.startState.doc }).update({
                changes: changespec_from_rejecting_all,
            }).state
            console.log("start_state_after_reject_all:\n", start_state_after_reject_all.doc.toString())
        }

        // We can use this to the `tr.changes` from the editable doc to the merge original doc. (Because they will perfectly map code positions.)
        const changes_mapped_to_original_doc = tr.changes.map(change_from_rejecting_all)
        if (VERBOSE)
            console.log(
                "original_doc after my patch:\n",
                EditorState.create({ doc: original_doc })
                    .update({
                        changes: changes_mapped_to_original_doc,
                    })
                    .state.doc.toString()
            )

        if (VERBOSE) console.log("dispatching dont_diff_new_changes effect")
        return {
            effects: merge.originalDocChangeEffect(tr.startState, changes_mapped_to_original_doc),
        }
    })
}
