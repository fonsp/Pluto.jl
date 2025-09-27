import { myAccFunc, updateAllChevrons, closeOtherAccordions } from "./jive_helpers.js"

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
    accContent.id = "AccProcess_" + idSuffix
    accContent.className = "jv-hide jv-card"
    accContent.style.boxShadow = "none"
    accContent.style.margin = "0px 0px 5px 15px"
    accContent.style.fontSize = "0.92em"

    items.forEach((item) => accContent.appendChild(item))

    accButton.onclick = function () {
        closeOtherAccordions(accContent.id, "AccProcess_")
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

export function createProcessMenu(timeoutValue) {
    // Main Process menu button
    const accButtonProcess = document.createElement("button")
    accButtonProcess.className = "jv-button jv-block jv-left-align"
    accButtonProcess.name = "Process"
    accButtonProcess.style.display = "flex"
    accButtonProcess.style.justifyContent = "space-between"
    accButtonProcess.style.alignItems = "center"
    accButtonProcess.innerHTML = `
        <span style="display:flex;align-items:center;">
            <span style="font-size:0.97em;">Process</span>
        </span>
        <img class="chevron" width="15" style="margin-left:auto;" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-down="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-up="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up-outline.svg">
    `
    accButtonProcess.onclick = function () {
        closeOtherAccordions(accProcess.id)
        myAccFunc(accProcess.id)
        updateAllChevrons()
    }

    // Main Process menu container
    const accProcess = document.createElement("div")
    accProcess.id = "AccProcess"
    accProcess.className = "jv-hide jv-card"
    accProcess.style.boxShadow = "none"
    accProcess.style.margin = "0px 0px 5px 15px"

    // 🧹 Filters
    const filterItems = [
        createMenuItem("Gaussian Blur", function () {}),
        createMenuItem("Median Filter", function () {}),
        createMenuItem("Bilateral Filter", function () {}),
        createMenuItem("Unsharp Mask", function () {}),
        createMenuItem("Edge Detection (Sobel, Canny)", function () {}),
    ]

    // 🧬 Morphology
    const morphItems = [
        createMenuItem("Erode", function () {}),
        createMenuItem("Dilate", function () {}),
        createMenuItem("Open", function () {}),
        createMenuItem("Close", function () {}),
        createMenuItem("Skeletonize", function () {}),
        createMenuItem("Distance Transform", function () {}),
    ]

    // 🔄 Transformations
    const transformItems = [
        createMenuItem("Rotate (90°, 180°, Arbitrary)", function () {}),
        createMenuItem("Flip (Horizontal/Vertical)", function () {}),
        createMenuItem("Crop", function () {}),
        createMenuItem("Resize", function () {}),
        createMenuItem("Translate", function () {}),
        createMenuItem("Perspective Warp", function () {}),
    ]

    // 🔊 Denoising
    const denoiseItems = [
        createMenuItem("Non-local Means", function () {}),
        createMenuItem("Wavelet Denoising", function () {}),
        createMenuItem("Anisotropic Diffusion", function () {}),
        createMenuItem("Total Variation Filter", function () {}),
    ]

    // 🔁 Deconvolution
    const deconvItems = [
        createMenuItem("Richardson-Lucy", function () {}),
        createMenuItem("Wiener Deconvolution", function () {}),
        createMenuItem("PSF Estimation", function () {}),
        createMenuItem("Blind Deconvolution", function () {}),
    ]

    // Existing items
    const customItems = [
        createMenuItem("Apply Filter", function () {}),
        createMenuItem("Threshold", function () {}),
        createMenuItem("Segment", function () {}),
        createMenuItem("Normalize", function () {}),
    ]

    // Add accordions to menu
    accProcess.appendChild(createAccordion("🧹 Filters", filterItems, "filters"))
    accProcess.appendChild(createAccordion("🧬 Morphology", morphItems, "morphology"))
    accProcess.appendChild(createAccordion("🔄 Transformations", transformItems, "transform"))
    accProcess.appendChild(createAccordion("🔊 Denoising", denoiseItems, "denoise"))
    accProcess.appendChild(createAccordion("🔁 Deconvolution", deconvItems, "deconv"))
    accProcess.appendChild(createAccordion("Custom", customItems, "custom"))

    // Add a line at the end
    const hr = document.createElement("hr")
    hr.style.margin = "12px 0 0 0"
    accProcess.appendChild(hr)

    // Wrap button and menu
    const itemBarProcess = document.createElement("div")
    itemBarProcess.appendChild(accButtonProcess)
    itemBarProcess.appendChild(accProcess)

    return itemBarProcess
}
