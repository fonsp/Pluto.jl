import _ from "../imports/lodash.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"

import { in_textarea_or_input } from "../common/KeyboardShortcuts.js"
import { PlutoContext } from "../common/PlutoContext.js"

const upstream_of = (a_cell_id, notebook) => Object.values(notebook?.cell_dependencies?.[a_cell_id]?.upstream_cells_map || {}).flatMap((x) => x)

const all_upstreams_of = (a_cell_id, notebook) => {
    const upstreams = upstream_of(a_cell_id, notebook)
    if (upstreams.length === 0) return []
    return [...upstreams, ...upstreams.flatMap((v) => all_upstreams_of(v, notebook))]
}
const hasBarrier = (a_cell_id, notebook) => {
    return notebook?.cell_inputs?.[a_cell_id].metadata.disabled
}

export const RunArea = ({ runtime, running, queued, code_differs, on_run, on_interrupt, depends_on_disabled_cells, running_disabled, cell_id }) => {
    const on_save = on_run /* because disabled cells save without running */

    const localTimeRunning = 10e5 * useMillisSinceTruthy(running)
    const pluto_actions = useContext(PlutoContext)

    const on_jump = () => {
        const notebook = pluto_actions.get_notebook() || {}
        const barrier_cell_id = all_upstreams_of(cell_id, notebook).find((c) => hasBarrier(c, notebook))
        barrier_cell_id &&
            window.dispatchEvent(
                new CustomEvent("cell_focus", {
                    detail: {
                        cell_id: barrier_cell_id,
                        line: 0, // 1-based to 0-based index
                    },
                })
            )
    }
    const action = running || queued ? "interrupt" : running_disabled ? "save" : depends_on_disabled_cells && !code_differs ? "jump" : "run"

    const fmap = {
        on_interrupt,
        on_save,
        on_jump,
        on_run,
    }

    const titlemap = {
        interrupt: "Interrupt",
        save: "Save code without running",
        jump: "This cell depends on a disabled cell",
        run: "Run cell",
    }

    return html`
        <pluto-runarea class=${action}>
            <button onClick=${fmap[`on_${action}`]} class="runcell" title=${titlemap[action]}>
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
    let result = time_ns
    const prefices = ["n", "μ", "m", ""]
    let i = 0
    while (i < prefices.length - 1 && result >= 1000.0) {
        i += 1
        result /= 1000
    }
    const roundedtime = result.toFixed(time_ns < 100 || result >= 100.0 ? 0 : 1)

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

export const useDebouncedTruth = (truthy, delay = 5) => {
    const [mytruth, setMyTruth] = useState(truthy)
    const setMyTruthAfterNSeconds = useMemo(() => _.debounce(setMyTruth, delay * 1000), [setMyTruth])
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
