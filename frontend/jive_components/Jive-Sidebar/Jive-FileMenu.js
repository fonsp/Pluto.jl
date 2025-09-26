import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout } from "./jive_helpers.js"

function updateAllChevrons() {
    // find all chevrons inside buttons
    document.querySelectorAll("button img.chevron").forEach((img) => {
        const btn = img.closest("button")
        if (!btn) return
        const content = btn.nextElementSibling // should be the accContent
        if (!content) return
        /** @type {HTMLImageElement} */
        const imageElem = /** @type {HTMLImageElement} */ (img)
        imageElem.src = content.classList.contains("jv-show") ? imageElem.dataset.up || "" : imageElem.dataset.down || ""
    })
}

function closeOtherAccordions(currentId) {
    document.querySelectorAll('[id^="AccFile_"]').forEach((div) => {
        if (div.id !== currentId && div.classList.contains("jv-show")) {
            div.classList.remove("jv-show")
            div.classList.add("jv-hide")
        }
    })
}

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
    accContent.id = "AccFile_" + idSuffix
    accContent.className = "jv-hide jv-card"
    accContent.style.boxShadow = "none"
    accContent.style.margin = "0px 0px 5px 15px"
    accContent.style.fontSize = "0.92em"

    items.forEach((item) => accContent.appendChild(item))

    accButton.onclick = function () {
        closeOtherAccordions(accContent.id) // close others
        myAccFunc(accContent.id) // toggle this one
        updateAllChevrons() // reflect the new state everywhere
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

export function createFileMenu(timeoutValue) {
    // Main File menu button
    const accButtonFile = document.createElement("button")
    accButtonFile.className = "jv-button jv-block jv-left-align"
    accButtonFile.name = "File"
    accButtonFile.style.display = "flex"
    accButtonFile.style.justifyContent = "space-between"
    accButtonFile.style.alignItems = "center"
    accButtonFile.innerHTML = `
        <span style="display:flex;align-items:center;">
            <span style="font-size:0.97em;">File</span>
        </span>
        <img class="chevron" width="15" style="margin-left:auto;" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-down="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-up="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up-outline.svg">
    `
    accButtonFile.onclick = function () {
        closeOtherAccordions(accFile.id) // close others
        myAccFunc(accFile.id) // toggle this one
        updateAllChevrons() // reflect the new state everywhere
    }

    // Main File menu container
    const accFile = document.createElement("div")
    accFile.id = "AccFile"
    accFile.className = "jv-hide jv-card"
    accFile.style.boxShadow = "none"
    accFile.style.margin = "0px 0px 5px 15px"

    // --- Accordion items ---
    // 📂 Open
    const openItems = [
        createMenuItem("Load Image", function () {
            createCellWithCode("image_data[JIVECore.Files.loadImage!(image_data, image_keys)]")
        }),
        createMenuItem("Open from URL", function () {}),
        createMenuItem("Open from Array (NumPy, xarray)", function () {}),
        createMenuItem("Open Dataset (folder, multi-page TIFF, OME-TIFF, DICOM series)", function () {}),
    ]

    // 📥 Import
    const importItems = [
        createMenuItem("Import Sequence", function () {
            createCellWithCode("Images.mosaicview(image_data[JIVECore.Files.loadImage!(image_data, image_keys)]; fillvalue=0.5, npad=2, ncol=7, rowmajor=true)")
        }),
        createMenuItem("Import Video", function () {
            createCellWithCode("JIVECore.Visualize.gif(image_data[JIVECore.Files.loadImage!(image_data, image_keys)])")
        }),
        createMenuItem("Import HDF5 / Zarr", function () {}),
        createMenuItem("Import Metadata (JSON, CSV, XML)", function () {}),
    ]

    // 💾 Save / Export
    const saveItems = [
        createMenuItem("Save Image", async function () {
            const x = getVarName("save")
            createMDCellWithUI("Save Image", `Select image to save: $(@bind ${x} PlutoUI.confirm(PlutoUI.Select(image_keys, default=image_keys[end])))`)
            await resolveAfterTimeout(timeoutValue)
            createCellWithCode(`JIVECore.Files.saveImage(image_data[${x}])`)
        }),
        createMenuItem("Save Multi-Channel / Stack (OME-TIFF, HDF5, Zarr)", function () {}),
        createMenuItem("Export Snapshot (PNG inline in notebook)", function () {}),
        createMenuItem("Export as Animation (GIF, MP4)", function () {}),
        createMenuItem("Export with Metadata", function () {}),
    ]

    // 📝 Workflow
    const workflowItems = [
        createMenuItem("Save Workflow (JSON/YAML)", function () {}),
        createMenuItem("Load Workflow", function () {}),
        createMenuItem("Export Workflow as Code (Python cell)", function () {}),
    ]

    // 📦 Batch Processing
    const batchItems = [
        createMenuItem("Batch Open Images", function () {}),
        createMenuItem("Batch Save/Export", function () {}),
        createMenuItem("Batch Apply Workflow", function () {}),
    ]

    // 🔄 Session
    const sessionItems = [
        createMenuItem("Save Session", function () {}),
        createMenuItem("Load Session", function () {}),
        createMenuItem("Clear Session", function () {}),
        createMenuItem("Reset Images", async function () {
            createMDCellWithUI("", '!!! warning "warning"\n\t All images stored in `image_data` were deleted!')
            await resolveAfterTimeout(timeoutValue)
            createCellWithCode("empty!(image_data); empty!(image_keys);")
        }),
    ]

    // Add accordions to menu
    accFile.appendChild(createAccordion("📂 Open", openItems, "open"))
    accFile.appendChild(createAccordion("📥 Import", importItems, "import"))
    accFile.appendChild(createAccordion("💾 Save / Export", saveItems, "save"))
    accFile.appendChild(createAccordion("📝 Workflow", workflowItems, "workflow"))
    accFile.appendChild(createAccordion("📦 Batch Processing", batchItems, "batch"))
    accFile.appendChild(createAccordion("🔄 Session", sessionItems, "session"))

    // Add a line at the end
    const hr = document.createElement("hr")
    hr.style.margin = "12px 0 0 0"
    accFile.appendChild(hr)

    // Wrap button and menu
    const itemBarFile = document.createElement("div")
    itemBarFile.appendChild(accButtonFile)
    itemBarFile.appendChild(accFile)

    return itemBarFile
}
