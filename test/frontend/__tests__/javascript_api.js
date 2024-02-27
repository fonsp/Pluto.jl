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
} from "../helpers/pluto"

describe("JavaScript API", () => {
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
        await createNewNotebook(page)
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

    it("⭐️ If you return an HTML node, it will be displayed.", async () => {
        const expected = "Success"
        await paste(
            page,
            `# ╔═╡ 90cfa9a0-114d-49bf-8dea-e97d58fa2442
      html"""<script>
    const div = document.createElement("find-me")
    div.innerHTML = "${expected}"
    return div;
</script>"""
        `
        )
        await runAllChanged(page)
        await waitForPlutoToCalmDown(page, { polling: 100 })
        const initialLastCellContent = await waitForContentToBecome(page, `pluto-cell:last-child pluto-output find-me`, expected)
        expect(initialLastCellContent).toBe(expected)
    })

    it("⭐️ The observablehq/stdlib library is pre-imported, you can use DOM, html, Promises, etc.", async () => {
        const expected = "Success"
        await paste(
            page,
            `# ╔═╡ 90cfa9a0-114d-49bf-8dea-e97d58fa2442
      html"""<script>
    return html\`<span>${expected}\</span>\`;
</script>"""
        `
        )
        await runAllChanged(page)
        await waitForPlutoToCalmDown(page, { polling: 100 })
        let initialLastCellContent = await waitForContentToBecome(page, `pluto-cell:last-child pluto-output span`, expected)
        expect(initialLastCellContent).toBe(expected)

        await paste(
            page,
            `# ╔═╡ 90cfa9a0-114d-49bf-8dea-e97d58fa2442
      html"""<script>
            const span = DOM.element("span");
            span.innerHTML = "${expected}"
            return span
</script>"""
        `
        )
        await runAllChanged(page)
        await waitForPlutoToCalmDown(page, { polling: 100 })
        initialLastCellContent = await waitForContentToBecome(page, `pluto-cell:last-child pluto-output span`, expected)
        expect(initialLastCellContent).toBe(expected)
    })

    it("⭐️ When a cell re-runs reactively, this will be set to the previous output", async () => {
        await paste(
            page,
            `   
                # ╔═╡ 90cfa9a0-114d-49bf-8dea-e97d58fa2442
                @bind v html"""<span id="emit-from-here">emitter</span>"""
                
                # ╔═╡ cdb22342-4b79-4efe-bc2e-9edc61a0fef8
                begin
                    v
                    html"""<script id="test-id">
                        const output = this ?? html\`<span id="test-id-2">span node that will be reused</span>\`;
                        output._results = output._results || [];
                        output._results.push(this);
                        return output
                    </script>"""
                end
                
                # ╔═╡ cdb22342-4b79-4efe-bc2e-9edc61a0fef9
                v
        `
        )
        await runAllChanged(page)
        await waitForPlutoToCalmDown(page, { polling: 100 })
        await waitForContentToBecome(page, `pluto-cell:nth-child(2) pluto-output`, "emitter")
        page.waitForTimeout(2000)

        // Send a custom event to increment value
        // Due to various optimizations this will take its time
        const incrementT = async () =>
            await page.evaluate(() => {
                const span = document.querySelector(`#emit-from-here`)
                span.value = (span.value || 0) + 1
                span.dispatchEvent(new CustomEvent("input"))
                return span.value
            })
        // Wait until you see the value.
        // Only then you know reactivity reacted (and did not defer!)
        const waitV = async (t) => await waitForContentToBecome(page, `pluto-cell:last-child pluto-output`, `${t}`)

        let t = await incrementT()
        await waitV(t)

        t = await incrementT()
        await waitV(t)

        t = await incrementT()
        await waitV(t)

        await waitForNoUpdateOngoing(page, { polling: 100 })
        await waitForContentToBecome(page, `pluto-cell:nth-child(2) pluto-output`, "emitter")

        const result = await page.evaluate(() => {
            // The script tag won't be in the DOM. The return'ed span will
            const results = document.querySelector("#test-id-2")._results
            return results[0] == null && results[2] === results[1] && results[1] === results[3]
        })
        expect(result).toBe(true) // else will timout
    })

    // TODO
    // it("⭐️The variable invalidation is a Promise that will get resolved when the cell output is changed or removed.", async () => {
    //     expect("this").toBe("implemented")
    // })
})
