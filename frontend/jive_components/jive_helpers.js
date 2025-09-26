// Accordion open/close
export function myAccFunc(idString) {
    var x = document.getElementById(idString)
    if (x && x.className.indexOf("jv-show") == -1) {
        x.className += " jv-show"
        if (x.previousElementSibling) {
            const name = x.previousElementSibling.getAttribute("name") || ""
            x.previousElementSibling.innerHTML =
                name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-up.svg"></img>'
        }
    } else if (x) {
        x.className = x.className.replace(" jv-show", "")
        if (x.previousElementSibling) {
            const name = x.previousElementSibling.getAttribute("name") || ""
            x.previousElementSibling.innerHTML =
                name + ' <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
        }
    }
}

// Wait for timeout
export function resolveAfterTimeout(t) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("resolved")
        }, t)
    })
}

// Obtain pluto-cell HTML element
export function getPlutoCell(el) {
    try {
        if (el.tagName !== "PLUTO-CELL") {
            return getPlutoCell(el.parentElement)
        }
        return el
    } catch (e) {}
}

// Create variable name
export function getVarName(prefix) {
    return prefix + Date.now()
}

// Create div with code to insert in a cell
export function insertCode(text) {
    const divStart = document.createElement("div")
    divStart.classList.add("cm-line")
    const spanStart = document.createElement("span")
    spanStart.classList.add("ͼx")
    spanStart.innerText = text
    divStart.appendChild(spanStart)
    return divStart
}

//   Create a new cell with code
export async function createCellWithCode(textCode) {
    const selection = getSelection()
    if (!selection || !selection.anchorNode) {
        throw new Error("No selection or anchorNode found.")
    }
    const currentCell = getPlutoCell(selection.anchorNode)
    const cellCode = currentCell.querySelector("div[role='textbox'].cm-content")
    const beginDiv = insertCode(textCode)
    cellCode.firstElementChild.before(beginDiv)
    currentCell.querySelector("button.foldcode").click()
    currentCell.querySelector("button.runcell").click()
    currentCell.querySelector("button.add_cell.after").click()
}

// Create div with Markdown code to insert in a cell
export function insertMD(title, text) {
    const divStart = document.createElement("div")
    divStart.classList.add("cm-line")
    const spanStart = document.createElement("span")
    spanStart.classList.add("ͼx")
    const startText = 'md"""'
    const titleText = "##### " + title
    const endText = '"""'
    const finalText = startText + "\n" + titleText + "\n" + text + "\n" + endText
    spanStart.innerText = finalText
    divStart.appendChild(spanStart)
    return divStart
}

//   Create a new MD cell with PlutoUI code
export async function createMDCellWithUI(title, textCode) {
    const selection = getSelection();
    if (!selection || !selection.anchorNode) {
        throw new Error("No selection or anchorNode found.");
    }
    const currentCell = getPlutoCell(selection.anchorNode);
    const cellCode = currentCell.querySelector("div[role='textbox'].cm-content")
    const beginDiv = insertMD(title, textCode)
    cellCode.firstElementChild.before(beginDiv)
    currentCell.querySelector("button.foldcode").click()
    currentCell.querySelector("button.runcell").click()
    currentCell.querySelector("button.add_cell.after").click()
}
