import {
    waitForContent,
    lastElement,
    dismissBeforeUnloadDialogs,
    saveScreenshot,
    getTestScreenshotPath,
    waitForContentToBecome,
    dismissVersionDialogs,
    setupPage,
    paste,
    countCells,
} from "../helpers/common"
import {
    createNewNotebook,
    getCellIds,
    waitForCellOutput,
    getPlutoUrl,
    prewarmPluto,
    waitForCellOutputToChange,
    keyboardPressInPlutoInput,
    writeSingleLineInPlutoInput,
} from "../helpers/pluto"

const manuallyEnterCells = async (page, cells) => {
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

describe("Paste Functionality", () => {
    beforeAll(async () => {
        setupPage(page)
        await prewarmPluto(page)
    })

    beforeEach(async () => {
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
        await createNewNotebook(page)
        await page.waitForSelector("pluto-input", { visible: true })
    })

    afterEach(async () => {
        await saveScreenshot(page, getTestScreenshotPath())
    })

    it("should *not* create new cell when you paste code into cell", async () => {
        const cells = ["a = 1", "b = 2", "c = 3", "a + b + c"]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })
        const initialLastCellContent = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "6")
        expect(initialLastCellContent).toBe("6")

        // Change second cell
        const secondCellInputSelector = `pluto-cell[id="${plutoCellIds[1]}"] pluto-input`

        // Delete 2
        await keyboardPressInPlutoInput(page, secondCellInputSelector, "Backspace")

        // Enter 10
        await writeSingleLineInPlutoInput(page, secondCellInputSelector, "10")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        const reactiveLastCellContent = await waitForCellOutputToChange(page, lastElement(plutoCellIds), "6")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        // Pasting "some code" into codemirror should *not* add new cell
        await paste(page, "some code", `pluto-cell[id="${plutoCellIds[1]}"] pluto-input .CodeMirror .CodeMirror-line`)
        await page.waitForTimeout(500)

        expect(await countCells()).toBe(5)
    })

    it("should create new cell when you paste cell into page", async () => {
        const cells = ["a = 1", "b = 2", "c = 3", "a + b + c"]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })
        const initialLastCellContent = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "6")
        expect(initialLastCellContent).toBe("6")

        // Change second cell
        const secondCellInputSelector = `pluto-cell[id="${plutoCellIds[1]}"] pluto-input`

        // Delete 2
        await keyboardPressInPlutoInput(page, secondCellInputSelector, "Backspace")

        // Enter 10
        await writeSingleLineInPlutoInput(page, secondCellInputSelector, "10")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        const reactiveLastCellContent = await waitForCellOutputToChange(page, lastElement(plutoCellIds), "6")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        // Pasting "some code" into codemirror should *not* add new cell
        await paste(page, "some code", `pluto-cell[id="${plutoCellIds[1]}"] pluto-input .CodeMirror .CodeMirror-line`)
        await page.waitForTimeout(500)

        expect(await countCells()).toBe(5)
        // Pasting a cell into page should add a cell
        await paste(
            page,
            `# ╔═╡ 0cacae2a-7e8f-11eb-2747-e3d010c9e054
        
        1+1
        `
        )
        await page.waitForTimeout(500)

        expect(await countCells()).toBe(6)
    })

    it("should create new cell when you paste cell into cell", async () => {
        const cells = ["a = 1", "b = 2", "c = 3", "a + b + c"]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })
        const initialLastCellContent = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "6")
        expect(initialLastCellContent).toBe("6")

        // Change second cell
        const secondCellInputSelector = `pluto-cell[id="${plutoCellIds[1]}"] pluto-input`

        // Delete 2
        await keyboardPressInPlutoInput(page, secondCellInputSelector, "Backspace")

        // Enter 10
        await writeSingleLineInPlutoInput(page, secondCellInputSelector, "10")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        const reactiveLastCellContent = await waitForCellOutputToChange(page, lastElement(plutoCellIds), "6")

        await page.click(`pluto-cell[id="${plutoCellIds[1]}"] .runcell`)

        // Pasting "some code" into codemirror should *not* add new cell
        await paste(page, "some code", `pluto-cell[id="${plutoCellIds[1]}"] pluto-input .CodeMirror .CodeMirror-line`)
        await page.waitForTimeout(500)

        expect(await countCells()).toBe(5)
        // Pasting a cell into page should add a cell
        await paste(
            page,
            `# ╔═╡ 0cacae2a-7e8f-11eb-2747-e3d010c9e054
        
        1+1
        `
        )

        await page.waitForTimeout(500)

        expect(await countCells()).toBe(6)
        // Paste a cell into Codemirror should add a cell
        await paste(
            page,
            `# ╔═╡ 0cacae2a-7e8f-11eb-2747-e3d010c9e054
        
        1+1
        `,
            `pluto-cell:nth-child(6) pluto-input .CodeMirror .CodeMirror-line`
        )

        await page.waitForTimeout(500)

        expect(await countCells()).toBe(7)

        await page.waitForTimeout(500)
        expect(reactiveLastCellContent).toBe("14")
    })
})
