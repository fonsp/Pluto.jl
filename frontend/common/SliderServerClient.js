import { trailingslash } from "./Binder.js"
import { hash_arraybuffer, debounced_promises, base64_arraybuffer } from "./PlutoHash.js"
import { pack, unpack } from "./MsgPack.js"
import immer from "../imports/immer.js"

export const nothing_actions = ({ actions }) => Object.fromEntries(Object.keys(actions).map((k) => [k, () => {}]))

export const slider_server_actions = ({ setStatePromise, launch_params, actions, get_original_state, get_current_state, apply_notebook_patches }) => {
    const notebookfile_hash = fetch(launch_params.notebookfile)
        .then((r) => r.arrayBuffer())
        .then(hash_arraybuffer)

    notebookfile_hash.then((x) => console.log("Notebook file hash:", x))

    const bond_connections = notebookfile_hash
        .then((hash) => fetch(trailingslash(launch_params.slider_server_url) + "bondconnections/" + encodeURIComponent(hash) + "/"))
        .then((r) => r.arrayBuffer())
        .then((b) => unpack(new Uint8Array(b)))

    bond_connections.then((x) => console.log("Bond connections:", x))

    const mybonds = {}
    const bonds_to_set = {
        current: new Set(),
    }
    const request_bond_response = debounced_promises(async () => {
        const base = trailingslash(launch_params.slider_server_url)
        const hash = await notebookfile_hash
        const graph = await bond_connections

        console.groupCollapsed("Requesting bonds", bonds_to_set.current)
        if (bonds_to_set.current.size > 0) {
            const to_send = new Set(bonds_to_set.current)
            bonds_to_set.current.forEach((varname) => (graph[varname] ?? []).forEach((x) => to_send.add(x)))
            bonds_to_set.current = new Set()

            const mybonds_filtered = Object.fromEntries(Object.entries(mybonds).filter(([k, v]) => to_send.has(k)))

            const packed = pack(mybonds_filtered)

            const url = base + "staterequest/" + encodeURIComponent(hash) + "/"

            try {
                const use_get = url.length + (packed.length * 4) / 3 + 20 < 8000

                const response = use_get
                    ? await fetch(url + encodeURIComponent(await base64_arraybuffer(packed)), {
                          method: "GET",
                      })
                    : await fetch(url, {
                          method: "POST",
                          body: packed,
                      })

                const { patches, ids_of_cells_that_ran } = unpack(new Uint8Array(await response.arrayBuffer()))

                await apply_notebook_patches(
                    patches,
                    immer((state) => {
                        const original = get_original_state()
                        ids_of_cells_that_ran.forEach((id) => {
                            state.cell_results[id] = original.cell_results[id]
                        })
                    })
                )(get_current_state())
                console.log("done!")
            } catch (e) {
                console.error(e)
            }
        }

        console.groupEnd()
    })

    return {
        ...nothing_actions({ actions }),
        set_bond: async (symbol, value, is_first_value) => {
            setStatePromise(
                immer((state) => {
                    state.notebook.bonds[symbol] = { value: value }
                })
            )
            if (mybonds[symbol] == null || !_.isEqual(mybonds[symbol].value, value)) {
                mybonds[symbol] = { value: value }
                bonds_to_set.current.add(symbol)
                await request_bond_response()
            }
        },
    }
}
