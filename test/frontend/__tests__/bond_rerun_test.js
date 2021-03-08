import { saveScreenshot, getTestScreenshotPath, waitForContentToBecome, setupPage, paste } from "../helpers/common"
import { createNewNotebook, getPlutoUrl, prewarmPluto, manuallyEnterCells, waitForCellOutputToChange } from "../helpers/pluto"

describe("Bonds should run once", () => {
    beforeAll(async () => {
        setupPage(page)
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
        await paste(
            page,
            `
# ╔═╡ 1e9cb0de-7f8f-11eb-2e49-37ac9451e455
@bind x html"<input type=range>"

# ╔═╡ 1a96fda9-73fa-4bd0-b80a-4db3593fd7d8
@bind y html"<input type=range>"

# ╔═╡ 1a96fda9-73fa-4bd0-b80a-4db3593fd7d8
@bind z html"<input type=range>"

# ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
numberoftimes = Ref(0)
`
        )

        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })

        await paste(page, `let x; y; z; numberoftimes[] += 1 end`)
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForSelector(`body:not(.update_is_ongoing)`, { polling: 100 })
        await page.waitForTimeout(750)
        const expectation = "1"
        let lastCellOutput = await waitForContentToBecome(page, `pluto-cell:nth-child(5) pluto-output`, expectation)
        expect(lastCellOutput).toBe(expectation)
        await page.waitForTimeout(1000)
        // Let's refresh and see
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] })

        await page.waitForTimeout(1000)

        lastCellOutput = await page.evaluate(() => {
            return document.querySelector("pluto-cell:nth-child(5) pluto-output").textContent
        })
        expect(lastCellOutput).toBe(expectation)
    })
})
