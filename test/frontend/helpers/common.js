import path from 'path'

export const waitForContent = async (page, selector) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitFor((selector) => {
        const element = document.querySelector(selector)
        return element !== null && element.textContent.length > 0
    }, {}, selector)
    return page.evaluate((selector) => document.querySelector(selector).textContent, selector)
}

export const waitForContentToChange = async (page, selector, currentContent) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitFor((selector, currentContent) => {
        const element = document.querySelector(selector)
        return element !== null && element.textContent !== currentContent
    }, {}, selector, currentContent)
    return page.evaluate((selector) => document.querySelector(selector).textContent, selector)
}

export const clickAndWaitForNavigation = (page, selector) => Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(selector)])

export const dismissBeforeUnloadDialogs = page => {
    page.on('dialog', async dialog => {
        if (dialog.type() === 'beforeunload') {
            await dialog.accept()
        }
    })
}

export const lastElement = arr => arr[arr.length - 1]

const getFixturesDir = () => path.join(__dirname, '..', 'fixtures')

const getArtefactsDir = () => path.join(__dirname, '..', 'artefacts')

export const getFixtureNotebookPath = name => path.join(getFixturesDir(), name)

export const getTemporaryNotebookPath = () => path.join(getArtefactsDir(), 'temporary_notebook_' + Date.now() + '.jl')

export const getTestScreenshotPath = () => path.join(getArtefactsDir(), 'test_screenshot_' + Date.now() + '.png')

export const saveScreenshot = (page, path) => page.screenshot({ path: path })
