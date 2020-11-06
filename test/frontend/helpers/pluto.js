import fs from 'fs'
import { 
    clickAndWaitForNavigation,
    getFixtureNotebookPath,
    getTemporaryNotebookPath,
    waitForContent,
    waitForContentToChange
} from './common'

export const getPlutoUrl = () => `http://localhost:${process.env.PLUTO_PORT}`

export const prewarmPluto = async (page) => {
    await page.goto(getPlutoUrl(), { waitUntil: 'networkidle0' })
    await createNewNotebook(page)
    const cellInputSelector = 'pluto-input textarea'
    await page.waitForSelector(cellInputSelector, { visible: true })
    await page.type(cellInputSelector, '21*2')

    const runSelector = '.runcell'
    await page.waitForSelector(runSelector, { visible: true })
    await page.click(runSelector)
    await waitForContent(page, 'pluto-output')
}

export const createNewNotebook = async (page) => {
    const newNotebookSelector = 'a[href="new"]'
    await page.waitForSelector(newNotebookSelector)
    await clickAndWaitForNavigation(page, newNotebookSelector)
}

export const importNotebook = async (notebookName) => {
    // Copy notebook before using it, so we don't mess it up with test changes
    const notebookPath = getFixtureNotebookPath(notebookName)
    const artefactsPath = getTemporaryNotebookPath()
    fs.copyFileSync(notebookPath, artefactsPath)

    const openFileInputSelector = 'pluto-filepicker textarea'
    await page.type(openFileInputSelector, artefactsPath)
    const openFileButton = 'pluto-filepicker button'
    return clickAndWaitForNavigation(page, openFileButton)
}

export const getCellIds = page => page.evaluate(() => Array.from(document.querySelectorAll('pluto-cell')).map(cell => cell.id))

export const waitForCellOutput = (page, cellId) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContent(page, cellOutputSelector)
}

export const waitForCellOutputToChange = (page, cellId, currentOutput) => {
    const cellOutputSelector = `pluto-cell[id="${cellId}"] pluto-output`
    return waitForContentToChange(page, cellOutputSelector, currentOutput)
}
