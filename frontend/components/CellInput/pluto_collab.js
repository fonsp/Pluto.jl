import {
    showTooltip,
    Facet,
    ChangeSet,
    collab,
    Decoration,
    EditorSelection,
    EditorView,
    getSyncedVersion,
    receiveUpdates,
    sendableUpdates,
    StateEffect,
    StateField,
    ViewPlugin,
} from "../../imports/CodemirrorPlutoSetup.js"
import { html } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"

/**
 * @typedef Delta
 * @type{{insert?: string, retain?: number, delete?: number}}
 **/

/**
 * @param {Array<Delta>} ops
 * @returns {Array<{ from: number, to?: number, insert?: string }>}
 **/
const delta_to_specs = (ops) => {
    const specs = []

    let current_offset = 0 // <- offset in text before
    for (const op of ops) {
        if (typeof op.retain === "number") {
            current_offset += op.retain
        } else if (typeof op.delete === "number") {
            specs.push({ from: current_offset, to: current_offset + op.delete })
            current_offset += op.delete
        } else {
            specs.push({ from: current_offset, insert: op.insert })
        }
    }

    return specs
}

/**
 * @param {ChangeSet} cs
 * @returns {Array<Delta>}
 **/
const changeset_to_delta = (cs) => {
    const ops = []
    let current_offset = 0
    cs.iterChanges((fromA, toA, fromB, toB, insert) => {
        const insertText = insert.sliceString(0, insert.length, "\n")
        if (current_offset < fromA) {
            ops.push({ retain: fromA - current_offset })
        }
        if (fromB == toB) {
            ops.push({ delete: toA - fromA })
        } else if (fromA == toA) {
            ops.push({ insert: insertText })
        } else {
            ops.push({ delete: toA - fromA })
            ops.push({ insert: insertText })
        }
        current_offset = toA
    }, false)
    return ops
}

/**
 * @param {string} cell_id
 * @param {Number} version
 * @param {Array<any>} fullUpdates
 * @returns {{cell_id: string, version: number, updates: Array<any>}}
 */
function makeUpdates(cell_id, version, fullUpdates) {
    // Strip off transaction data
    const updates = fullUpdates.map((u) => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
        effects: ENABLE_EFFECTS ? u.effects.map((effect) => effect.value.selection.toJSON()) : undefined,
        ops: changeset_to_delta(u.changes),
    }))
    return { cell_id, version, updates }
}

const DEBUG_COLLAB = false
// set to true for cursor sharing (TODO: on the backend)
const ENABLE_EFFECTS = false

/**
 * @typedef CarretEffectValue
 * @type {{
 *  selection: EditorSelection,
 *  clientID: string,
 * }}
 */

export const RunEffect = StateEffect.define()

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

export const UsersFacet = Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b, // <-- TODO: not very performant
})

/** Shows the name of client on top of its cursor */
const CursorField = (client_id, cell_id) =>
    StateField.define({
        create: () => [],
        update(tooltips, tr) {
            const users = tr.state.facet(UsersFacet)
            const seen = new Set()
            const newTooltips = tr.effects
                .filter((effect) => {
                    const clientID = effect.value.clientID
                    if (!users[clientID]?.focused_cell || users[clientID]?.focused_cell != cell_id) return false
                    if (effect.is(CaretEffect) && clientID != client_id && !seen.has(clientID)) {
                        // TODO: still not in sync with caret
                        seen.add(clientID)
                        return true
                    }
                    return false
                })
                .map((effect) => ({
                    pos: effect.value.selection.main.head,
                    hover: true,
                    above: true,
                    strictSide: true,
                    arrow: false,
                    create: () => {
                        const dom = document.createElement("div")
                        dom.className = "cm-tooltip-remoteClientID"
                        dom.textContent = users[effect.value.clientID]?.name || effect.value.clientID
                        return { dom }
                    },
                }))
            return newTooltips
        },
        provide: (f) => showTooltip.computeN([f, UsersFacet], (state) => state.field(f)),
    })

/** Shows cursor and selection of user */
const CaretField = (client_id, cell_id) =>
    StateField.define({
        create: () => ({}),
        update(value, tr) {
            const users = tr.state.facet(UsersFacet)
            const new_value = {}

            for (const clientID of Object.keys(value)) {
                const client_cell = users[clientID]?.focused_cell
                if (client_cell && client_cell == cell_id) {
                    new_value[clientID] = value[clientID]
                }
            }

            /** @type {StateEffect<CarretEffectValue>[]} */
            const caretEffects = tr.effects.filter((effect) => effect.is(CaretEffect))
            for (const effect of caretEffects) {
                const clientID = effect.value.clientID
                if (clientID == client_id) continue // don't show our own cursor
                const client_cell = users[clientID]?.focused_cell
                if (!client_cell || client_cell != cell_id) continue // only show when focusing this cell
                if (clientID) new_value[clientID] = { selection: effect.value.selection, color: users[clientID]?.color ?? "#ff00aa" }
            }

            return new_value
        },
        provide: (f) =>
            EditorView.decorations.compute([f, UsersFacet], (/** @type {import("../../imports/CodemirrorPlutoSetup.js").EditorState} */ state) => {
                const value = state.field(f)
                const decorations = []

                for (const { selection, color } of Object.values(value)) {
                    decorations.push(
                        Decoration.widget({
                            widget: new ReactWidget(html`<span style=${`border-color: ${color};`} class="cm-remoteCaret"></span>`),
                        }).range(selection.main.head) // Let's assume the remote cursor is here
                    )

                    for (const range of selection.ranges) {
                        if (range.from != range.to) {
                            decorations.push(
                                Decoration.mark({ class: "cm-remoteSelection", attributes: { style: `background-color: ${color};` } }).range(
                                    range.from,
                                    range.to
                                )
                            )
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
 *   client_id: string,
 *   cell_id: string,
 *   pluto_actions: any,
 * }} param1
 * @returns
 */
export const pluto_collab = (startVersion, { pluto_actions, cell_id, client_id }) => {
    const plugin = ViewPlugin.fromClass(
        class {
            pushing = false

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.view = view
                // this.handler = subscribe_to_updates((updates) => this.sync(updates))
                pluto_actions.register_collab_plugin(cell_id, this)
            }

            update(/** @type import("../../imports/CodemirrorPlutoSetup.d.ts").ViewUpdate */ update) {
                if (update.docChanged) // NOTE: remove this to have cursor sync
                    this.push()
            }

            makeUpdate() {
                /** @type any */
                const updates = sendableUpdates(this.view.state)
                const version = getSyncedVersion(this.view.state)
                return makeUpdates(cell_id, version, updates)
            }

            async push() {
                /** @type any */
                const updates = sendableUpdates(this.view.state)
                if (this.pushing || !updates.length) {
                    return
                }

                this.pushing = true
                const version = getSyncedVersion(this.view.state)
                await pluto_actions.push_updates(makeUpdates(cell_id, version, updates))
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
                const version = getSyncedVersion(this.view.state)
                this.syncNewUpdates(updates.slice(version))
            }

            /**
             * @param {Array<any>} newUpdates
             */
            syncNewUpdates(newUpdates) {
                const updates = newUpdates.map((u) => ({
                    changes: ChangeSet.of(delta_to_specs(u.ops), u.document_length, "\n"),
                    effects:
                        ENABLE_EFFECTS ?
                            u.effects.map((selection) => CaretEffect.of({ selection: EditorSelection.fromJSON(selection), clientID: u.client_id })) : undefined,
                    clientID: u.client_id,
                }))

                if (DEBUG_COLLAB && updates.length) {
                    console.log(`Syncing with ${updates.length} updates`)
                    console.log("Updates = ", updates)
                }

                this.view.dispatch(receiveUpdates(this.view.state, updates))

                if (DEBUG_COLLAB && updates.length) {
                    console.log(`Version = ${getSyncedVersion(this.view.state)}`)
                }
            }

            destroy() {
                pluto_actions.unregister_collab_plugin(cell_id)
            }
        }
    )

    // const cursorPlugin = EditorView.updateListener.of((update) => {
    //     if (!update.selectionSet) {
    //         return
    //     }

    //     const effect = CaretEffect.of({ selection: update.view.state.selection, clientID: client_id })
    //     update.view.dispatch({
    //         effects: [effect],
    //     })
    // })

    return [
        collab({
            clientID: client_id, startVersion,
            // sharedEffects: (tr) => tr.effects.filter((effect) => effect.is(CaretEffect) || effect.is(RunEffect)),
        }),
        plugin,
        // cursorPlugin,
        // tooltips(),
        // CaretField(client_id, cell_id),
        // CursorField(client_id, cell_id),
    ]
}
