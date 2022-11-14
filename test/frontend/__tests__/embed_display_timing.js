import puppeteer from "puppeteer"
import { lastElement, saveScreenshot, getTestScreenshotPath, setupPage } from "../helpers/common"
import { getCellIds, importNotebook, waitForCellOutput, getPlutoUrl, prewarmPluto, writeSingleLineInPlutoInput, waitForNoUpdateOngoing } from "../helpers/pluto"

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

    it("should get the correct autocomplete suggestions", async () => {
        await importNotebook(page, "embed_display_timing.jl")
        await waitForNoUpdateOngoing(page, { polling: 100 })

        await page.waitForFunction(`document.body.innerText.includes("you found the secret")`, {
            timeout: 30 * 1000,
        })
    })
})
