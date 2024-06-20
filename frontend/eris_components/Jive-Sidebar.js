// @ts-nocheck
/*
    Add Sidebar
*/
// add style file
function addCss(fileName) {
    var head = document.head
    var link = document.createElement("link")

    link.type = "text/css"
    link.rel = "stylesheet"
    link.href = fileName

    head.appendChild(link)
}

addCss("./eris_components/jive.css")

// make space for sidebar
const frameDiv = document.getElementById("frame")
// @ts-ignore
frameDiv.style = `
    margin-left: var(--sidebar-width);
    `

const sideBar = document.createElement("div")
sideBar.id = "sidebar"
sideBar.className = "jv-sidebar jv-bar-block jv-collapse-2 jv-light-grey jv-card" // jv-animate-left

// @ts-ignore
frameDiv.before(sideBar)

// CLOSE BTN
const closeBtn = document.createElement("button")
closeBtn.className = "jv-button"
closeBtn.innerHTML = "<a>×</a>"
closeBtn.style.position = "absolute"
closeBtn.style.top = "0"
closeBtn.style.right = "0px"
closeBtn.title = "Close Sidebar"
closeBtn.onclick = w3_close

// TITLE
const titleDiv = document.createElement("div")
titleDiv.className = "jv-container "
titleDiv.innerHTML = '<h2> <img width="50"  src="./img/jive_logo_eye_crop3.png"></img>  </h2> <i>jive</i> v.0.0'
titleDiv.style.textAlign = "center"

// SEARCH BAR
const searchItem = document.createElement("input")
searchItem.className = "jv-input jv-padding"
searchItem.type = "search"
searchItem.placeholder = "Search..."
searchItem.id = "sideBarInput"
searchItem.style.cssText = `
            border-radius: 12px;
            margin: 10% auto 10% 2.5%;
        `
searchItem.onkeyup = function () {
    var input, filter, a, i
    input = document.getElementById("sideBarInput")
    // @ts-ignore
    filter = input.value.toUpperCase()
    const div = document.getElementById("sidebar")
    // @ts-ignore
    a = div.getElementsByTagName("a")
    for (i = 0; i < a.length; i++) {
        const txtValue = a[i].textContent || a[i].innerText
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            a[i].style.display = "block"
        } else {
            a[i].style.display = "none"
        }
    }
}
searchItem.addEventListener("search", function () {
    // @ts-ignore
    const a = div.getElementsByTagName("a")
    // @ts-ignore
    for (i = 0; i < a.length; i++) {
        // @ts-ignore
        a[i].style.display = "block"
    }
})

///////////////// BUTTONS ///////////////////////

////////// FILE /////////////
const itemBarFile = document.createElement("div")

const accButtonFile = document.createElement("button")
accButtonFile.className = "jv-button jv-block jv-left-align"
accButtonFile.name = "File"
accButtonFile.innerHTML = accButtonFile.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
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
    createCellWithCode("image_data[JIVECore.Files.loadImageIntoDict()]")
}
const accItemFileImportSequence = document.createElement("a")
accItemFileImportSequence.href = "#"
accItemFileImportSequence.className = "jv-bar-item jv-button"
accItemFileImportSequence.innerHTML = " "
accItemFileImportSequence.innerText += "Import Sequence"
accItemFileImportSequence.onclick = function () {
    createCellWithCode("Images.mosaicview(image_data[JIVECore.Files.loadImageIntoDict()]; fillvalue=0.5, npad=2, ncol=7, rowmajor=true)")
}
const accItemFileImportVideo = document.createElement("a")
accItemFileImportVideo.href = "#"
accItemFileImportVideo.className = "jv-bar-item jv-button"
accItemFileImportVideo.innerHTML = " "
accItemFileImportVideo.innerText += "Import Video"
accItemFileImportVideo.onclick = function () {
    createCellWithCode("imshow(JIVECore.Files.loadImageIntoDict())")
}

accFile.appendChild(accItemFileLoadImage)
accFile.appendChild(accItemFileImportSequence)
accFile.appendChild(accItemFileImportVideo)
itemBarFile.appendChild(accButtonFile)
itemBarFile.appendChild(accFile)

// ADJUST
const itemBar2 = document.createElement("div")

const accButtonAdjust = document.createElement("button")
accButtonAdjust.className = "jv-button jv-block jv-left-align"
accButtonAdjust.name = "Adjust"
accButtonAdjust.innerHTML =
    accButtonAdjust.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
accButtonAdjust.onclick = function () {
    myAccFunc(accAdjust.id)
}

const accAdjust = document.createElement("div")
accAdjust.id = "AccAdjust"
accAdjust.className = "jv-hide jv-card"
accAdjust.style.boxShadow = "none"
accAdjust.style.margin = "0px 0px 5px 15px"

const accItemAdjustContrast = document.createElement("a")
accItemAdjustContrast.href = "#"
accItemAdjustContrast.className = "jv-bar-item jv-button"
accItemAdjustContrast.innerHTML = " "
accItemAdjustContrast.innerText += "Contrast"
accItemAdjustContrast.onclick = function () {
    createCellWithCode("imgo = adjust_histogram(img, LinearStretching(dst_minval = 0, dst_maxval = 1))")
}
const accItemAdjustColor = document.createElement("a")
accItemAdjustColor.href = "#"
accItemAdjustColor.className = "jv-bar-item jv-button"
accItemAdjustColor.innerHTML = " "
accItemAdjustColor.innerText += "Color"

accAdjust.appendChild(accItemAdjustContrast)
accAdjust.appendChild(accItemAdjustColor)
itemBarFile.appendChild(accButtonAdjust)
itemBarFile.appendChild(accAdjust)

// PROCESS
const itemBarProcess = document.createElement("a")
itemBarProcess.href = "#"
itemBarProcess.className = "jv-bar-item jv-button"
itemBarProcess.innerText = "Process"
itemBarProcess.onclick = function () {
    createCellWithCode("ImageShow.gif(img2)")
}

// PLOT
const itemBarPlot = document.createElement("a")
// itemBarPlot.href = "#"
itemBarPlot.className = "jv-bar-item jv-button"
itemBarPlot.innerText = "Plot"
itemBarPlot.onclick = async function () {
    createCellWithCode('@bind m html" add noise:  <input type=range>"')
    await new Promise((r) => setTimeout(r, timeoutValue))
    createCellWithCode(
        'Random.seed!(123) \n x = -3:0.05:3 \n y = exp.(-x .^ 2) \n # m = 15 \n y[1:m] = y[1:m] .+ 0.02 * randn(m) \n fig = Figure(resolution = (600, 400)) \n ax1 = Axis(fig[1, 1], xlabel = "x", ylabel = "f(x)", xgridvisible = true, \n ygridvisible = true) \n lines!(ax1, x, y, color = :red, label = "f(x)") \n axislegend() \n # inset \n  ax2 = Axis(fig, bbox = BBox(140, 250, 250, 350), xticklabelsize = 12, \n yticklabelsize = 12, title = "inset  at (140, 250, 200, 300)") \n lines!(ax2, x, y, color = :red) \n limits!(ax2, -3.1, -1.9, -0.05, 0.05) \n ax2.yticks = [-0.05, 0, 0.05] \n ax2.xticks = [-3, -2.5, -2] \n translate!(ax2.scene, 0, 0, 10) \n fig'
    )
}

// RUN CELL
const itemBarRunCell = document.createElement("a")
// itemBarPlot.href = "#"
itemBarRunCell.className = "jv-bar-item jv-button"
itemBarRunCell.innerText = "Run Cell"
itemBarRunCell.onclick = function () {
    getPlutoCell(getSelection().anchorNode).querySelector("button.runcell").click()
}

// Accordion Template
// const itemBar2 = document.createElement("div")

// const accButton = document.createElement("button")
// accButton.className = "jv-button jv-block jv-left-align"
// accButton.name = "Name"
// accButton.innerHTML =
//     accButton.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
// accButton.onclick = myAccFunc

// const demoAcc = document.createElement("div")
// demoAcc.id = "demoAcc"
// demoAcc.className = "jv-hide jv-card"
// demoAcc.style.boxShadow = "none"
// demoAcc.style.margin = "0px 0px 5px 15px"

// const demoAccItem = document.createElement("a")
// demoAccItem.href = "#"
// demoAccItem.className = "jv-bar-item jv-button"
// demoAccItem.innerHTML = " "
// demoAccItem.innerText += "Contrast"
// const demoAccItem2 = document.createElement("a")
// demoAccItem2.href = "#"
// demoAccItem2.className = "jv-bar-item jv-button"
// demoAccItem2.innerHTML = " "
// demoAccItem2.innerText += "Color"

// demoAcc.appendChild(demoAccItem)
// demoAcc.appendChild(demoAccItem2)
// itemBar2.appendChild(accButton)
// itemBar2.appendChild(demoAcc)

//////////////// Put menu together ///////////////////

sideBar.appendChild(closeBtn)
sideBar.appendChild(titleDiv)
sideBar.appendChild(searchItem)
sideBar.appendChild(itemBarFile)
sideBar.appendChild(itemBarFile)
sideBar.appendChild(itemBarProcess)
sideBar.appendChild(itemBarPlot)
sideBar.appendChild(itemBarRunCell)

// open button in navbar
const openButton = document.createElement("button")
openButton.className = "jv-button-nav jv-large"
openButton.title = "Open JIVE Sidebar"
openButton.innerHTML = '<span> <img width="35" src="./img/jive_logo_eye_crop3.png"></img> </span>'
openButton.style.visibility = "hidden"
openButton.style.opacity = "1"
openButton.style.left = "0rem"
openButton.onclick = w3_open

const navbar = document.querySelector("#at_the_top")
navbar?.prepend(openButton)

// CONSTANTS
const timeoutValue = 500

////////////////
// FUNCTIONS //
///////////////
function w3_open() {
    // @ts-ignore
    frameDiv.style = "margin-left: var(--sidebar-width) !important;"
    // @ts-ignore
    sideBar.style = "width: var(--sidebar-width);"
    sideBar.style.display = "block"
    openButton.style.visibility = "hidden"
}

function w3_close() {
    // @ts-ignore
    frameDiv.style = "margin-left: 0% !important;"
    // @ts-ignore
    sideBar.style = "width: 0% !important;"
    sideBar.style.display = "none"
    openButton.style.visibility = "visible"
}

function myAccFunc(idString) {
    var x = document.getElementById(idString)
    // @ts-ignore
    if (x.className.indexOf("jv-show") == -1) {
        // @ts-ignore
        x.className += " jv-show"
        // x.previousElementSibling.innerHTML = '<img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
        x.previousElementSibling.innerHTML =
            x.previousElementSibling.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up.svg"></img>'
        // x.previousElementSibling.className += " jv-light-gray"
    } else {
        // @ts-ignore
        x.className = x.className.replace(" jv-show", "")
        x.previousElementSibling.innerHTML =
            x.previousElementSibling.name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
        // x.previousElementSibling.className = x.previousElementSibling.className.replace(" jv-light-gray", "")
    }
}

// Obtain pluto-cell HTML element
function getPlutoCell(el) {
    try {
        if (el.tagName !== "PLUTO-CELL") {
            return getPlutoCell(el.parentElement)
        }
        return el
    } catch (e) {}
}

//   Create a line of code
function insertCode(text) {
    const divStart = document.createElement("div")
    divStart.classList.add("cm-line")
    const spanStart = document.createElement("span")
    spanStart.classList.add("ͼx")
    spanStart.innerText = text
    divStart.appendChild(spanStart)

    return divStart
}
//   Create a new cell with code
async function createCellWithCode(textCode) {
    const currentCell = getPlutoCell(getSelection().anchorNode)
    currentCell.querySelector("button.add_cell.after").click()
    await new Promise((r) => setTimeout(r, timeoutValue))
    const newCell = currentCell.nextElementSibling
    const cellCode = newCell.querySelector("div[role='textbox'].cm-content")
    const beginDiv = insertCode(textCode)
    cellCode.firstElementChild.before(beginDiv)
    await new Promise((r) => setTimeout(r, timeoutValue))
    newCell.querySelector("button.foldcode").click()
    await new Promise((r) => setTimeout(r, timeoutValue))
    newCell.querySelector("button.runcell").click()
}
