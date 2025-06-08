import { Compartment, merge, StateField, ViewPlugin, ViewUpdate, StateEffect, EditorState, EditorView } from "../../imports/CodemirrorPlutoSetup.js"
import { LastRemoteCodeSetTimeFacet } from "../CellInput.js"

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
                          merge_ext,
                          AllAccepted,
                          disable_merge_when_all_accepted(compartment),
                          // dont_diff_new_changes_ext(),
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
            refresh_view(view)
            return true
        },
    })

    return [AISuggestionTime, ai_event_listener, compartment.of([])]
}

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
        const code_was_submitted_after_ai_suggestion = tr.state.field(AISuggestionTime) < tr.state.facet(LastRemoteCodeSetTimeFacet)
        if (code_was_submitted_after_ai_suggestion || tr.state.field(AllAccepted)) {
            console.log("disabling merge")
            return {
                effects: [compartment.reconfigure([])],
            }
        }
        return null
    })

/**
 * Hack, hopefully we can remove this one day.
 */
const refresh_view = (/** @type {EditorView} */ view) => {
    view.dispatch({
        changes: { from: 0, to: 1, insert: view.state.sliceDoc(0, 1) },
    })
}

// Broken :((((
const dont_diff_new_changes_ext = () => {
    let _refresh = () => {}

    const te = EditorState.transactionExtender.of((tr) => {
        if (!tr.docChanged) return null

        if (!tr.isUserEvent) return null

        // if (tr.state.doc.toString().includes("alice")) {
        //     if (!merge.getOriginalDoc(tr.state).toString().includes("bob")) {
        //         const doc = merge.getOriginalDoc(tr.state)
        //         const original_changes = EditorState.create({ doc }).changes({ from: 0, to: 0, insert: "bob" })
        //         // Some dummy changes to make the editor think it's different
        //         // TODO length > 1
        //         _refresh()
        //         return {
        //             effects: merge.originalDocChangeEffect(tr.state, original_changes),
        //         }
        //     }
        // }
        // return null

        const gc = merge.getChunks(tr.startState)
        if (!gc) return null

        const { chunks } = gc

        // const changespec_from_reverting_all = [
        //     {from: 0, to: 1, insert: ""}
        // ]
        const changespec_from_reverting_all = chunks.map((chunk) => ({
            from: chunk.fromB,
            to: chunk.toB,
            insert: "x".repeat(chunk.toA - chunk.fromA),
        }))

        // const before_state = EditorState.create({ doc: merge.getOriginalDoc(tr.startState) })
        const before_state = tr.startState
        console.log("before_state:\n", before_state.doc.toString())

        const change_from_reverting_cell = before_state.changes(changespec_from_reverting_all)

        const new_before_state = EditorState.create({ doc: before_state.doc }).update({
            changes: changespec_from_reverting_all,
        }).state
        console.log("new_before_state:\n", new_before_state.doc.toString())

        const changes_mapped_to_original_doc = tr.changes.map(change_from_reverting_cell)
        const original_doc = merge.getOriginalDoc(tr.state)
        console.log(
            "original_doc after my patch:\n",
            EditorState.create({ doc: original_doc })
                .update({
                    changes: changes_mapped_to_original_doc,
                })
                .state.doc.toString()
        )

        const in_a_chunk = chunks.some((chunk) => {
            return tr.changes.touchesRange(chunk.fromA, chunk.toA)
        })
        console.log("change in chunk:", { tr, chunks, in_a_chunk })

        if (!in_a_chunk) {
            console.log("dispatching dont_diff_new_changes effect")
            // _refresh()
            return {
                effects: merge.originalDocChangeEffect(tr.state, changes_mapped_to_original_doc),
            }
        }
        return null
    })

    return ViewPlugin.define(
        (view) => {
            _refresh = () => {
                console.log("refreshing")
                requestAnimationFrame(() => {
                    refresh_view(view)
                })
            }
            return {}
        },

        {
            provide: () => [te],
        }
    )
}
