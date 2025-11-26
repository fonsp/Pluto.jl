import puppeteer from "puppeteer"
import { saveScreenshot, createPage, waitForContent } from "../helpers/common"
import {
    createNewNotebook,
    getCellIds,
    getPlutoUrl,
    importNotebook,
    manuallyEnterCells,
    runAllChanged,
    setupPlutoBrowser,
    shutdownCurrentNotebook,
    waitForPlutoToCalmDown,
} from "../helpers/pluto"

describe("slideControls", () => {
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

    it("should create titles", async () => {
        await importNotebook(page, "slides.jl", { permissionToRunCode: false, timeout: 120 * 1000 })
        const plutoCellIds = await getCellIds(page)
        const content = await waitForContent(page, `pluto-cell[id="${plutoCellIds[1]}"] pluto-output`)
        expect(content).toBe("Slide 2\n")

        const slide_1_title = await page.$(`pluto-cell[id="${plutoCellIds[0]}"] pluto-output h1`)
        const slide_2_title = await page.$(`pluto-cell[id="${plutoCellIds[1]}"] pluto-output h1`)

        expect(await slide_2_title.isIntersectingViewport()).toBe(true)
        expect(await slide_1_title.isIntersectingViewport()).toBe(true)

        await page.click(`.toggle_export[title="Export..."]`)
        await page.waitForTimeout(500)
        await page.waitForSelector(".toggle_presentation", { visible: true })
        await page.click(".toggle_presentation")

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
