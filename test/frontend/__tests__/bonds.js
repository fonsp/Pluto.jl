import puppeteer from "puppeteer"
import { saveScreenshot, createPage, paste } from "../helpers/common"
import { createNewNotebook, getPlutoUrl, runAllChanged, setupPlutoBrowser, shutdownCurrentNotebook, waitForPlutoToCalmDown } from "../helpers/pluto"

// https://github.com/fonsp/Pluto.jl/issues/928
describe("Bonds should run once when refreshing page", () => {
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

    it("should not rerun bond values when refreshing page", async () => {
        await createNewNotebook(page)

        await paste(
            page,
            `
# ╔═╡ 1e9cb0de-7f8f-11eb-2e49-37ac9451e455
@bind x html"<input type=range>"

# ╔═╡ 1a96fda9-73fa-4bd0-b80a-4db3593fd7d8
@bind y html"<input type=range>"

# ╔═╡ 1a96fda9-73fa-4bd0-b80a-4db3593fd7d8
@bind z html"<input type=range>"
`
        )
        await runAllChanged(page)

        await paste(
            page,
            `
# ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
let x; y; z; numberoftimes[] += 1 end

# ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
numberoftimes = Ref(0)
        `
        )

        await runAllChanged(page)
        await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))
        await waitForPlutoToCalmDown(page)

        let output_after_running_bonds = await page.evaluate(() => {
            return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        })
        expect(output_after_running_bonds).not.toBe("")

        // Let's refresh and see
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] })
        await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))
        await waitForPlutoToCalmDown(page)
        let output_after_reload = await page.evaluate(() => {
            return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        })
        expect(output_after_reload).toBe(output_after_running_bonds)
    })
})
