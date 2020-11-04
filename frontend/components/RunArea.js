import { html, useEffect, useState } from "../imports/Preact.js"

export const RunArea = ({ runtime, onClick }) => {
    return html`
        <pluto-runarea>
            <button onClick=${onClick} class="runcell" title="Run"><span></span></button>
            <span class="runtime">${prettytime(runtime)}</span>
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
