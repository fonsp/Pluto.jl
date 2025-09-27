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
    accContent.id = "AccEdit_" + idSuffix
    accContent.className = "jv-hide jv-card"
    accContent.style.boxShadow = "none"
    accContent.style.margin = "0px 0px 5px 15px"
    accContent.style.fontSize = "0.92em"

    items.forEach((item) => accContent.appendChild(item))

    accButton.onclick = function () {
        closeOtherAccordions(accContent.id, "AccEdit_")
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

export function createEditMenu(timeoutValue) {
    // Main Edit menu button
    const accButtonEdit = document.createElement("button")
    accButtonEdit.className = "jv-button jv-block jv-left-align"
    accButtonEdit.name = "Edit"
    accButtonEdit.style.display = "flex"
    accButtonEdit.style.justifyContent = "space-between"
    accButtonEdit.style.alignItems = "center"
    accButtonEdit.innerHTML = `
        <span style="display:flex;align-items:center;">
            <span style="font-size:0.97em;">Edit</span>
        </span>
        <img class="chevron" width="15" style="margin-left:auto;" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-down="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down-outline.svg"
            data-up="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up-outline.svg">
    `
    accButtonEdit.onclick = function () {
        closeOtherAccordions(accEdit.id)
        myAccFunc(accEdit.id)
        updateAllChevrons()
    }

    // Main Edit menu container
    const accEdit = document.createElement("div")
    accEdit.id = "AccEdit"
    accEdit.className = "jv-hide jv-card"
    accEdit.style.boxShadow = "none"
    accEdit.style.margin = "0px 0px 5px 15px"

    // --- Submenus ---
    // Undo / Redo
    const undoItems = [
        createMenuItem("Undo Last Action", function () {}),
        createMenuItem("Redo Last Action", function () {}),
        createMenuItem("View Action History", function () {}),
        createMenuItem("Clear History", function () {}),
    ]

    // Clipboard
    const clipboardItems = [
        createMenuItem("Copy Image / Layer", function () {}),
        createMenuItem("Cut Image / Layer", function () {}),
        createMenuItem("Paste as New Layer", function () {}),
        createMenuItem("Duplicate Selection", function () {}),
        createMenuItem("Paste into ROI", function () {}),
    ]

    // Selection
    const selectionItems = [
        createMenuItem("Select All", function () {}),
        createMenuItem("Clear Selection", function () {}),
        createMenuItem("Invert Selection", function () {}),
        createMenuItem("Reselect Last", function () {}),
        createMenuItem("Save Selection as Mask", function () {}),
        createMenuItem("Load Mask as Selection", function () {}),
    ]

    // Crop & Resize
    const annotateItems = [
        createMenuItem("Crop to Selection", function () {}),
        createMenuItem("Crop to Bounding Box", function () {}),
        createMenuItem("Resize Image", function () {}),
        createMenuItem("Resize Canvas", function () {}),
        createMenuItem("Set Resolution / DPI", function () {}),
        createMenuItem("Annotate", async function () {
            const img = getVarName("annotate_image")
            const ops = getVarName("annotate_operation")
            const coords = getVarName("annotate_coords")
            const apply = getVarName("annotate_apply")
            const plot = getVarName("annotate_plot")
            const shps = getVarName("annotate_shapes")
            createCellWithCode(`${shps} = Dict()
md"""
##### Annotate
---

1. Choose image: $(@bind ${img} Select(image_keys, default=image_keys[end]) ) 
1. Select Area 
1. Choose operation: $(@bind ${ops} confirm(Select([1 => "crop", 2 => "fill", 3 => "plot"])) )

---

$(
@bind ${coords} let
    ${plot}  = create_plotly_visualizer(image_data[${img}], "heatmap")
    create_plotly_listener(${plot})
    ${plot} 
end
)
---

Apply last operation to the selected images (press Ctrl to select multiple items):

$(@bind ${apply} confirm(MultiSelect(image_keys)) )"
"""
`)
            await resolveAfterTimeout(timeoutValue)
            createCellWithCode(`record_plotly_shapes(${coords}["shape"])(${shps},${coords});`)
        }),
    ]

    // Adjust
    const adjustItems = [
        createMenuItem("Brightness / Contrast", function () {}),
        createMenuItem("Levels", function () {}),
        createMenuItem("Gamma", function () {}),
        createMenuItem("Histogram Match", function () {}),
        createMenuItem("Color Balance", function () {}),
        createMenuItem("Invert Colors", function () {}),
        createMenuItem("Grayscale Conversion", function () {}),
    ]

    // Transform
    const transformItems = [
        createMenuItem("Rotate (90°, 180°, arbitrary)", function () {}),
        createMenuItem("Flip (Horizontal / Vertical)", function () {}),
        createMenuItem("Warp / Perspective", function () {}),
        createMenuItem("Shear", function () {}),
        createMenuItem("Align to Reference", function () {}),
    ]

    // Layers
    const layersItems = [
        createMenuItem("Rename Layer", function () {}),
        createMenuItem("Duplicate Layer", function () {}),
        createMenuItem("Delete Layer", function () {}),
        createMenuItem("Merge Layers", function () {}),
        createMenuItem("Flatten Image", function () {}),
    ]

    // Preferences
    const preferencesItems = [
        createMenuItem("Default Output Format", function () {}),
        createMenuItem("Default Save Path", function () {}),
        createMenuItem("Autosave Settings", function () {}),
        createMenuItem("Notebook Display Options", function () {}),
        createMenuItem("Plugin Settings", function () {}),
    ]

    // Add accordions to menu
    accEdit.appendChild(createAccordion("✏️ Undo / Redo", undoItems, "undo"))
    accEdit.appendChild(createAccordion("📋 Clipboard", clipboardItems, "clipboard"))
    accEdit.appendChild(createAccordion("🔍 Selection", selectionItems, "selection"))
    accEdit.appendChild(createAccordion("🪟 Annotation", annotateItems, "annotation"))
    accEdit.appendChild(createAccordion("🎚️ Adjust", adjustItems, "adjust"))
    accEdit.appendChild(createAccordion("🧰 Transform", transformItems, "transform"))
    accEdit.appendChild(createAccordion("🖲️ Layers", layersItems, "layers"))
    accEdit.appendChild(createAccordion("⚙️ Preferences", preferencesItems, "preferences"))

    // Add a line at the end
    const hr = document.createElement("hr")
    hr.style.margin = "12px 0 0 0"
    accEdit.appendChild(hr)

    // Wrap button and menu
    const itemBarEdit = document.createElement("div")
    itemBarEdit.appendChild(accButtonEdit)
    itemBarEdit.appendChild(accEdit)

    return itemBarEdit
}
