import {
    ChangeSet,
    collab,
    EditorView,
    Facet,
    getSyncedVersion,
    receiveUpdates,
    sendableUpdates,
    ViewPlugin,
    ViewUpdate,
    StateEffect,
    StateField,
    EditorSelection,
    Decoration,
    WidgetType,
} from "../../imports/CodemirrorPlutoSetup.js"
import { ReactWidget } from "./ReactWidget.js"
import { html } from "../../imports/Preact.js"
import { PkgStatusMark, PkgActivateMark } from "../PkgStatusMark.js"

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
            } else {
                specs.push({ from: fromA, to: toA, insert: insertText }) // replace/insert
            }
        }, false)
        return specs
    }

    console.log("sending updates", fullUpdates.map(u => u.effects))

    // Strip off transaction data
    let updates = fullUpdates.map((u) => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
        specs: changes_to_specs(u.changes),
        effects: (u.effects ?? []).map((effect) => effect.value.pos),
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

const CursorEffect = StateEffect.define({
    map({ pos, clientID }, changes) {
        pos = changes.mapPos(pos)
        return { pos, clientID }
    }
})
class CursorWidget extends WidgetType {
    toDOM(view) {
        const s = document.createElement("span")
        s.innerText = "salut"
        console.log(s)
        return s
    }
}
const CursorField = StateField.define({
    create(state) {
        return {}
    },
    compare(a, b) {
        return a == b
    },
    update(value, transaction) {
        for (let effect of transaction.effects) {
            if (effect.is(CursorEffect)) {
                const { pos, clientID } = effect.value
                value[clientID] = pos
            }
        }
        return value
    },
    provide: (f) => EditorView.decorations.from(f, (state) => {
        const decorations = Object.keys(state).map((key) => {
            console.log("pos = ", state[key], key)
            return Decoration.widget({
                widget: new ReactWidget(html` <${PkgActivateMark} package_name=${"piza"} /> `),
                side: 1,
            }).range(state[key] + 1)
        })
        console.log({ decorations })
        return Decoration.set(decorations, true)
   })
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
 *   set_code_differs: (differs: boolean) => void,
 *   push_updates: (updates: Array<any>) => Promise<any>
 * }} param1
 * @returns
 */
export const pluto_collab = ({ startVersion, authorName }, { subscribe_to_updates, set_code_differs, push_updates }) => {
    let collab_plugin = ViewPlugin.fromClass(
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
                let version = getSyncedVersion(update.state)
                set_code_differs(version != update.state.facet(LastRunVersionFacet))

                if (update.docChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(CursorEffect)))) this.push()
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
                    clientID: u.client_id,
                    effects: (u.effects ?? []).map((pos) => CursorEffect.of({ pos, clientID: u.client_id, })),
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
    let previous_pos = -1
    const cursor_plugin = EditorView.updateListener.of((update) => {
        if (!update.selectionSet) {
            return
        }

        let new_pos = update.state.selection.main.head
        if (new_pos != previous_pos) {
            previous_pos = new_pos
            const effect = CursorEffect.of({ pos: new_pos, clientID: authorName })
            update.view.dispatch({
                // Use this as the cursor estimation for now
                effects: [effect]
            })
        }
    })

    return [
        cursor_plugin,
        CursorField,
        collab({
            startVersion,
            clientID: authorName,
            sharedEffects: (tr) => {
                let filters = tr.effects.filter((e) => e.is(CursorEffect))
                return filters
            }
        }),
        collab_plugin,
    ]
}
