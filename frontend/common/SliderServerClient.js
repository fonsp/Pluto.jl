import { trailingslash } from "./Binder.js"
import { plutohash_arraybuffer, debounced_promises, base64url_arraybuffer } from "./PlutoHash.js"
import { pack, unpack } from "./MsgPack.js"
import immer from "../imports/immer.js"
import _ from "../imports/lodash.js"

const assert_response_ok = (/** @type {Response} */ r) => (r.ok ? r : Promise.reject(r))

const actions_to_keep = ["get_published_object", "get_notebook"]

const get_start = (graph, v) => Object.values(graph).find((node) => Object.keys(node.downstream_cells_map).includes(v))?.cell_id
const get_starts = (graph, vars) => new Set([...vars].map((v) => get_start(graph, v)))
const recursive_dependencies = (graph, starts) => {
    const deps = new Set(starts)
    const ends = [...starts]
    while (ends.length > 0) {
        const node = ends.splice(0, 1)[0]
        _.flatten(Object.values(graph[node].downstream_cells_map)).forEach((child) => {
            if (!deps.has(child)) {
                ends.push(child)
                deps.add(child)
            }
        })
    }
    return deps
}

export const nothing_actions = ({ actions }) =>
    Object.fromEntries(
        Object.entries(actions).map(([k, v]) => [
            k,
            actions_to_keep.includes(k)
                ? // the original action
                  v
                : // a no-op action
                  (...args) => {
                      console.info("Ignoring action", k, { args })
                  },
        ])
    )

export const slider_server_actions = ({ setStatePromise, launch_params, actions, get_original_state, get_current_state, apply_notebook_patches }) => {
    setStatePromise(
        immer((state) => {
            state.slider_server.connecting = true
        })
    )

    const notebookfile_hash = fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity }))
        .then(assert_response_ok)
        .then((r) => r.arrayBuffer())
        .then(plutohash_arraybuffer)

    notebookfile_hash.then((x) => console.log("Notebook file hash:", x))

    const bond_connections = notebookfile_hash
        .then((hash) => fetch(trailingslash(launch_params.slider_server_url) + "bondconnections/" + hash))
        .then(assert_response_ok)
        .then((r) => r.arrayBuffer())
        .then((b) => unpack(new Uint8Array(b)))

    bond_connections.then((x) => {
        console.log("Bond connections:", x)
        setStatePromise(
            immer((state) => {
                state.slider_server.connecting = false
                state.slider_server.interactive = Object.keys(x).length > 0
            })
        )
    })

    const mybonds = {}
    const bonds_to_set = {
        current: new Set(),
    }
    const request_bond_response = debounced_promises(async () => {
        const base = trailingslash(launch_params.slider_server_url)
        const hash = await notebookfile_hash
        const graph = await bond_connections

        // compute dependencies and update cell running statuses
        const dep_graph = get_current_state().cell_dependencies
        const starts = get_starts(dep_graph, bonds_to_set.current)
        const running_cells = [...recursive_dependencies(dep_graph, starts)]

        const update_cells_running = async (running) =>
            await setStatePromise(
                immer((state) => {
                    running_cells.forEach((cell_id) => (state.notebook.cell_results[cell_id][starts.has(cell_id) ? "running" : "queued"] = running))
                })
            )

        await update_cells_running(true)

        if (bonds_to_set.current.size > 0) {
            const to_send = new Set(bonds_to_set.current)
            bonds_to_set.current.forEach((varname) => (graph[varname] ?? []).forEach((x) => to_send.add(x)))
            console.debug("Requesting bonds", bonds_to_set.current, to_send)
            bonds_to_set.current = new Set()

            const mybonds_filtered = Object.fromEntries(
                _.sortBy(
                    Object.entries(mybonds).filter(([k, v]) => to_send.has(k)),
                    ([k, v]) => k
                )
            )

            const packed = pack(mybonds_filtered)

            const url = base + "staterequest/" + hash + "/"

            let unpacked = null
            try {
                const force_post = get_current_state().metadata["sliderserver_force_post"] ?? false
                const use_get = !force_post && url.length + (packed.length * 4) / 3 + 20 < 8000

                const response = use_get
                    ? await fetch(url + (await base64url_arraybuffer(packed)), {
                          method: "GET",
                      }).then(assert_response_ok)
                    : await fetch(url, {
                          method: "POST",
                          body: packed,
                      }).then(assert_response_ok)

                unpacked = unpack(new Uint8Array(await response.arrayBuffer()))
                const { patches, ids_of_cells_that_ran } = unpacked

                await apply_notebook_patches(
                    patches,
                    immer((state) => {
                        const original = get_original_state()
                        ids_of_cells_that_ran.forEach((id) => {
                            state.cell_results[id] = original.cell_results[id]
                        })
                    })(get_current_state())
                )
            } catch (e) {
                console.error(unpacked, e)
            } finally {
                // reset cell running state regardless of request outcome
                await update_cells_running(false)
            }
        }
    })

    return {
        ...nothing_actions({ actions }),
        set_bond: async (symbol, value) => {
            setStatePromise(
                immer((state) => {
                    state.notebook.bonds[symbol] = { value: value }
                })
            )
            if (mybonds[symbol] == null || !_.isEqual(mybonds[symbol].value, value)) {
                mybonds[symbol] = { value: _.cloneDeep(value) }
                bonds_to_set.current.add(symbol)
                await request_bond_response()
            }
        },
    }
}
