import { ViewPlugin, ChangeSet, getSyncedVersion, collab, receiveUpdates, sendableUpdates, Facet } from "../../imports/CodemirrorPlutoSetup.js"

function pushUpdates(
    connection,
    version,
    fullUpdates,
) {
    // TODO: New push_updates endpoint

    const changes_to_specs = (cs) => {
        const specs = []
        cs.iterChanges((fromA, toA, fromB, toB, insert) => {
            const insertText = insert.sliceString(0, insert.length, '\n')
            if (fromB == toB) {
                specs.push({ from: fromA, to: toA }) // delete
            } else {
                specs.push({ from: fromA, to: toA, insert: insertText }) // replace/insert
            }
        }, false)
        return specs
    }

    // Strip off transaction data
    let updates = fullUpdates.map(u => ({
        client_id: u.clientID,
        document_length: u.changes.desc.length,
        specs: changes_to_specs(u.changes),
    }))
    return connection.send("push_updates", { version, updates })
}

function pullUpdates(
    connection,
    version,
) {
    // TODO: Slice from the cell.cm_updates starting at >= version
    return connection.request({ type: "pullUpdates", version })
        .then(updates => updates.map(u => {
            if (DEBUG_COLLAB) {
                for (let spec of u.specs) {
                    console.log(showSpec(spec))
                }
            }
            return {
                changes: ChangeSet.of(u.specs, u.document_length, "\n"),
                clientID: u.client_id,
            }
        }
        ))
}

function showSpec({ from, to, insert }) {
    if (to === undefined && insert) {
        return `++[${from}]"${insert}"`
    } else if (to !== undefined && insert) {
        return `++[${from}:${to}]"${insert}"`
    } else {
        return `--[${from}:${to}]`
    }
}

const DEBUG_COLLAB = false

export const CollabUpdatesFacet = Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a.length == b.length,
})
export const LastRunVersionFacet = Facet.define({
    combine: (values) => values[0],
})

export const pluto_collab = (startVersion, connection) => {
    let plugin = ViewPlugin.fromClass(class {
        pushing = false
        done = false

        constructor(view) {
            this.view = view
            this.pull()
        }

        update(update) {
            let version = getSyncedVersion(update.state)
            connection.set_code_differs(version != update.state.facet(LastRunVersionFacet))

            if (update.state.facet(CollabUpdatesFacet) !== update.startState.facet(CollabUpdatesFacet)) this.sync()
            if (update.docChanged) this.push()
        }

        async push() {
            let updates = sendableUpdates(this.view.state)
            if (this.pushing || !updates.length) {
                DEBUG_COLLAB && console.log(this.pushing, updates.length)
                return
            }

            this.pushing = true
            let version = getSyncedVersion(this.view.state)
            await pushUpdates(connection, version, updates)
            this.pushing = false

            // await this.sync()

            // Regardless of whether the push failed or new updates came in
            // while it was running, try again if there's updates remaining
            if (sendableUpdates(this.view.state).length) {
                let version = getSyncedVersion(this.view.state)
                DEBUG_COLLAB && console.log("Updates remaining, rescheduling", `Version = ${version}`, sendableUpdates(this.view.state).length, this.pushing, await pullUpdates(connection, version))
                setTimeout(() => this.push(), 100)
                // await this.push();
            }
        }

        async sync() {
            let version = getSyncedVersion(this.view.state)
            let updates = await pullUpdates(connection, version)

            if (DEBUG_COLLAB && updates.length) {
                console.log(`Syncing with ${updates.length} updates`)
                console.log(`Version = ${version}`)
            }

            this.view.dispatch(receiveUpdates(this.view.state, updates))

            if (DEBUG_COLLAB && updates.length) {
                console.log(`Version = ${getSyncedVersion(this.view.state)}`)
            }
        }

        async pull() { }

        // async pull() {
        //   while (!this.done) {
        //       await this.sync()
        //   }
        // }

        destroy() { this.done = true }
    })

    return [collab({ startVersion }), plugin]
}
