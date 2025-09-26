import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout } from "./jive_helpers.js"

export function createEditMenu(timeoutValue) {
    // Accordion Button
    const accButtonEdit = document.createElement("button")
    accButtonEdit.className = "jv-button jv-block "
    accButtonEdit.name = 'Edit <img width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/create-outline.svg"></img>'
    accButtonEdit.innerHTML =
        accButtonEdit.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonEdit.onclick = function () {
        myAccFunc(accEdit.id)
    }

    // Accordion Container
    const accEdit = document.createElement("div")
    accEdit.id = "AccEdit"
    accEdit.className = "jv-hide jv-card"
    accEdit.style.boxShadow = "none"
    accEdit.style.margin = "0px 0px 5px 15px"

    // Menu Items
    const accItemEditAnnotate = document.createElement("a")
    accItemEditAnnotate.href = "#"
    accItemEditAnnotate.className = "jv-bar-item jv-button"
    accItemEditAnnotate.innerHTML = " "
    accItemEditAnnotate.innerText += "Annotate"
    accItemEditAnnotate.onclick = async function () {
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
    }

    const accItemEditCrop = document.createElement("a")
    accItemEditCrop.href = "#"
    accItemEditCrop.className = "jv-bar-item jv-button"
    accItemEditCrop.innerText = "Crop"
    accItemEditCrop.onclick = function () {}

    const accItemEditResize = document.createElement("a")
    accItemEditResize.href = "#"
    accItemEditResize.className = "jv-bar-item jv-button"
    accItemEditResize.innerText = "Resize"
    accItemEditResize.onclick = function () {}

    const accItemEditRotate = document.createElement("a")
    accItemEditRotate.href = "#"
    accItemEditRotate.className = "jv-bar-item jv-button"
    accItemEditRotate.innerText = "Rotate"
    accItemEditRotate.onclick = function () {}

    accEdit.appendChild(accItemEditAnnotate)
    accEdit.appendChild(accItemEditCrop)
    accEdit.appendChild(accItemEditResize)
    accEdit.appendChild(accItemEditRotate)

    // Wrap
    const itemBarEdit = document.createElement("div")
    itemBarEdit.appendChild(accButtonEdit)
    itemBarEdit.appendChild(accEdit)

    return itemBarEdit
}
