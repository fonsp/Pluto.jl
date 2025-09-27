import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout, updateAllChevrons, closeOtherAccordions } from "./jive_helpers.js"

function createAccordion(title, items, idSuffix) {
    const accButton = document.createElement("button")
    accButton.className = "jv-button jv-block jv-left-align"
    accButton.name = title
    accButton.style.display = "flex"
    accButton.style.justifyContent = "space-between"
    accButton.style.alignItems = "center"
    accButton.style.fontSize = "0.93em"
    accButton.innerHTML = `
        <span style="display:flex;align-items:center;">
            <span>${title}</span>
        </span>
        <img class="chevron" width="15" style="margin-left:auto;" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg" 
            data-down="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-up="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up-outline.svg">
    `
    const accContent = document.createElement("div")
    accContent.id = "AccMeasure_" + idSuffix
    accContent.className = "jv-hide jv-card"
    accContent.style.boxShadow = "none"
    accContent.style.margin = "0px 0px 5px 15px"
    accContent.style.fontSize = "0.92em"

    items.forEach((item) => accContent.appendChild(item))

    accButton.onclick = function () {
        closeOtherAccordions(accContent.id)
        myAccFunc(accContent.id)
        updateAllChevrons()
    }

    const wrapper = document.createElement("div")
    wrapper.appendChild(accButton)
    wrapper.appendChild(accContent)
    return wrapper
}

function createMenuItem(text, onclick) {
    const a = document.createElement("a")
    a.href = "#"
    a.className = "jv-bar-item jv-button jv-left-align"
    a.style.fontSize = "0.93em"
    a.style.display = "flex"
    a.style.alignItems = "center"
    a.innerHTML = `<span>${text}</span>`
    a.onclick = onclick
    return a
}

export function createMeasureMenu(timeoutValue) {
    // Main Measurements menu button
    const accButtonMeasure = document.createElement("button")
    accButtonMeasure.className = "jv-button jv-block jv-left-align"
    accButtonMeasure.name = "Measurements"
    accButtonMeasure.style.display = "flex"
    accButtonMeasure.style.justifyContent = "space-between"
    accButtonMeasure.style.alignItems = "center"
    accButtonMeasure.innerHTML = `
        <span style="display:flex;align-items:center;">
            <span style="font-size:0.97em;">Measure </span>
        </span>
        <img class="chevron" width="15" style="margin-left:auto;" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-down="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-up="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up-outline.svg">
    `
    accButtonMeasure.onclick = function () {
        closeOtherAccordions(accMeasure.id, "AccMeasure_")
        myAccFunc(accMeasure.id)
        updateAllChevrons()
    }

    // Main Measurements menu container
    const accMeasure = document.createElement("div")
    accMeasure.id = "AccMeasure"
    accMeasure.className = "jv-hide jv-card"
    accMeasure.style.boxShadow = "none"
    accMeasure.style.margin = "0px 0px 5px 15px"

    // 📈 Intensity & Stats
    const intensityItems = [
        createMenuItem("Mean / Median / Std", function () {}),
        createMenuItem("Min / Max", function () {}),
        createMenuItem("Intensity Histogram", function () {}),
        createMenuItem("Pixel Value Sampling", function () {}),
    ]

    // 🔵 Shape Analysis
    const shapeItems = [
        createMenuItem("Area", function () {}),
        createMenuItem("Perimeter", function () {}),
        createMenuItem("Circularity", function () {}),
        createMenuItem("Eccentricity", function () {}),
        createMenuItem("Feret Diameter", function () {}),
    ]

    // 🔢 Object Detection
    const objectItems = [
        createMenuItem("Count Particles", function () {}),
        createMenuItem("Label Components", function () {}),
        createMenuItem("Bounding Boxes", function () {}),
        createMenuItem("Centroid Detection", function () {}),
        createMenuItem("Object Table Export", function () {}),
    ]

    // ⏱️ Time-Series
    const timeItems = [
        createMenuItem("Intensity vs Time", function () {}),
        createMenuItem("Kymograph", function () {}),
        createMenuItem("Track Movement", function () {}),
        createMenuItem("Object Lifecycle", function () {}),
    ]

    // 🎯 Colocalization
    const colocalItems = [
        createMenuItem("Pearson Coefficient", function () {}),
        createMenuItem("Manders’ Coefficient", function () {}),
        createMenuItem("Overlap Fraction", function () {}),
        createMenuItem("Scatter Plot", function () {}),
    ]

    // 📏 Profiles & ROIs
    const roiItems = [
        createMenuItem("Line Profile", function () {}),
        createMenuItem("Radial Profile", function () {}),
        createMenuItem("ROI Measurements", function () {}),
        createMenuItem("Multi-ROI Table", function () {}),
    ]

    // 📤 Export
    const exportItems = [
        createMenuItem("Export Measurements Table", function () {}),
        createMenuItem("CSV / Excel / DataFrame", function () {}),
        createMenuItem("Save Plots", function () {}),
    ]

    // Add accordions to menu
    accMeasure.appendChild(createAccordion("📈 Stats", intensityItems, "stats"))
    accMeasure.appendChild(createAccordion("🔵 Shape Analysis", shapeItems, "shape"))
    accMeasure.appendChild(createAccordion("🔢 Object Detection", objectItems, "object"))
    accMeasure.appendChild(createAccordion("⏱️ Time-Series", timeItems, "time"))
    accMeasure.appendChild(createAccordion("🎯 Colocalization", colocalItems, "colocal"))
    accMeasure.appendChild(createAccordion("📏 Profiles & ROIs", roiItems, "roi"))
    accMeasure.appendChild(createAccordion("📤 Export", exportItems, "export"))

    // Add a line at the end
    const hr = document.createElement("hr")
    hr.style.margin = "12px 0 0 0"
    accMeasure.appendChild(hr)

    // Wrap button and menu
    const itemBarMeasure = document.createElement("div")
    itemBarMeasure.appendChild(accButtonMeasure)
    itemBarMeasure.appendChild(accMeasure)

    return itemBarMeasure
}
