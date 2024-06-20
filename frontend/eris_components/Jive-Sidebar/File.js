export function File() {
    const itemBarFile = document.createElement("div")

    const accButtonFile = document.createElement("button")
    accButtonFile.className = "jv-button jv-block jv-left-align"
    accButtonFile.name = "File"
    accButtonFile.innerHTML =
        accButtonFile.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButtonFile.onclick = function () {
        myAccFunc(accFile.id)
    }

    const accFile = document.createElement("div")
    accFile.id = "AccFile"
    accFile.className = "jv-hide jv-card"
    accFile.style.boxShadow = "none"
    accFile.style.margin = "0px 0px 5px 15px"

    const accItemFileLoadImage = document.createElement("a")
    accItemFileLoadImage.href = "#"
    accItemFileLoadImage.className = "jv-bar-item jv-button"
    accItemFileLoadImage.innerHTML = " "
    accItemFileLoadImage.innerText += "Load Image"
    accItemFileLoadImage.onclick = function () {
        createCellWithCode("str = JIVECore.Files.loadImageIntoDict() \n image_data[str]")
    }
    const accItemFileImportSequence = document.createElement("a")
    accItemFileImportSequence.href = "#"
    accItemFileImportSequence.className = "jv-bar-item jv-button"
    accItemFileImportSequence.innerHTML = " "
    accItemFileImportSequence.innerText += "Import Sequence"
    accItemFileImportSequence.onclick = function () {
        createCellWithCode(
            "begin \n path2 = pick_file() \n img2 = load(path2)  \n Images.mosaicview(img2; fillvalue=0.5, npad=2, ncol=7, rowmajor=true) \n end"
        )
    }
    const accItemFileImportVideo = document.createElement("a")
    accItemFileImportVideo.href = "#"
    accItemFileImportVideo.className = "jv-bar-item jv-button"
    accItemFileImportVideo.innerHTML = " "
    accItemFileImportVideo.innerText += "Import Video"
    accItemFileImportVideo.onclick = function () {
        createCellWithCode("begin \n path3 = pick_file() \n img3 = load(path3)  \n imshow(img3) \n end;")
    }

    accFile.appendChild(accItemFileLoadImage)
    accFile.appendChild(accItemFileImportSequence)
    accFile.appendChild(accItemFileImportVideo)
    itemBarFile.appendChild(accButtonFile)
    itemBarFile.appendChild(accFile)
}
