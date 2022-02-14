import puppeteer, { Keyboard } from "puppeteer"
import { saveScreenshot, getTestScreenshotPath, setupPage, paste } from "../helpers/common"
import {
    clearPlutoInput,
    createNewNotebook,
    getCellIds,
    getPlutoUrl,
    importNotebook,
    prewarmPluto,
    waitForCellOutput,
    waitForNoUpdateOngoing,
    writeSingleLineInPlutoInput,
} from "../helpers/pluto"

// https://github.com/fonsp/Pluto.jl/issues/928
describe("CM6StressTest", () => {
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
        // await prewarmPluto(browser, page)
        await page.close()
    })

    beforeEach(async () => {
        page = await browser.newPage()
        setupPage(page)
        await page.goto(getPlutoUrl(), { waitUntil: "networkidle0" })
        await importNotebook(page, "stress_test_notebook.jl")
        await waitForNoUpdateOngoing(page, { polling: 100 })
        await waitForCellOutput(page, "d71c5ee2-f360-11ea-2753-a132fa41871a")
    })
    // afterEach(async () => {
    //     await saveScreenshot(page, getTestScreenshotPath())
    //     // @ts-ignore
    //     await page.evaluate(() => window.shutdownNotebook?.())
    //     await page.close()
    //     page = null
    // })
    // afterAll(async () => {
    //     await browser.close()
    //     browser = null
    // })

    const code_1 = `reinterpret(Vector{SVector{Float64,2}}, aa)`
    const code_2 = `reinterpret(10, SVector{Float64,2}, aa)`

    const reset_cell = async () => {
        await clearPlutoInput(page, `pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] pluto-input`)
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] pluto-input`, code_1)
    }

    const input_value = async () => {
        return await page.evaluate(() => {
            return document.querySelector(`pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] pluto-input .cm-content`).textContent.trim()
        })
    }

    it("should not crash!!", async () => {
        await page.waitForSelector("pluto-input", { timeout: 1000, visible: true })

        await page.waitForSelector(`pluto-cell`, {
            timeout: 1000,
        })
        // console.log("Aasdfsdf")
        // await page.waitForSelector(`pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] pluto-input`, {
        //     timeout: 5000,
        // })
        // console.log("Aasdfsdf 2")
        await page.waitForSelector(`pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] pluto-input .cm-content`, {
            timeout: 5000,
        })

        await reset_cell()
        expect(await input_value()).toBe(code_1)
        // console.log("Aasdfsdf 2")

        /// SETUP COMPLETE

        for (let i = 0; i < 200000; i++) {
            if (i % 100 === 0) {
                await reset_cell()
            }
            expect(await input_value()).toBe(code_1)

            await page.click(
                `pluto-cell[id="d71c5ee2-f360-11ea-2753-a132fa41871a"] > pluto-input > div > div.cm-scroller > div.cm-content.cm-lineWrapping > div > span:nth-child(4)`
            )

            const d = (s) => page.keyboard.down(s)
            const u = (s) => page.keyboard.up(s)
            const p = (s) => page.keyboard.press(s)

            await d("Meta")
            await p("a")
            await u("Meta")
            await p("ArrowLeft")

            let s = `js"const x = {a:1}", ((([[[[{{{{`
            await page.keyboard.type(s)
            for (let _c of s) {
                await p("Backspace")
            }

            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await page.keyboard.type("10, ")

            await d("Meta")
            await p("a")
            await u("Meta")
            await p("ArrowRight")

            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("Backspace")

            await d("Shift")
            await p("Enter")
            await u("Shift")

            expect(await input_value()).toBe(code_2)

            await d("Meta")
            await d("a")
            await u("Meta")
            await p("ArrowLeft")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await p("ArrowRight")
            await d("\\")
            await u("\\")
            await d("\\")
            await u("\\")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await p("Backspace")
            await d("Shift")
            await d("V")
            await u("V")
            await u("Shift")
            await d("e")
            await d("c")
            await u("e")
            await u("c")
            await d("t")
            await u("t")
            await d("o")
            await u("o")
            await d("r")
            await u("r")
            await d("Shift")
            await d("{")
            await u("{")
            await u("Shift")
            await d("Meta")
            await d("a")
            await u("Meta")
            await p("ArrowRight")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await p("ArrowLeft")
            await d("Shift")
            await d("}")
            await u("}")
            await u("Shift")
            await d("Meta")
            await d("a")
            await u("Meta")
            await d("Shift")
            await d("Enter")
            await u("Enter")
            await u("Shift")
            await d("Meta")
            await u("Meta")
            await d("Shift")
            await d("Enter")
            await u("Enter")
            await u("Shift")

            await page.click(`body`)

            expect(await input_value()).toBe(code_1)
        }

        //         await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        //         await page.click(`.runallchanged`)

        //         await page.waitForSelector(`pluto-cell.running`, { visible: true, timeout: 0 })
        //         await waitForNoUpdateOngoing(page)

        //         await paste(
        //             page,
        //             `
        // # ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
        // let x; y; z; numberoftimes[] += 1 end

        // # ╔═╡ 15f65099-1deb-4c73-b1cd-1bae1eec12e9
        // numberoftimes = Ref(0)
        //         `
        //         )

        //         await page.waitForSelector(`.runallchanged`, { visible: true, polling: 200, timeout: 0 })
        //         await page.click(`.runallchanged`)
        //         await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))

        //         await waitForNoUpdateOngoing(page)
        //         let output_after_running_bonds = await page.evaluate(() => {
        //             return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        //         })
        //         expect(output_after_running_bonds).not.toBe("")

        //         // Let's refresh and see
        //         await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] })
        //         await page.waitForFunction(() => Boolean(document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent))
        //         await waitForNoUpdateOngoing(page)
        // let output_after_reload = await page.evaluate(() => {
        //     return document.querySelector("pluto-cell:nth-of-type(5) pluto-output")?.textContent
        // })
        // expect(output_after_reload).toBe(output_after_running_bonds)
    })
})
