import { html } from "../imports/Preact.js"

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
