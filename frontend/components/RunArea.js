import { in_textarea_or_input } from "../common/KeyboardShortcuts.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"

const upstream_of = (a_cell_id, notebook) => Object.values(notebook?.cell_dependencies?.[a_cell_id]?.upstream_cells_map || {}).flatMap((x) => x)

const all_upstreams_of = (a_cell_id, notebook) => {
    const upstreams = upstream_of(a_cell_id, notebook)
    if (upstreams.length === 0) return []
    return [...upstreams, ...upstreams.flatMap((v) => all_upstreams_of(v, notebook))]
}
const hasBarrier = (a_cell_id, notebook) => {
    return notebook?.cell_inputs?.[a_cell_id]?.has_execution_barrier
}

export const RunArea = ({ runtime, onClick, running, disable, cell_id }) => {
    const localTimeRunning = 10e5 * useMillisSinceTruthy(running)
    const pluto_actions = useContext(PlutoContext)
    return html`
        <pluto-runarea>
            <button
                onClick=${() => {
                    if (!disable) return onClick()
                    const notebook = pluto_actions.get_notebook() || {}
                    const barrier_cell_id = all_upstreams_of(cell_id, notebook).find((c) => hasBarrier(c, notebook))
                    barrier_cell_id &&
                        window.dispatchEvent(
                            new CustomEvent("cell_focus", {
                                detail: {
                                    cell_id: barrier_cell_id,
                                    line: 1, // 1-based to 0-based index
                                },
                            })
                        )
                }}
                class="runcell"
                title=${disable ? "Please remove the barrier" : "Run"}
            >
                <span></span>
            </button>
            <span class="runtime">${prettytime(running ? localTimeRunning || runtime : runtime)}</span>
        </pluto-runarea>
    `
}

const prettytime = (time_ns) => {
    if (time_ns == null) {
        return "---"
    }
    const prefices = ["n", "μ", "m", ""]
    let i = 0
    while (i < prefices.length - 1 && time_ns >= 1000.0) {
        i += 1
        time_ns /= 1000
    }
    const roundedtime = time_ns.toFixed(time_ns >= 100.0 ? 0 : 1)

    return roundedtime + "\xa0" + prefices[i] + "s"
}

const update_interval = 50
/**
 * Returns the milliseconds passed since the argument became truthy.
 * If argument is falsy, returns undefined.
 *
 * @param {boolean} truthy
 */
export const useMillisSinceTruthy = (truthy) => {
    const [now, setNow] = useState(0)
    const [startRunning, setStartRunning] = useState(0)
    useEffect(() => {
        let interval
        if (truthy) {
            const now = +new Date()
            setStartRunning(now)
            setNow(now)
            interval = setInterval(() => setNow(+new Date()), update_interval)
        }
        return () => {
            interval && clearInterval(interval)
        }
    }, [truthy])
    return truthy ? now - startRunning : undefined
}

const NSeconds = 5
export const useDebouncedTruth = (truthy) => {
    const [mytruth, setMyTruth] = useState(truthy)
    const setMyTruthAfterNSeconds = useMemo(() => _.debounce(setMyTruth, NSeconds * 1000), [setMyTruth])
    useEffect(() => {
        if (truthy) {
            setMyTruth(true)
            setMyTruthAfterNSeconds.cancel()
        } else {
            setMyTruthAfterNSeconds(false)
        }
        return () => {}
    }, [truthy])
    return mytruth
}
