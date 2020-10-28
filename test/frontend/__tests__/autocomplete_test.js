import { lastElement, dismissBeforeUnloadDialogs, saveScreenshot, getTestScreenshotPath } from "../helpers/common"
import { getCellIds, importNotebook, waitForCellOutput, getPlutoUrl, prewarmPluto } from "../helpers/pluto"

jest.setTimeout(100000)

describe("PlutoAutocomplete", () => {
    beforeAll(async () => {
        dismissBeforeUnloadDialogs(page)
        await prewarmPluto(page)
    })

    beforeEach(async () => {
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
    })

    afterEach(async () => {
        await saveScreenshot(page, getTestScreenshotPath())
    })

    it("should get the correct autocomplete suggestions", async () => {
        await importNotebook("autocomplete_notebook.jl")
        const importedCellIds = await getCellIds(page)
        await Promise.all(importedCellIds.map((cellId) => waitForCellOutput(page, cellId)))

        // Add a new cell
        let lastPlutoCellId = lastElement(importedCellIds)
        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitFor(500)

        // Type the partial input
        lastPlutoCellId = lastElement(await getCellIds(page))
        await page.type(`pluto-cell[id="${lastPlutoCellId}"] pluto-input textarea`, "my_su")

        // Trigger autocomplete suggestions
        await page.keyboard.press("Tab")
        await page.waitForSelector(".CodeMirror-hints")
        // Get suggestions
        const suggestions = await page.evaluate(() => Array.from(document.querySelectorAll(".CodeMirror-hints li")).map((suggestion) => suggestion.textContent))
        suggestions.sort()
        expect(suggestions).toEqual(["my_subtract", "my_sum1", "my_sum2"])
    })

    it("should automatically autocomplete if there is only one possible suggestion", async () => {
        await importNotebook("autocomplete_notebook.jl")
        const importedCellIds = await getCellIds(page)
        await Promise.all(importedCellIds.map((cellId) => waitForCellOutput(page, cellId)))

        // Add a new cell
        let lastPlutoCellId = lastElement(importedCellIds)
        await page.click(`pluto-cell[id="${lastPlutoCellId}"] .add_cell.after`)
        await page.waitFor(500)

        // Type the partial input
        lastPlutoCellId = lastElement(await getCellIds(page))
        await page.type(`pluto-cell[id="${lastPlutoCellId}"] pluto-input textarea`, "my_sub")

        // Trigger autocomplete
        await page.keyboard.press("Tab")
        await page.waitFor(5000)

        // Get suggestions
        const autocompletedInput = await page.evaluate(
            (selector) => document.querySelector(selector).textContent.trim(),
            `pluto-cell[id="${lastPlutoCellId}"] pluto-input .CodeMirror-line`
        )
        expect(autocompletedInput).toEqual("my_subtract")
    })
})
