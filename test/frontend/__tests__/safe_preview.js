import puppeteer from "puppeteer"
import { saveScreenshot, createPage, paste } from "../helpers/common"
import {
    importNotebook,
    getPlutoUrl,
    shutdownCurrentNotebook,
    setupPlutoBrowser,
    waitForPlutoToCalmDown,
    restartProcess,
    getCellIds,
    clearPlutoInput,
    writeSingleLineInPlutoInput,
    runAllChanged,
} from "../helpers/pluto"

describe("safe_preview", () => {
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

    const expect_safe_preview = async (/** @type {puppeteer.Page} */ page) => {
        await waitForPlutoToCalmDown(page)
        expect(await page.evaluate(() => [...document.body.classList])).toContain("process_waiting_for_permission")
        expect(await page.evaluate(() => document.querySelector("a#restart-process-button"))).not.toBeNull()
        expect(await page.evaluate(() => document.querySelector(".safe-preview-info"))).not.toBeNull()
    }

    it("Pasting notebook contents should open in safe preview", async () => {
        await Promise.all([
            page.waitForNavigation(),
            paste(
                page,
                `### A Pluto.jl notebook ###
# v0.14.0

using Markdown
using InteractiveUtils

# ╔═╡ b2d786ec-7f73-11ea-1a0c-f38d7b6bbc1e
md"""
Hello
"""

# ╔═╡ b2d79330-7f73-11ea-0d1c-a9aad1efaae1
1 + 2

# ╔═╡ Cell order:
# ╟─b2d786ec-7f73-11ea-1a0c-f38d7b6bbc1e
# ╠═b2d79330-7f73-11ea-0d1c-a9aad1efaae1
`
            ),
        ])
        await expect_safe_preview(page)
    })

    it("Importing notebook should open in safe preview", async () => {
        await importNotebook(page, "safe_preview.jl", { permissionToRunCode: false })
        await expect_safe_preview(page)

        await waitForPlutoToCalmDown(page)

        const get_cell_contents = () => page.evaluate(() => Array.from(document.querySelectorAll(`pluto-cell>pluto-output`)).map((c) => c.innerText))
        let cell_contents = await get_cell_contents()

        expect(cell_contents[0]).toBe("one")
        expect(cell_contents[1]).toBe("Scripts and styles not rendered in Safe preview\ni should not be red\ntwo\nsafe")
        expect(cell_contents[2]).toBe("three")
        expect(cell_contents[3]).toBe("Code not executed in Safe preview")
        expect(cell_contents[4]).toBe("Code not executed in Safe preview")
        expect(cell_contents[5]).toContain("yntax")
        expect(cell_contents[6]).toBe("")

        expect(await page.evaluate(() => getComputedStyle(document.querySelector(`.zo`)).color)).not.toBe("rgb(255, 0, 0)")

        // Modifying should not execute code
        const cellids = await getCellIds(page)
        let sel = `pluto-cell[id="${cellids[0]}"] pluto-input`

        let expectNewOutput = async (contents) => {
            await clearPlutoInput(page, sel)
            await writeSingleLineInPlutoInput(page, sel, contents)
            await runAllChanged(page)
            return expect((await get_cell_contents())[0])
        }

        ;(await expectNewOutput(`md"een"`)).toBe("een")
        ;(await expectNewOutput(`un`)).toBe("Code not executed in Safe preview")
        ;(await expectNewOutput(`md"one"`)).toBe("one")
        ;(await expectNewOutput(`a b c function`)).toContain("yntax")
        ;(await expectNewOutput(`md"one"`)).toBe("one")
        ;(await expectNewOutput(``)).toBe("")
        ;(await expectNewOutput(`md"one"`)).toBe("one")

        await restartProcess(page)
        await waitForPlutoToCalmDown(page)

        cell_contents = await get_cell_contents()

        expect(cell_contents[0]).toBe("one")
        expect(cell_contents[1]).toBe("i should not be red\ntwo\nsafe\nDANGER")
        expect(cell_contents[2]).toBe("three")
        expect(cell_contents[3]).toBe("123")
        expect(cell_contents[4]).toBe("")
        expect(cell_contents[5]).toContain("yntax")
        expect(cell_contents[6]).toBe("")

        expect(await page.evaluate(() => document.querySelector(`pluto-log-dot`).innerText)).toBe("four\nDANGER")

        expect(await page.evaluate(() => getComputedStyle(document.querySelector(`.zo`)).color)).toBe("rgb(255, 0, 0)")
    })
})
