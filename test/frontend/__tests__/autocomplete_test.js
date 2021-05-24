import { lastElement, saveScreenshot, getTestScreenshotPath, setupPage } from "../helpers/common"
import { getCellIds, importNotebook, waitForCellOutput, getPlutoUrl, prewarmPluto, writeSingleLineInPlutoInput, waitForNoUpdateOngoing } from "../helpers/pluto"

describe("PlutoAutocomplete", () => {
    beforeAll(async () => {
        setupPage(page)
        await prewarmPluto(page)
    })

    beforeEach(async () => {
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
    })

    afterEach(async () => {
        await saveScreenshot(page, getTestScreenshotPath())
        await page.evaluate(() => window.shutdownNotebook())
    })

    it("should get the correct autocomplete suggestions", async () => {
        await importNotebook("autocomplete_notebook.jl")
        await waitForNoUpdateOngoing(page, { polling: 100 })
        const importedCellIds = await getCellIds(page)
        await Promise.all(importedCellIds.map((cellId) => waitForCellOutput(page, cellId)))

        // Add a new cell
        let lastPlutoCellId = lastElement(importedCellIds)
        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitForTimeout(500)

        // Type the partial input
        lastPlutoCellId = lastElement(await getCellIds(page))
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${lastPlutoCellId}"] pluto-input`, "my_su")
        await page.waitForTimeout(500)

        // Trigger autocomplete suggestions
        await page.keyboard.press("Tab")
        await page.waitForSelector(".CodeMirror-hints")
        // Get suggestions
        const suggestions = await page.evaluate(() => Array.from(document.querySelectorAll(".CodeMirror-hints li")).map((suggestion) => suggestion.textContent))
        suggestions.sort()
        expect(suggestions).toEqual(["my_subtract", "my_sum1", "my_sum2"])
    })

    // Skipping because this doesn't work with FuzzyCompletions anymore
    it.skip("should automatically autocomplete if there is only one possible suggestion", async () => {
        await importNotebook("autocomplete_notebook.jl")
        const importedCellIds = await getCellIds(page)
        await Promise.all(importedCellIds.map((cellId) => waitForCellOutput(page, cellId)))

        // Add a new cell
        let lastPlutoCellId = lastElement(importedCellIds)
        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitForTimeout(500)

        // Type the partial input
        lastPlutoCellId = lastElement(await getCellIds(page))
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${lastPlutoCellId}"] pluto-input`, "my_sub")

        // Trigger autocomplete
        await page.keyboard.press("Tab")
        await page.waitForTimeout(5000)

        // Get suggestions
        const autocompletedInput = await page.evaluate(
            (selector) => document.querySelector(selector).textContent.trim(),
            `pluto-cell[id="${lastPlutoCellId}"] pluto-input .CodeMirror-line`
        )
        expect(autocompletedInput).toEqual("my_subtract")
    })
})
