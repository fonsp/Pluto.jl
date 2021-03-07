import { saveScreenshot, getTestScreenshotPath, waitForContentToBecome, setupPage } from "../helpers/common"
import { createNewNotebook, getPlutoUrl, prewarmPluto, manuallyEnterCells } from "../helpers/pluto"

describe("Bonds should run once", () => {
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

    it("should not rerun bond values when refreshing page", async () => {
        const cells = [`@bind x html"<input type=range>"`, `@bind y html"<input type=range>"`, "numberoftimes = Ref(0)", `let x; y; numberoftimes[] += 1 end`]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })
        let lastCellOutput = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "1")
        expect(lastCellOutput).toBe("1")
        // Let's refresh and see
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] })

        await page.waitForTimeout(1000)

        lastCellOutput = await waitForContentToBecome(page, `pluto-cell[id="${plutoCellIds[3]}"] pluto-output`, "1")
        expect(lastCellOutput).toBe("1")
    })
})
