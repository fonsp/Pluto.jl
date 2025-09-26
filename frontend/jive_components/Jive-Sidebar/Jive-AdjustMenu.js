import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout } from "./jive_helpers.js"

export function createAdjustMenu(timeoutValue) {
    // Accordion Button
    const accButtonAdjust = document.createElement("button")
    accButtonAdjust.className = "jv-button jv-block "
    accButtonAdjust.name = 'Adjust <img width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/contrast-outline.svg"></img>'
    accButtonAdjust.innerHTML =
        accButtonAdjust.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonAdjust.onclick = function () {
        myAccFunc(accAdjust.id)
    }

    // Accordion Container
    const accAdjust = document.createElement("div")
    accAdjust.id = "AccAdjust"
    accAdjust.className = "jv-hide jv-card"
    accAdjust.style.boxShadow = "none"
    accAdjust.style.margin = "0px 0px 5px 15px"

    // Menu Items
    const accItemAdjustBrightness = document.createElement("a")
    accItemAdjustBrightness.href = "#"
    accItemAdjustBrightness.className = "jv-bar-item jv-button"
    accItemAdjustBrightness.innerText = "Brightness"
    accItemAdjustBrightness.onclick = function () {}

    const accItemAdjustContrast = document.createElement("a")
    accItemAdjustContrast.href = "#"
    accItemAdjustContrast.className = "jv-bar-item jv-button"
    accItemAdjustContrast.innerHTML = " "
    accItemAdjustContrast.innerText += "Contrast"
    accItemAdjustContrast.onclick = async function () {
        const x = getVarName("autocontrast")
        createMDCellWithUI("Autocontrast", `Select input image: $(@bind ${x} PlutoUI.Select(image_keys, default=image_keys[end]))`)
        await resolveAfterTimeout(timeoutValue)
        createCellWithCode(`JIVECore.Process.autoContrast(image_data[${x}])`)
    }

    const accItemAdjustColor = document.createElement("a")
    accItemAdjustColor.href = "#"
    accItemAdjustColor.className = "jv-bar-item jv-button"
    accItemAdjustColor.innerHTML = " "
    accItemAdjustColor.innerText += "Color"
    // Add onclick if needed

    accAdjust.appendChild(accItemAdjustBrightness)
    accAdjust.appendChild(accItemAdjustContrast)
    accAdjust.appendChild(accItemAdjustColor)

    // Wrap
    const itemBarAdjust = document.createElement("div")
    itemBarAdjust.appendChild(accButtonAdjust)
    itemBarAdjust.appendChild(accAdjust)

    return itemBarAdjust
}
