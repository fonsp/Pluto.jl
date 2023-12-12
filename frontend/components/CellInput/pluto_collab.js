import {
    showTooltip,
    tooltips,
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
    const updates = fullUpdates.map((u) => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
        effects: u.effects.map((effect) => effect.value.selection.toJSON()),
        specs: changes_to_specs(u.changes),
    }))
    return push_updates({ version, updates })
}

const DEBUG_COLLAB = false

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
            EditorView.decorations.compute([f, UsersFacet], (/** @type EditorState */ state) => {
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
 *   get_notebook: () => Notebook,
 *   subscribe_to_updates: (cb: Function) => EventHandler,
 *   push_updates: (updates: Array<any>) => Promise<any>
 *   client_id: string,
 *   cell_id: string,
 * }} param1
 * @returns
 */
export const pluto_collab = (startVersion, { subscribe_to_updates, push_updates, client_id, cell_id }) => {
    const plugin = ViewPlugin.fromClass(
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
                const updates = sendableUpdates(this.view.state)
                if (this.pushing || !updates.length) {
                    return
                }

                this.pushing = true
                const version = getSyncedVersion(this.view.state)
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
                const version = getSyncedVersion(this.view.state)
                this.syncNewUpdates(updates.slice(version))
            }

            /**
             * @param {Array<any>} updates
             */
            syncNewUpdates(newUpdates) {
                const updates = newUpdates.map((u) => ({
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

    const cursorPlugin = EditorView.updateListener.of((update) => {
        if (!update.selectionSet) {
            return
        }

        const effect = CaretEffect.of({ selection: update.view.state.selection, clientID: client_id })
        update.view.dispatch({
            effects: [effect],
        })
    })

    return [
        collab({ clientID: client_id, startVersion, sharedEffects: (tr) => tr.effects.filter((effect) => effect.is(CaretEffect) || effect.is(RunEffect)) }),
        plugin,
        cursorPlugin,
        // tooltips(),
        CaretField(client_id, cell_id),
        CursorField(client_id, cell_id),
    ]
}
