import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout } from "./jive_helpers.js"

// File menu buttons for Jive Sidebar

export function createFileMenu(timeoutValue) {
    // FILE MENU ACCORDION BUTTON
    const accButtonFile = document.createElement("button")
    accButtonFile.className = "jv-button jv-block "
    accButtonFile.name = 'File <img width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/document-outline.svg"></img>'
    accButtonFile.innerHTML =
        accButtonFile.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonFile.onclick = function () {
        myAccFunc(accFile.id)
    }

    // FILE MENU CONTAINER
    const accFile = document.createElement("div")
    accFile.id = "AccFile"
    accFile.className = "jv-hide jv-card"
    accFile.style.boxShadow = "none"
    accFile.style.margin = "0px 0px 5px 15px"

    // FILE MENU ITEMS
    const accItemFileLoadImage = document.createElement("a")
    accItemFileLoadImage.href = "#"
    accItemFileLoadImage.className = "jv-bar-item jv-button"
    accItemFileLoadImage.innerHTML = " "
    accItemFileLoadImage.innerText += "Load Image"
    accItemFileLoadImage.onclick = function () {
        createCellWithCode("image_data[JIVECore.Files.loadImage!(image_data, image_keys)]")
    }
    const accItemFileImportSequence = document.createElement("a")
    accItemFileImportSequence.href = "#"
    accItemFileImportSequence.className = "jv-bar-item jv-button"
    accItemFileImportSequence.innerHTML = " "
    accItemFileImportSequence.innerText += "Import Sequence"
    accItemFileImportSequence.onclick = function () {
        createCellWithCode("Images.mosaicview(image_data[JIVECore.Files.loadImage!(image_data, image_keys)]; fillvalue=0.5, npad=2, ncol=7, rowmajor=true)")
    }
    const accItemFileImportVideo = document.createElement("a")
    accItemFileImportVideo.href = "#"
    accItemFileImportVideo.className = "jv-bar-item jv-button"
    accItemFileImportVideo.innerHTML = " "
    accItemFileImportVideo.innerText += "Import Video"
    accItemFileImportVideo.onclick = function () {
        createCellWithCode("JIVECore.Visualize.gif(image_data[JIVECore.Files.loadImage!(image_data, image_keys)])")
    }
    const accItemFileSaveImage = document.createElement("a")
    accItemFileSaveImage.href = "#"
    accItemFileSaveImage.className = "jv-bar-item jv-button"
    accItemFileSaveImage.innerHTML = " "
    accItemFileSaveImage.innerText += "Save Image"
    accItemFileSaveImage.onclick = async function () {
        const x = getVarName("save")
        createMDCellWithUI("Save Image", `Select image to save: $(@bind ${x} PlutoUI.confirm(PlutoUI.Select(image_keys, default=image_keys[end])))`)
        await resolveAfterTimeout(timeoutValue)
        createCellWithCode(`JIVECore.Files.saveImage(image_data[${x}])`)
    }
    const accItemFileReset = document.createElement("a")
    accItemFileReset.href = "#"
    accItemFileReset.className = "jv-bar-item jv-button"
    accItemFileReset.innerHTML = " "
    accItemFileReset.innerText += "Reset Images"
    accItemFileReset.onclick = async function () {
        createMDCellWithUI("", '!!! warning "warning"\n\t All images stored in `image_data` were deleted!')
        await resolveAfterTimeout(timeoutValue)
        createCellWithCode("empty!(image_data); empty!(image_keys);")
    }

    accFile.appendChild(accItemFileLoadImage)
    accFile.appendChild(accItemFileImportSequence)
    accFile.appendChild(accItemFileImportVideo)
    accFile.appendChild(accItemFileSaveImage)
    accFile.appendChild(accItemFileReset)

    // WRAP BUTTON AND MENU
    const itemBarFile = document.createElement("div")
    itemBarFile.appendChild(accButtonFile)
    itemBarFile.appendChild(accFile)

    return itemBarFile
}
