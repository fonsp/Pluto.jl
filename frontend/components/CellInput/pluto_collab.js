import { collab, receiveUpdates, sendableUpdates } from "../../imports/CodemirrorPlutoSetup.js"

function pushUpdates(
  connection,
  version,
  fullUpdates,
) {
  // TODO: New push_updates endpoint

  // Strip off transaction data
  let updates = fullUpdates.map(u => ({
    clientID: u.clientID,
    changes: u.changes.toJSON()
  }))
  return connection.request({type: "pushUpdates", version, updates})
}

function pullUpdates(
  connection,
  version,
) {
  // TODO: Slice from the cell.cm_updates starting at >= version
  return connection.request({type: "pullUpdates", version})
    .then(updates => updates.map(u => ({
      changes: ChangeSet.fromJSON(u.changes),
      clientID: u.clientID
    })))
}

export const pluto_collab = (startVersion, connection) => {
  let plugin = ViewPlugin.fromClass(class {
    pushing = false
    done = false

    constructor(view) { this.view = view; this.pull() }

    update(update) {
      if (update.docChanged) this.push()
    }

    async push() {
      let updates = sendableUpdates(this.view.state)
      if (this.pushing || !updates.length) return
      this.pushing = true
      let version = getSyncedVersion(this.view.state)
      await pushUpdates(connection, version, updates)
      this.pushing = false
      // Regardless of whether the push failed or new updates came in
      // while it was running, try again if there's updates remaining
      if (sendableUpdates(this.view.state).length)
        setTimeout(() => this.push(), 100)
    }

    async pull() {
      while (!this.done) {
        let version = getSyncedVersion(this.view.state)
        let updates = await pullUpdates(connection, version)
        this.view.dispatch(receiveUpdates(this.view.state, updates))
      }
    }

    destroy() { this.done = true }
  })

  return [collab({startVersion}), plugin]
}
