import puppeteer from "puppeteer"
import { saveScreenshot, getTestScreenshotPath, setupPage, paste } from "../helpers/common"
import { createNewNotebook, getPlutoUrl, prewarmPluto, waitForNoUpdateOngoing } from "../helpers/pluto"

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
`
        )
        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)

        await page.waitForSelector(`pluto-cell.running`, { visible: true, timeout: 0 })
        await waitForNoUpdateOngoing(page)

        await paste(
            page,
            `
# ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
let x; y; z; numberoftimes[] += 1 end

# ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
numberoftimes = Ref(0)
        `
        )

        await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        await page.click(`.runallchanged`)
        await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))

        await waitForNoUpdateOngoing(page)
        let output_after_running_bonds = await page.evaluate(() => {
            return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        })
        expect(output_after_running_bonds).not.toBe("")

        // Let's refresh and see
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] })
        await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))
        await waitForNoUpdateOngoing(page)
        let output_after_reload = await page.evaluate(() => {
            return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        })
        expect(output_after_reload).toBe(output_after_running_bonds)
    })
})
