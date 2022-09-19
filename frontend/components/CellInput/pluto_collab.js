import { ViewPlugin, ChangeSet, getSyncedVersion, collab, receiveUpdates, sendableUpdates } from "../../imports/CodemirrorPlutoSetup.js"

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
        } else if (insertText.length > 0) {
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
  return connection.request({type: "pullUpdates", version})
        .then(updates => updates.map(u => {
        console.log(updates)
        return {
          changes: ChangeSet.of(u.specs, u.document_length, "\n"),
          clientID: u.client_id,
        }
    }
  ))
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
