import puppeteer from "puppeteer"
import { lastElement, saveScreenshot, createPage } from "../helpers/common"
import {
    getCellIds,
    waitForCellOutput,
    importNotebook,
    getPlutoUrl,
    prewarmPluto,
    writeSingleLineInPlutoInput,
    shutdownCurrentNotebook,
    setupPlutoBrowser,
    runAllChanged,
} from "../helpers/pluto"

describe("PlutoImportNotebook", () => {
    /**
     * Launch a shared browser instance for all tests.
     * I don't use jest-puppeteer because it takes away a lot of control and works buggy for me,
     * so I need to manually create the shared browser.
     * @type {puppeteer.Browser}
     */
    let browser = null
    /** @type {puppeteer.Page} */
    let page = null
    beforeAll(async () => {
        browser = await setupPlutoBrowser()
    })
    beforeEach(async () => {
        page = await createPage(browser)
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
    })
    afterEach(async () => {
        await saveScreenshot(page)
        await shutdownCurrentNotebook(page)
        await page.close()
        page = null
    })
    afterAll(async () => {
        await browser.close()
        browser = null
    })

    test.each([
        ["function_sum_notebook.jl", "3"],
        ["simple_sum_notebook.jl", "6"],
    ])("should import notebook %s with last cell output %s", async (notebookName, expectedLastCellOutput) => {
        await importNotebook(page, notebookName)
        const cellIds = await getCellIds(page)
        const outputs = await Promise.all(cellIds.map((cellId) => waitForCellOutput(page, cellId)))
        expect(lastElement(outputs)).toBe(expectedLastCellOutput)
    })

    it("should add a new cell and re-evaluate the notebook", async () => {
        await importNotebook(page, "function_sum_notebook.jl")
        // Add a new cell
        let lastPlutoCellId = lastElement(await getCellIds(page))
        await waitForCellOutput(page, lastPlutoCellId)

        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitForTimeout(500)

        // Use the previously defined sum function in the new cell
        lastPlutoCellId = lastElement(await getCellIds(page))
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${lastPlutoCellId}"] pluto-input`, "sum(2, 3)")
        await runAllChanged(page)
        const lastCellContent = await waitForCellOutput(page, lastPlutoCellId)
        expect(lastCellContent).toBe("5")
    })
})
