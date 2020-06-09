import { html } from "../common/Html.js"

export const RunArea = ({ runtime, onClick }) => {
    return html`
        <runarea>
            <span class="runtime">${prettytime(runtime)}</span>
            <button onClick=${onClick} class="runcell" title="Run"><span></span></button>
        </runarea>
    `
}

const prettytime = (time_ns) => {
    if (time_ns == null) {
        return "---"
    }
    const prefices = ["n", "μ", "m", ""]
    let i = 0
    while (i < prefices.length && time_ns >= 1000.0) {
        i += 1
        time_ns /= 1000
    }
    let roundedtime
    if (time_ns >= 100.0) {
        roundedtime = Math.round(time_ns)
    } else {
        roundedtime = Math.round(time_ns * 10) / 10
    }
    return roundedtime + "\xa0" + prefices[i] + "s"
}
