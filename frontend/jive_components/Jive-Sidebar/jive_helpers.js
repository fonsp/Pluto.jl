// Accordion open/close
export function myAccFunc(idString) {
    const x = document.getElementById(idString)
    if (!x) return

    if (!x.classList.contains("jv-show")) {
        x.classList.add("jv-show")
        x.classList.remove("jv-hide")
    } else {
        x.classList.remove("jv-show")
        x.classList.add("jv-hide")
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
    const selection = getSelection()
    if (!selection || !selection.anchorNode) {
        throw new Error("No selection or anchorNode found.")
    }
    const currentCell = getPlutoCell(selection.anchorNode)
    const cellCode = currentCell.querySelector("div[role='textbox'].cm-content")
    const beginDiv = insertMD(title, textCode)
    cellCode.firstElementChild.before(beginDiv)
    currentCell.querySelector("button.foldcode").click()
    currentCell.querySelector("button.runcell").click()
    currentCell.querySelector("button.add_cell.after").click()
}

export function updateAllChevrons() {
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

export function closeOtherAccordions(currentId, titlePrefix = "AccFile_") {
    document.querySelectorAll(`[id^="${titlePrefix}"]`).forEach((div) => {
        if (div.id !== currentId && div.classList.contains("jv-show")) {
            div.classList.remove("jv-show")
            div.classList.add("jv-hide")
        }
    })
}
