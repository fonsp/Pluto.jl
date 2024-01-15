import puppeteer from "puppeteer"
import { saveScreenshot, createPage, waitForContentToBecome, getTextContent } from "../helpers/common"
import { importNotebook, getPlutoUrl, shutdownCurrentNotebook, setupPlutoBrowser, getLogs } from "../helpers/pluto"

describe("with_js_link", () => {
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
        await importNotebook(page, "with_js_link.jl", { timeout: 120 * 1000 })

        const submit_ev_input = (id, value) =>
            page.evaluate(
                (id, value) => {
                    document.querySelector(`.function_evaluator#${id} input`).value = value

                    document.querySelector(`.function_evaluator#${id} input[type="submit"]`).click()
                },
                id,
                value
            )

        const ev_output_sel = (id) => `.function_evaluator#${id} textarea`

        const expect_ev_output = async (id, expected) => {
            expect(await waitForContentToBecome(page, ev_output_sel(id), expected)).toBe(expected)
        }

        ////// BASIC
        await expect_ev_output("sqrt", "30")
        await submit_ev_input("sqrt", "25")
        await expect_ev_output("sqrt", "5")

        // TODO test concurrency

        // TODO closure

        // TODO test refresh

        ////// LOGS AND ERRORS
        const logs1 = await getLogs(page, "33a2293c-6202-47ca-80d1-4a9e261cae7f")
        expect(logs1).toEqual([{ class: "Info", description: "you should see this log 4", kwargs: {} }])
        await submit_ev_input("logs1", "90")

        // TODO
        // const logs2 = await getLogs(page, "33a2293c-6202-47ca-80d1-4a9e261cae7f")
        // expect(logs2).toEqual([
        //     { class: "Info", description: "you should see this log 4", kwargs: {} },
        //     { class: "Info", description: "you should see this log 1", kwargs: {} },
        // ])

        // TODO RERUN cELL

        const logs3 = await getLogs(page, "480aea45-da00-4e89-b43a-38e4d1827ec2")
        expect(logs3.length).toEqual(2)
        expect(logs3[0]).toEqual({ class: "Warn", description: "You should see the following error:", kwargs: {} })
        expect(logs3[1].class).toEqual("Error")
        expect(logs3[1].description).toContain("with_js_link")
        expect(logs3[1].kwargs.input).toEqual('"coOL"')
        expect(logs3[1].kwargs.exception).toContain("You should see this error COOL")

        ////// GLOBALS
        await expect_ev_output("globals", "54")

        ////// MULTIPLE IN ONE CELL
        await expect_ev_output("uppercase", "ΠΑΝΑΓΙΏΤΗΣ")
        await expect_ev_output("lowercase", "παναγιώτης")

        await submit_ev_input("uppercase", "wOw")

        await expect_ev_output("uppercase", "WOW")
        await expect_ev_output("lowercase", "παναγιώτης")

        await submit_ev_input("lowercase", "drOEF")

        await expect_ev_output("uppercase", "WOW")
        await expect_ev_output("lowercase", "droef")

        ////// REPEATED
        await expect_ev_output(`length[cellid="40031867-ee3c-4aa9-884f-b76b5a9c4dec"]`, "7")
        await expect_ev_output(`length[cellid="7f6ada79-8e3b-40b7-b477-ce05ae79a668"]`, "7")

        await submit_ev_input(`length[cellid="40031867-ee3c-4aa9-884f-b76b5a9c4dec"]`, "yay")

        await expect_ev_output(`length[cellid="40031867-ee3c-4aa9-884f-b76b5a9c4dec"]`, "3")
        await expect_ev_output(`length[cellid="7f6ada79-8e3b-40b7-b477-ce05ae79a668"]`, "7")
    })
})
