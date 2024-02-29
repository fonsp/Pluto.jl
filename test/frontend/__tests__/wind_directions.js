import puppeteer from "puppeteer"
import { saveScreenshot, waitForContentToBecome, createPage, paste } from "../helpers/common"
import {
    createNewNotebook,
    waitForNoUpdateOngoing,
    getPlutoUrl,
    shutdownCurrentNotebook,
    setupPlutoBrowser,
    waitForPlutoToCalmDown,
    runAllChanged,
    importNotebook,
} from "../helpers/pluto"

describe("wind_directions", () => {
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
        page = await createPage(browser)
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })

        await importNotebook(page, "wind_directions.jl", { permissionToRunCode: true, timeout: 180 * 1000 })
        await page.waitForTimeout(1000)
        await waitForPlutoToCalmDown(page)
    })
    beforeEach(async () => {})
    afterEach(async () => {
        await saveScreenshot(page)
    })
    afterAll(async () => {
        await shutdownCurrentNotebook(page)
        await page.close()
        page = null

        await browser.close()
        browser = null
    })

    const get_cell_id_that_defines = async (page, variable_name) => {
        return await page.evaluate((variable_name) => {
            return document.querySelector(`pluto-cell > #${variable_name}`).parentElement.id
        }, variable_name)
    }

    let button_selector = (variable_name, value) => `pluto-cell[id="${variable_name}"] button[data-value="${value}"]`
    let slide_selector = (variable_name, value) => `pluto-cell[id="${variable_name}"] .carousel-slide:nth-child(${value})`

    it("🎠 You can move the carousel", async () => {
        const xoxob = await get_cell_id_that_defines(page, "xoxob")
        const xoxob_again = await get_cell_id_that_defines(page, "xoxob_again")

        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, -1))).toBe(true)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, 1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, -1))).toBe(true)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, 1))).toBe(false)

        await page.click(button_selector(xoxob, 1))
        await waitForPlutoToCalmDown(page)

        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, -1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, 1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, -1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, 1))).toBe(false)

        await page.click(button_selector(xoxob_again, 1))
        await page.click(button_selector(xoxob_again, 1))
        await waitForPlutoToCalmDown(page)

        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, -1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob, 1))).toBe(true)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, -1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(xoxob_again, 1))).toBe(true)
    })

    it("🎏 Wind directions UI", async () => {
        const big_input = await get_cell_id_that_defines(page, "big_input")

        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(big_input, -1))).toBe(true)
        expect(await page.evaluate((sel) => document.querySelector(sel).disabled, button_selector(big_input, 1))).toBe(false)

        let checkbox_selector = (i) => `${slide_selector(big_input, 1)} div:nth-child(${i + 1}) > input`
        await page.click(checkbox_selector(0))
        await waitForPlutoToCalmDown(page)

        let expect_chosen_directions = async (expected) => {
            expect(
                await waitForContentToBecome(page, `pluto-cell[id="${await get_cell_id_that_defines(page, "chosen_directions_copy")}"] pluto-output`, expected)
            ).toBe(expected)
        }

        await expect_chosen_directions('chosen_directions_copyString1"North"')

        expect(await page.evaluate((sel) => document.querySelector(sel).checked, checkbox_selector(0))).toBe(true)

        await page.click(checkbox_selector(2))
        await waitForPlutoToCalmDown(page)

        await expect_chosen_directions('chosen_directions_copyString1"North"2"South"')

        expect(await page.evaluate((sel) => document.querySelector(sel).checked, checkbox_selector(0))).toBe(true)
        expect(await page.evaluate((sel) => document.querySelector(sel).checked, checkbox_selector(1))).toBe(false)
        expect(await page.evaluate((sel) => document.querySelector(sel).checked, checkbox_selector(2))).toBe(true)
    })
})
