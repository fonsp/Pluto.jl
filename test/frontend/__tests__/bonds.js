import puppeteer from "puppeteer"
import { saveScreenshot, createPage, paste, waitForContentToBecome, waitForContent } from "../helpers/common"
import {
    createNewNotebook,
    getPlutoUrl,
    importNotebook,
    runAllChanged,
    setupPlutoBrowser,
    shutdownCurrentNotebook,
    waitForCellOutput,
    waitForPlutoToCalmDown,
} from "../helpers/pluto"

// https://github.com/fonsp/Pluto.jl/issues/928
describe("@bind", () => {
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

    it("should ignore intermediate bond values while the notebook is running", async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

        const chill = async () => {
            await wait(300)
            await waitForPlutoToCalmDown(page)
            await wait(1500)
            await waitForPlutoToCalmDown(page)
        }

        await importNotebook(page, "test_bind_dynamics.jl")
        await chill()
        await chill()

        const id = `029e1d1c-bf42-4e2c-a141-1e2eecc0800d`
        const output_selector = `pluto-cell[id="${id}"] pluto-output`

        //page.click is stupid
        const click = async (sel) => {
            await page.waitForSelector(sel)
            await page.evaluate((sel) => document.querySelector(sel).click(), sel)
        }

        const reset = async () => {
            await click(`#reset_xs_button`)
            await wait(300)
            await waitForPlutoToCalmDown(page)
            await waitForContentToBecome(page, output_selector, "")
            await wait(300)
            await waitForPlutoToCalmDown(page)
            await waitForContentToBecome(page, output_selector, "")
            await wait(300)
        }

        const start = async () => {
            await click(`#add_x_button`)
            await chill()

            return await waitForContent(page, output_selector)
        }

        await reset()
        await start()

        await chill()

        await reset()
        const val = await start()
        expect(val).toBe("1,done")
    })
})
