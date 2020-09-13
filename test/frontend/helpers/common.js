import path from 'path'

export const waitForContent = async (page, selector, intervalMs=100) => {
    return new Promise((resolve, _reject) => {
        const poll = async () => {
            const content = await page.evaluate(selector => {
                const element = document.querySelector(selector)
                return element !== null ? element.textContent : null
            }, selector)
            if (content && content.length > 0) {
                resolve(content)
            } else {
                setTimeout(poll, intervalMs)
            }
        }
        setTimeout(poll, intervalMs)
    })
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
