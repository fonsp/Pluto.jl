import puppeteer from "puppeteer"
import { waitForContent, lastElement, saveScreenshot, getTestScreenshotPath, waitForContentToBecome, setupPage } from "../helpers/common"
import {
    createNewNotebook,
    getCellIds,
    waitForCellOutput,
    waitForNoUpdateOngoing,
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
        await page.waitForSelector(`pluto-cell[id="${plutoCellId}"] pluto-input .cm-content`)
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${plutoCellId}"] pluto-input`, cell)

        await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
        await page.waitForFunction((nCells) => document.querySelectorAll("pluto-cell").length === nCells, {}, plutoCellIds.length + 1)
    }
    return plutoCellIds
}

describe("PlutoNewNotebook", () => {
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
        browser = await puppeteer.launch({
            headless: process.env.HEADLESS !== "false",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            devtools: false,
        })

        let page = await browser.newPage()
        setupPage(page)
        await prewarmPluto(browser, page)
        await page.close()
    })
    beforeEach(async () => {
        page = await browser.newPage()
        setupPage(page)
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
        await createNewNotebook(page)
        await page.waitForSelector("pluto-input", { visible: true })
    })
    afterEach(async () => {
        await saveScreenshot(page, getTestScreenshotPath())
        // @ts-ignore
        await page.evaluate(() => window.shutdownNotebook?.())
        await page.close()
        page = null
    })
    afterAll(async () => {
        await browser.close()
        browser = null
    })

    it("should create new notebook", async () => {
        // A pluto-input should exist in a new notebook
        const plutoInput = await page.evaluate(() => document.querySelector("pluto-input"))
        expect(plutoInput).not.toBeNull()
    })

    it("should run a single cell", async () => {
        const cellInputSelector = "pluto-input .cm-content"
        await page.waitForSelector(cellInputSelector)
        await writeSingleLineInPlutoInput(page, "pluto-input", "1+1")

        const runSelector = ".runcell"
        await page.waitForSelector(runSelector, { visible: true })
        await page.click(runSelector)

        const content = await waitForContent(page, "pluto-output")
        expect(content).toBe("2")
    })

    it("should run multiple cells", async () => {
        const cells = ["a = 1", "b = 2", "c = 3", "a + b + c"]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await waitForNoUpdateOngoing(page, { polling: 100 })
        const content = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "6")
        expect(content).toBe("6")
    })

    it("should reactively re-evaluate dependent cells", async () => {
        const cells = ["a = 1", "b = 2", "c = 3", "a + b + c"]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await waitForNoUpdateOngoing(page, { polling: 100 })
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

        expect(reactiveLastCellContent).toBe("14")
    })
})
