import puppeteer from "puppeteer"
import { saveScreenshot, createPage } from "../helpers/common"
import { importNotebook, getPlutoUrl, shutdownCurrentNotebook, setupPlutoBrowser } from "../helpers/pluto"

describe("published_to_js", () => {
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

    it("Should correctly show published_to_js in cell output, and in logs", async () => {
        await importNotebook(page, "published_to_js.jl", { timeout: 120 * 1000 })

        let output_of_published = await page.evaluate(() => {
            return document.querySelector("#to_cell_output")?.textContent
        })
        expect(output_of_published).toBe("[1,2,3] MAGIC!")

        // The log content is not shown, so #to_cell_log does not exist
        let log_of_published = await page.evaluate(() => {
            return document.querySelector("#to_cell_log")?.textContent
        })
        // This test is currently broken, due to https://github.com/fonsp/Pluto.jl/issues/2092
        expect(log_of_published).toBe("[4,5,6] MAGIC!")
    })
})
