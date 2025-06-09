import puppeteer from "puppeteer"
import { lastElement, saveScreenshot, createPage } from "../helpers/common.js"
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
    gotoPlutoMainMenu,
} from "../helpers/pluto.js"

describe("PlutoSampleNotebookTest1", () => {
    let browser = null
    let page = null

    beforeAll(async () => {
        browser = await setupPlutoBrowser()
    })

    beforeEach(async () => {
        page = await createPage(browser)
        await gotoPlutoMainMenu(page)
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

    it("should load test1.jl and check initial output", async () => {
        await importNotebook(page, "../../sample/test1.jl")  // relative to project root
        const cellIds = await getCellIds(page)
        
        expect(cellIds.length).toBeGreaterThan(0)

        // Check output of the first cell (assume it has a visible output)
        const firstOutput = await waitForCellOutput(page, cellIds[0])
        expect(typeof firstOutput).toBe("string")
        expect(firstOutput.length).toBeGreaterThan(0)
    })

    it("should simulate user input and trigger reactivity", async () => {
        await importNotebook(page, "../../sample/test1.jl")
        let lastPlutoCellId = lastElement(await getCellIds(page))
        await waitForCellOutput(page, lastPlutoCellId)

        // Add a new cell after the last one
        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitForTimeout(300)

        // Get new cell ID and write something reactive
        lastPlutoCellId = lastElement(await getCellIds(page))
        const newExpr = `sqrt(16)`  // Replace with something valid in context
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${lastPlutoCellId}"] pluto-input`, newExpr)

        await runAllChanged(page)

        const newOutput = await waitForCellOutput(page, lastPlutoCellId)
        expect(newOutput).toBe("4")
    })
})

