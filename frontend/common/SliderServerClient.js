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
    const deps = new Set()
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

    bond_connections.catch((x) => {
        setStatePromise(
            immer((state) => {
                state.slider_server.connecting = false
                state.slider_server.interactive = false
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

        console.log("tree", starts, running_cells)

        const update_cells_running = async (running) =>
            await setStatePromise(
                immer((state) => {
                    running_cells.forEach((cell_id) => (state.notebook.cell_results[cell_id]["queued"] = running))
                    starts.forEach((cell_id) => (state.notebook.cell_results[cell_id]["running"] = running))
                })
            )

        await update_cells_running(true)

        const explicit_bond_names = bonds_to_set.current
        if (explicit_bond_names.size > 0) {
            const to_send = new Set(explicit_bond_names)
            explicit_bond_names.forEach((varname) => (graph[varname] ?? []).forEach((x) => to_send.add(x)))

            bonds_to_set.current = new Set()

            const mybonds_filtered = Object.fromEntries(
                _.sortBy(
                    Object.entries(mybonds).filter(([k, v]) => to_send.has(k)),
                    ([k, v]) => k
                )
            )

            console.debug("Requesting bonds", explicit_bond_names, to_send, mybonds_filtered)

            const packed = pack(mybonds_filtered)

            const url = base + "staterequest/" + hash + "/"

            let unpacked = null
            try {
                const force_post = get_current_state().metadata["sliderserver_force_post"] ?? false
                const use_get = !force_post && url.length + (packed.length * 4) / 3 + 20 < 8000

                const request_url = new URL(url + (await base64url_arraybuffer(packed)), window.location.href)
                // TODO: when?
                // TODO: bond hierachy graph? or just see if there are multiple
                if (true) {
                    request_url.searchParams.set("explicit", await base64url_arraybuffer(pack(Array.from(explicit_bond_names))))
                }

                const response = use_get
                    ? await fetch(request_url, {
                          method: "GET",
                      }).then(assert_response_ok)
                    : await fetch(url, {
                          method: "POST",
                          body: packed,
                      }).then(assert_response_ok)

                unpacked = unpack(new Uint8Array(await response.arrayBuffer()))
                console.debug("Received state", unpacked)
                const { patches, ids_of_cells_that_ran, stages } = unpacked

                // Filter patches
                // When the run was staged, only update if we believe that the cell should be updated...
                const patches_filtered = patches.filter(({ path }) => {
                    // const patches_filtered = stages.length < 2 ? patches : patches.filter(({ path }) => {
                    if (path.length > 2 && path[0] === "cell_results") {
                        const id = path[1]
                        return !starts.has(id)
                    }
                    return true
                })

                // const patches_filtered = patches
                console.error({ patches, patches_filtered })

                await apply_notebook_patches(
                    patches_filtered,
                    // We can just apply the patches as-is, but for complete correctness we have to take into account that these patches are not generated:
                    // NOT: diff(current_state_of_this_browser, what_it_should_be)
                    // but
                    // YES: diff(original_statefile_state, what_it_should_be)
                    //
                    // And because of previous bond interactions, our current state will have drifted from the original_statefile_state.
                    //
                    // Luckily immer lets us deal with this perfectly by letting us provide a custom "old" state.
                    // For the old state, we will use:
                    //   the current state of this browser (we dont want to change too much)
                    //   but all cells that will be affected by this run:
                    //      the statefile state
                    //
                    // Crazy!!
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

/*


Also send which bonds you set intentionally

AAA
10, 20
->
11, 20

moet geven
11, 11


BBBB
11, 11
-> 
11, 20
moet geven
11, 20


dus afhankelijkheid van geschiedenis

of van setter?



AAAAA
10
->
11

(haal andere bonds uit original_state)


BBBB
standaard


ga ervan uit dat we alleen interesse hebben in de laatste stage






of mss query param!!!!!

?explicit=jjaf0s9j0933f9j3f9j3f



hoe?





aanpassen:
- [x] in julia: cell met bond afhankelijk van expliciet? dan niet nieuwe bond value gebruiken
- [x] en die stages kan je eigenlijk skippen
- [ ] bond patches wel sturen als ze overlappen met wat de user stuurde (want die worder verwijderd en das nodig)
- [x] frontend: alleen patches afhankelijk van expliciet
- [ ] figure out what the old state thing is all about and fix it




*/
