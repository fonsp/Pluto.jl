import {
    ChangeSet,
    collab,
    Decoration,
    EditorSelection,
    EditorView,
    Facet,
    getSyncedVersion,
    receiveUpdates,
    SelectionRange,
    sendableUpdates,
    StateEffect,
    StateField,
    ViewPlugin,
    ViewUpdate,
} from "../../imports/CodemirrorPlutoSetup.js"
import { html } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"

/**
 *
 * @param {Function} push_updates
 * @param {Number} version
 * @param {Array<any>} fullUpdates
 * @returns {Promise<any>}
 */
function pushUpdates(push_updates, version, fullUpdates) {
    const changes_to_specs = (cs) => {
        const specs = []
        cs.iterChanges((fromA, toA, fromB, toB, insert) => {
            const insertText = insert.sliceString(0, insert.length, "\n")
            if (fromB == toB) {
                specs.push({ from: fromA, to: toA }) // delete
            } else if (fromA == toA) {
                specs.push({ from: fromA, insert: insertText }) // insert
            } else {
                specs.push({ from: fromA, to: toA, insert: insertText }) // replace
            }
        }, false)
        return specs
    }

    // Strip off transaction data
    let updates = fullUpdates.map((u) => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
        effects: u.effects.map((effect) => effect.value.selection.toJSON()),
        specs: changes_to_specs(u.changes),
    }))
    return push_updates({ version, updates })
}

const DEBUG_COLLAB = true

/**
 * @type {Facet<Number>}
 */
export const LastRunVersionFacet = Facet.define({
    combine: (values) => values[0],
})

/**
 * @typedef CarretEffectValue
 * @type {{
 *  selection: EditorSelection,
 *  clientID: string,
 * }}
 */

/** @type {any} */
const CaretEffect = StateEffect.define({
    /**
     * @param {CarretEffectValue} param0
     * @param {ChangeSet} changes
     * @returns {CarretEffectValue}
     */
    map({ selection, clientID }, changes) {
        selection = selection.map(changes)
        return { selection, clientID }
    },
})
const CaretField = StateField.define({
    create() {
        return {}
    },
    update(value, tr) {
        const new_value = { ...value }

        /** @type {StateEffect<CarretEffectValue>[]} */
        const caretEffects = tr.effects.filter((effect) => effect.is(CaretEffect))
        for (let effect of caretEffects) {
            new_value[effect.value.clientID] = effect.value.selection
        }

        return new_value
    },
    provide: (f) =>
        EditorView.decorations.from(f, (/** @type {{[key: string]: EditorSelection}} */ value) => {
            let decorations = []

            for (let selection of Object.values(value)) {
                decorations.push(
                    Decoration.widget({
                        widget: new ReactWidget(
                            html`<span style="display: inline-block; width: 2px; height: 1.0em; cursor: text; background-color: green"></span>`
                        ),
                    }).range(selection.main.head) // Let's assume the remote cursor is here
                )

                for (let range of selection.ranges) {
                    if (range.from != range.to) {
                        decorations.push(Decoration.mark({ class: "cm-remoteSelection" }).range(range.from, range.to))
                    }
                }
            }

            return Decoration.set(decorations, true)
        }),
})

/**
 * @typedef EventHandler
 * @type {{
 *   unsubscribe: () => void,
 * }}
 */

/**
 * @param {number} startVersion
 * @param {{
 *   subscribe_to_updates: (cb: Function) => EventHandler,
 *   push_updates: (updates: Array<any>) => Promise<any>
 * }} param1
 * @returns
 */
export const pluto_collab = (startVersion, { subscribe_to_updates, push_updates }) => {
    let plugin = ViewPlugin.fromClass(
        class {
            pushing = false

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.view = view
                this.handler = subscribe_to_updates((updates) => this.sync(updates))
            }

            update(/** @type ViewUpdate */ update) {
                this.push()
            }

            async push() {
                let updates = sendableUpdates(this.view.state)
                if (this.pushing || !updates.length) {
                    return
                }

                this.pushing = true
                let version = getSyncedVersion(this.view.state)
                await pushUpdates(push_updates, version, updates)
                this.pushing = false

                // Regardless of whether the push failed or new updates came in
                // while it was running, try again if there's updates remaining
                if (sendableUpdates(this.view.state).length) {
                    setTimeout(() => this.push(), 100)
                }
            }

            /**
             * @param {Array<any>} updates
             */
            sync(updates) {
                let version = getSyncedVersion(this.view.state)
                updates = updates.slice(version).map((u) => ({
                    changes: ChangeSet.of(u.specs, u.document_length, "\n"),
                    effects: u.effects.map((selection) => CaretEffect.of({ selection: EditorSelection.fromJSON(selection), clientID: u.client_id })),
                    clientID: u.client_id,
                }))

                if (DEBUG_COLLAB && updates.length) {
                    console.log(`Syncing with ${updates.length} updates`)
                    console.log("Updates = ", updates)
                    console.log(`Version = ${version}`)
                }

                this.view.dispatch(receiveUpdates(this.view.state, updates))

                if (DEBUG_COLLAB && updates.length) {
                    console.log(`Version = ${getSyncedVersion(this.view.state)}`)
                }
            }

            destroy() {
                this.handler.unsubscribe()
            }
        }
    )

    let authorName = Math.random() + "_ok"
    const cursorPlugin = EditorView.updateListener.of((update) => {
        if (!update.selectionSet) {
            return
        }

        const effect = CaretEffect.of({ selection: update.view.state.selection, clientID: authorName })
        update.view.dispatch({
            effects: [effect],
        })
    })

    return [
        collab({ clientID: authorName, startVersion, sharedEffects: (tr) => tr.effects.filter((effect) => effect.is(CaretEffect)) }),
        plugin,
        cursorPlugin,
        CaretField,
    ]
}
