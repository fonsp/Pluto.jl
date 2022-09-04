import fs from "fs"
import { platform } from "process"
import { Page } from "puppeteer"
import {
    clickAndWaitForNavigation,
    getFixtureNotebookPath,
    getTemporaryNotebookPath,
    waitForContent,
    waitForContentToChange,
    getTextContent,
    lastElement,
} from "./common"

// if (!process.env.PLUTO_PORT) {
//     throw new Error("You didn't set the PLUTO_PORT environment variable")
// }
export const getPlutoUrl = () => `http://localhost:${process.env.PLUTO_PORT}`

/**
 * @param {Page} page
 */
export const prewarmPluto = async (browser, page) => {
    await browser.defaultBrowserContext().overridePermissions(getPlutoUrl(), ["clipboard-read", "clipboard-write"])
    await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
    await createNewNotebook(page)
    const cellInputSelector = "pluto-input .cm-content"
    await page.waitForSelector(cellInputSelector, { visible: true })
    await writeSingleLineInPlutoInput(page, "pluto-input", "21*2")

    const runSelector = ".runcell"
    await page.waitForSelector(runSelector, { visible: true })
    await page.click(runSelector)
    await waitForContent(page, "pluto-output")
    await page.evaluate(() => {
        // @ts-ignore
        shutdownNotebook()
    })
}

/**
 * @param {Page} page
 */
export const createNewNotebook = async (page) => {
    const newNotebookSelector = 'a[href="new"]'
    await page.waitForSelector(newNotebookSelector)
    await clickAndWaitForNavigation(page, newNotebookSelector)
    await waitForPlutoToCalmDown(page)
}

/**
 * @param {Page} page
 * @param {string} notebookName`
 */
export const importNotebook = async (page, notebookName) => {
    // Copy notebook before using it, so we don't mess it up with test changes
    const notebookPath = getFixtureNotebookPath(notebookName)
    const artifactsPath = getTemporaryNotebookPath()
    fs.copyFileSync(notebookPath, artifactsPath)
    const openFileInputSelector = "pluto-filepicker"
    await writeSingleLineInPlutoInput(page, openFileInputSelector, artifactsPath)
    // await writeSingleLineInPlutoInput(page, openFileInputSelector, notebookPath)

    const openFileButton = "pluto-filepicker button"
    await clickAndWaitForNavigation(page, openFileButton)
    await waitForPlutoToCalmDown(page)
}

/**
 * @param {Page} page
 */
export const getCellIds = (page) => page.evaluate(() => Array.from(document.querySelectorAll("pluto-cell")).map((cell) => cell.id))

/**
 * @param {Page} page
 */
export const waitForPlutoToCalmDown = async (page) => {
    await page.waitForTimeout(1000)
    await page.waitForFunction(
        () => document?.querySelector("body")?._update_is_ongoing === false && document?.querySelector(`pluto-cell.running, pluto-cell.queued`) === null
    )
}

/**
 * @param {Page} page
 * @param {string} cellId
 */
export const waitForCellOutput = (page, cellId) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContent(page, cellOutputSelector)
}

/**
 * @param {Page} page
 * @param {string} cellId
 * @param {string} currentOutput
 */
export const waitForCellOutputToChange = (page, cellId, currentOutput) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContentToChange(page, cellOutputSelector, currentOutput)
}

export const waitForNoUpdateOngoing = async (page, options = {}) => {
    await page.waitForTimeout(1000)
    return await page.waitForFunction(() => document.querySelector("body")?._update_is_ongoing === false, options)
}

/**
 * @param {Page} page
 * @param {string} plutoInputSelector
 * @param {string} text
 */
export const writeSingleLineInPlutoInput = async (page, plutoInputSelector, text) => {
    await page.type(`${plutoInputSelector} .cm-content`, text)
    // Wait for CodeMirror to process the input and display the text
    return await page.waitForFunction(
        (plutoInputSelector, text) => {
            const codeMirrorLine = document.querySelector(`${plutoInputSelector} .cm-line`)
            return codeMirrorLine?.textContent?.endsWith?.(text) ?? false
        },
        { polling: 100 },
        plutoInputSelector,
        text
    )
}

/**
 * @param {Page} page
 * @param {string} plutoInputSelector
 * @param {import("puppeteer").KeyInput} key
 */
export const keyboardPressInPlutoInput = async (page, plutoInputSelector, key) => {
    const currentLineText = await getTextContent(page, `${plutoInputSelector} .cm-line`)
    await page.focus(`${plutoInputSelector} .cm-content`)
    await page.waitForTimeout(500)
    // Move to end of the input
    await page.keyboard.down(platform === "darwin" ? "Meta" : "Control")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.up(platform === "darwin" ? "Meta" : "Control")
    // Press the key we care about
    await page.keyboard.press(key)
    await page.waitForTimeout(500)
    // Wait for CodeMirror to process the input and display the text
    return waitForContentToChange(page, `${plutoInputSelector} .cm-line`, currentLineText)
}

/**
 * @param {Page} page
 * @param {string[]} cells
 */
export const manuallyEnterCells = async (page, cells) => {
    const plutoCellIds = []
    for (const cell of cells) {
        const plutoCellId = lastElement(await getCellIds(page))
        plutoCellIds.push(plutoCellId)
        await page.waitForSelector(`pluto-cell[id="${plutoCellId}"] pluto-input .cm-content`)
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${plutoCellId}"] pluto-input`, cell)

        await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
        await page.waitForFunction((nCells) => document.querySelectorAll("pluto-cell").length === nCells, {}, plutoCellIds.length + 1)
    }
    return plutoCellIds
}
