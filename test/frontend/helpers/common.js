import path from 'path'

export const getTextContent = (selector) => {
    return page.evaluate((selector) => document.querySelector(selector).textContent, selector)
}

export const waitForContent = async (page, selector) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitFor((selector) => {
        const element = document.querySelector(selector)
        return element !== null && element.textContent.length > 0
    }, {polling: 100}, selector)
    return getTextContent(selector)
}

export const waitForContentToChange = async (page, selector, currentContent) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitFor((selector, currentContent) => {
        const element = document.querySelector(selector)
        return element !== null && element.textContent !== currentContent
    }, {polling: 100}, selector, currentContent)
    return getTextContent(selector)
}

export const waitForContentToBecome = async (page, selector, targetContent) => {
    await page.waitForSelector(selector, { visible: true })
    await page.waitFor((selector, targetContent) => {
        const element = document.querySelector(selector)
        return element !== null && element.textContent === targetContent
    }, {polling: 100}, selector, targetContent)
    return getTextContent(selector)
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
