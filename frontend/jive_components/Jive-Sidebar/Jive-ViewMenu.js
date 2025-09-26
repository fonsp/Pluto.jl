import { myAccFunc } from "./jive_helpers.js"

export function createViewMenu(timeoutValue) {
    // Accordion Button
    const accButtonView = document.createElement("button")
    accButtonView.className = "jv-button jv-block "
    accButtonView.name = 'View <img width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/tv-outline.svg"></img>'
    accButtonView.innerHTML =
        accButtonView.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonView.onclick = function () {
        myAccFunc(accView.id)
    }

    // Accordion Container
    const accView = document.createElement("div")
    accView.id = "AccView"
    accView.className = "jv-hide jv-card"
    accView.style.boxShadow = "none"
    accView.style.margin = "0px 0px 5px 15px"

    // Menu Items
    const accItemViewZoom = document.createElement("a")
    accItemViewZoom.href = "#"
    accItemViewZoom.className = "jv-bar-item jv-button"
    accItemViewZoom.innerText = "Zoom"
    accItemViewZoom.onclick = function () {}

    const accItemViewPan = document.createElement("a")
    accItemViewPan.href = "#"
    accItemViewPan.className = "jv-bar-item jv-button"
    accItemViewPan.innerText = "Pan"
    accItemViewPan.onclick = function () {}

    const accItemViewFullscreen = document.createElement("a")
    accItemViewFullscreen.href = "#"
    accItemViewFullscreen.className = "jv-bar-item jv-button"
    accItemViewFullscreen.innerText = "Fullscreen"
    accItemViewFullscreen.onclick = function () {}

    const accItemViewGrid = document.createElement("a")
    accItemViewGrid.href = "#"
    accItemViewGrid.className = "jv-bar-item jv-button"
    accItemViewGrid.innerText = "Show Grid"
    accItemViewGrid.onclick = function () {}

    accView.appendChild(accItemViewZoom)
    accView.appendChild(accItemViewPan)
    accView.appendChild(accItemViewFullscreen)
    accView.appendChild(accItemViewGrid)

    // Wrap
    const itemBarView = document.createElement("div")
    itemBarView.appendChild(accButtonView)
    itemBarView.appendChild(accView)

    return itemBarView
}
