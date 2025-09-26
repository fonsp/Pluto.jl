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

    // Add menu items here as needed

    // Wrap
    const itemBarProcess = document.createElement("div")
    itemBarProcess.appendChild(accButtonProcess)
    itemBarProcess.appendChild(accProcess)

    return itemBarProcess
}
