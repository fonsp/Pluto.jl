import puppeteer from "puppeteer"
import { saveScreenshot, createPage } from "../helpers/common"
import { importNotebook, getPlutoUrl, prewarmPluto, waitForNoUpdateOngoing, shutdownCurrentNotebook, setupPlutoBrowser } from "../helpers/pluto"

describe("embed_display timing", () => {
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

    it("should get the correct autocomplete suggestions", async () => {
        await importNotebook(page, "embed_display_timing.jl")
        await waitForNoUpdateOngoing(page, { polling: 100 })

        await page.waitForFunction(`document.body.innerText.includes("you found the secret")`, {
            timeout: 30 * 1000,
        })
    })
})
