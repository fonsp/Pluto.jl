import puppeteer from "puppeteer"
import { saveScreenshot, createPage, paste } from "../helpers/common"
import { importNotebook, getPlutoUrl, shutdownCurrentNotebook, setupPlutoBrowser, waitForPlutoToCalmDown } from "../helpers/pluto"

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
    })
})
