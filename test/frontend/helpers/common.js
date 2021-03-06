import path from "path"

export const getTextContent = (selector) => {
    return page.evaluate((selector) => document.querySelector(selector).textContent, selector)
}
export const countCells = async () =>
    await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll("pluto-cell"))
        return a?.length
    })

export const paste = async (page, code, selector = "body") => {
    const ret = await page.evaluate(
        (code, selector) => {
            var clipboardEvent = new Event("paste", {
                bubbles: true,
                cancelable: true,
                composed: true,
            })
            clipboardEvent["clipboardData"] = {
                getData: () => code,
            }
            document.querySelector(selector).dispatchEvent(clipboardEvent)
        },
        code,
        selector
    )
    return ret
}

export const waitForContent = async (page, selector) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitForFunction(
        (selector) => {
            const element = document.querySelector(selector)
            return element !== null && element.textContent.length > 0
        },
        { polling: 100 },
        selector
    )
    return getTextContent(selector)
}

export const waitForContentToChange = async (page, selector, currentContent) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitForFunction(
        (selector, currentContent) => {
            const element = document.querySelector(selector)
            return element !== null && element.textContent !== currentContent
        },
        { polling: 100 },
        selector,
        currentContent
    )
    return getTextContent(selector)
}

export const waitForContentToBecome = async (page, selector, targetContent) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitForFunction(
        (selector, targetContent) => {
            const element = document.querySelector(selector)
            return element !== null && element.textContent === targetContent
        },
        { polling: 100 },
        selector,
        targetContent
    )
    return getTextContent(selector)
}

export const clickAndWaitForNavigation = (page, selector) => Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click(selector)])

const dismissBeforeUnloadDialogs = (page) => {
    page.on("dialog", async (dialog) => {
        if (dialog.type() === "beforeunload") {
            await dialog.accept()
        }
    })
}
const dismissVersionDialogs = (page) => {
    page.on("dialog", async (dialog) => {
        if (dialog.message().includes("A new version of Pluto.jl is available! 🎉")) {
            console.info("Ignoring version warning for now (but do remember to update Project.toml!).")
            await dialog.accept()
        }
    })
}

const failOnError = (page) => {
    page.on("console", async (msg) => {
        if (msg.type() === "error" && msg.text().includes("PlutoError")) {
            console.error(`Bad PlutoError - Failing\n${msg.text()}`)
            throw new Error("PlutoError encountered. Let's fix this!")
        }
    })
}

export const setupPage = (page) => {
    failOnError(page)
    dismissBeforeUnloadDialogs(page)
    dismissVersionDialogs(page)
}

export const lastElement = (arr) => arr[arr.length - 1]

const getFixturesDir = () => path.join(__dirname, "..", "fixtures")

const getArtifactsDir = () => path.join(__dirname, "..", "artifacts")

export const getFixtureNotebookPath = (name) => path.join(getFixturesDir(), name)

export const getTemporaryNotebookPath = () => path.join(getArtifactsDir(), "temporary_notebook_" + Date.now() + ".jl")

export const getTestScreenshotPath = () => path.join(getArtifactsDir(), "test_screenshot_" + Date.now() + ".png")

export const saveScreenshot = (page, path) => page.screenshot({ path: path })
