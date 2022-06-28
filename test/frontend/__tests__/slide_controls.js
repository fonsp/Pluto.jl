import puppeteer from "puppeteer"
import { setupPage, waitForContent } from "../helpers/common"
import { createNewNotebook, getPlutoUrl, manuallyEnterCells, prewarmPluto, waitForNoUpdateOngoing } from "../helpers/pluto"

describe("slideControls", () => {
    let browser = null
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
    afterAll(async () => {
        await page.close()
        await browser.close()
    })

    it("should create titles", async () => {
        const cells = ['md"# Slide 1"', 'md"# Slide 2"']
        const plutoCellIds = await manuallyEnterCells(page, cells)
        await page.waitForSelector(".runallchanged", { visible: true, polling: 200, timeout: 0 })
        await page.click(".runallchanged")
        await waitForNoUpdateOngoing(page, { polling: 100 })
        const content = await waitForContent(page, `pluto-cell[id="${plutoCellIds[1]}"] pluto-output`)
        expect(content).toBe("Slide 2")

        const slide_1_title = await page.$(`pluto-cell[id="${plutoCellIds[0]}"] pluto-output h1`)
        const slide_2_title = await page.$(`pluto-cell[id="${plutoCellIds[1]}"] pluto-output h1`)

        expect(await slide_2_title.isIntersectingViewport()).toBe(true)
        expect(await slide_1_title.isIntersectingViewport()).toBe(true)

        /* @ts-ignore */
        await page.evaluate(() => window.present())

        await page.click(".changeslide.next")
        expect(await slide_1_title.isIntersectingViewport()).toBe(true)
        expect(await slide_2_title.isIntersectingViewport()).toBe(false)

        await page.click(".changeslide.next")
        expect(await slide_1_title.isIntersectingViewport()).toBe(false)
        expect(await slide_2_title.isIntersectingViewport()).toBe(true)

        await page.click(".changeslide.prev")
        expect(await slide_1_title.isIntersectingViewport()).toBe(true)
        expect(await slide_2_title.isIntersectingViewport()).toBe(false)
    })
})
