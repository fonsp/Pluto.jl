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
} from "../../imports/CodemirrorPlutoSetup.js"

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

    // Strip off transaction data
    let updates = fullUpdates.map((u) => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
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
export const pluto_collab = (startVersion, { subscribe_to_updates, set_code_differs, push_updates }) => {
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
                let version = getSyncedVersion(update.state)
                set_code_differs(version != update.state.facet(LastRunVersionFacet))

                if (update.docChanged) this.push()
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

    return [collab({ startVersion }), plugin]
}
