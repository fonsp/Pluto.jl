import { myAccFunc, createCellWithCode, createMDCellWithUI, getVarName, resolveAfterTimeout } from "./Jive-Sidebar/jive_helpers.js"

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

addCss("./jive_components/jive.css")

// CONSTANTS
const timeoutValue = 1000

// make space for sidebar
const frameDiv = document.getElementById("frame")
// @ts-ignore
frameDiv.style = `
    margin-left: var(--sidebar-width);
    `

/////////////// open button in navbar ////////////////////
const openButton = document.createElement("button")
openButton.className = "jv-button-nav jv-large"
openButton.title = "Open JIVE Sidebar"
openButton.innerHTML = '<span> <img width="50" src="./img/jive_logo.png"></img> </span>'
openButton.style.visibility = "hidden"
openButton.style.opacity = "1"
openButton.style.left = "0rem"
openButton.onclick = w3_open

const navbar = document.querySelector("#at_the_top")
navbar?.prepend(openButton)

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
titleDiv.innerHTML = '<h2> <img width="50"  src="./img/jive_logo.png"></img>  </h2> <md-block> ###### v.0.0  \n --- </md-block>'
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

///////////////// MENUS ///////////////////////

////////// IMPORT MENUS /////////////
import { createFileMenu } from "./Jive-Sidebar/Jive-FileMenu.js"
import { createAdjustMenu } from "./Jive-Sidebar/Jive-AdjustMenu.js"
import { createEditMenu } from "./Jive-Sidebar/Jive-EditMenu.js"
import { createProcessMenu } from "./Jive-Sidebar/Jive-ProcessMenu.js"
import { createViewMenu } from "./Jive-Sidebar/Jive-ViewMenu.js"

// FOLDERS
const itemBarFile = createFileMenu(timeoutValue)
const itemBarAdjust = createAdjustMenu(timeoutValue)
const itemBarEdit = createEditMenu(timeoutValue)
const itemBarProcess = createProcessMenu(timeoutValue)
const itemBarView = createViewMenu(timeoutValue)

//////////////// Put menu together ///////////////////

sideBar.appendChild(closeBtn)
sideBar.appendChild(titleDiv)
sideBar.appendChild(searchItem)
sideBar.appendChild(itemBarFile)
sideBar.appendChild(itemBarEdit)
sideBar.appendChild(itemBarAdjust)
sideBar.appendChild(itemBarProcess)
sideBar.appendChild(itemBarView)

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
