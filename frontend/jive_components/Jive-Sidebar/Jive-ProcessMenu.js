import { myAccFunc } from "./jive_helpers.js"

export function createProcessMenu(timeoutValue) {
    // Accordion Button
    const accButtonProcess = document.createElement("button")
    accButtonProcess.className = "jv-button jv-block "
    accButtonProcess.name = 'Process <img width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/cog-outline.svg"></img>'
    accButtonProcess.innerHTML =
        accButtonProcess.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonProcess.onclick = function () {
        myAccFunc(accProcess.id)
    }

    // Accordion Container
    const accProcess = document.createElement("div")
    accProcess.id = "AccProcess"
    accProcess.className = "jv-hide jv-card"
    accProcess.style.boxShadow = "none"
    accProcess.style.margin = "0px 0px 5px 15px"

    // Menu Items
    const accItemProcessFilter = document.createElement("a")
    accItemProcessFilter.href = "#"
    accItemProcessFilter.className = "jv-bar-item jv-button"
    accItemProcessFilter.innerText = "Apply Filter"
    accItemProcessFilter.onclick = function () {}

    const accItemProcessThreshold = document.createElement("a")
    accItemProcessThreshold.href = "#"
    accItemProcessThreshold.className = "jv-bar-item jv-button"
    accItemProcessThreshold.innerText = "Threshold"
    accItemProcessThreshold.onclick = function () {}

    const accItemProcessSegment = document.createElement("a")
    accItemProcessSegment.href = "#"
    accItemProcessSegment.className = "jv-bar-item jv-button"
    accItemProcessSegment.innerText = "Segment"
    accItemProcessSegment.onclick = function () {}

    const accItemProcessNormalize = document.createElement("a")
    accItemProcessNormalize.href = "#"
    accItemProcessNormalize.className = "jv-bar-item jv-button"
    accItemProcessNormalize.innerText = "Normalize"
    accItemProcessNormalize.onclick = function () {}

    accProcess.appendChild(accItemProcessFilter)
    accProcess.appendChild(accItemProcessThreshold)
    accProcess.appendChild(accItemProcessSegment)
    accProcess.appendChild(accItemProcessNormalize)

    // Wrap
    const itemBarProcess = document.createElement("div")
    itemBarProcess.appendChild(accButtonProcess)
    itemBarProcess.appendChild(accProcess)

    return itemBarProcess
}
