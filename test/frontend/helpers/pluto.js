import fs from "fs"
import {
    clickAndWaitForNavigation,
    getFixtureNotebookPath,
    getTemporaryNotebookPath,
    waitForContent,
    waitForContentToChange,
    getTextContent,
    lastElement,
} from "./common"

export const getPlutoUrl = () => `http://localhost:${process.env.PLUTO_PORT}`

export const prewarmPluto = async (page) => {
    await browser.defaultBrowserContext().overridePermissions(getPlutoUrl(), ["clipboard-read", "clipboard-write"])
    await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
    await createNewNotebook(page)
    const cellInputSelector = "pluto-input .CodeMirror textarea"
    await page.waitForSelector(cellInputSelector, { visible: true })
    await writeSingleLineInPlutoInput(page, "pluto-input", "21*2")

    const runSelector = ".runcell"
    await page.waitForSelector(runSelector, { visible: true })
    await page.click(runSelector)
    await waitForContent(page, "pluto-output")
    await page.evaluate(() => shutdownNotebook())
}

export const createNewNotebook = async (page) => {
    const newNotebookSelector = 'a[href="new"]'
    await page.waitForSelector(newNotebookSelector)
    await clickAndWaitForNavigation(page, newNotebookSelector)
}

export const importNotebook = async (notebookName) => {
    // Copy notebook before using it, so we don't mess it up with test changes
    const notebookPath = getFixtureNotebookPath(notebookName)
    const artifactsPath = getTemporaryNotebookPath()
    fs.copyFileSync(notebookPath, artifactsPath)

    const openFileInputSelector = "pluto-filepicker textarea"
    await page.type(openFileInputSelector, artifactsPath)
    const openFileButton = "pluto-filepicker button"
    return clickAndWaitForNavigation(page, openFileButton)
}

export const getCellIds = (page) => page.evaluate(() => Array.from(document.querySelectorAll("pluto-cell")).map((cell) => cell.id))

export const waitForCellOutput = (page, cellId) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContent(page, cellOutputSelector)
}

export const waitForCellOutputToChange = (page, cellId, currentOutput) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContentToChange(page, cellOutputSelector, currentOutput)
}

export const waitForNoUpdateOngoing = (page, options = {}) => page.waitForFunction(() => document.body._update_is_ongoing === false, options)

export const writeSingleLineInPlutoInput = async (page, plutoInputSelector, text) => {
    await page.type(`${plutoInputSelector} .CodeMirror textarea`, text)
    // Wait for CodeMirror to process the input and display the text
    return page.waitForFunction(
        (plutoInputSelector, text) => {
            const codeMirrorLine = document.querySelector(`${plutoInputSelector} .CodeMirror-line`)
            return codeMirrorLine !== null && codeMirrorLine.textContent.endsWith(text)
        },
        { polling: 100 },
        plutoInputSelector,
        text
    )
}

export const keyboardPressInPlutoInput = async (page, plutoInputSelector, key) => {
    const currentLineText = await getTextContent(`${plutoInputSelector} .CodeMirror-line`)
    await page.focus(`${plutoInputSelector} .CodeMirror  textarea`)
    await page.waitForTimeout(500)
    await page.keyboard.press(key)
    await page.waitForTimeout(500)
    // Wait for CodeMirror to process the input and display the text
    return waitForContentToChange(page, `${plutoInputSelector} .CodeMirror-line`, currentLineText)
}

export const manuallyEnterCells = async (page, cells) => {
    const plutoCellIds = []
    for (const cell of cells) {
        const plutoCellId = lastElement(await getCellIds(page))
        plutoCellIds.push(plutoCellId)
        await page.waitForSelector(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`)
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${plutoCellId}"] pluto-input`, cell)

        await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
        await page.waitForFunction((nCells) => document.querySelectorAll("pluto-cell").length === nCells, {}, plutoCellIds.length + 1)
    }
    return plutoCellIds
}
