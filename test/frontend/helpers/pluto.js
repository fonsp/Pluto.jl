import fs from 'fs'
import { 
    clickAndWaitForNavigation,
    getFixtureNotebookPath,
    getTemporaryNotebookPath,
    waitForContent
} from './common'

export const getPlutoUrl = () => `http://localhost:${process.env.PLUTO_PORT}`

export const createNewNotebook = async (page) => {
    const newNotebookSelector = 'a[href="new"]'
    await page.waitForSelector(newNotebookSelector)
    return clickAndWaitForNavigation(page, newNotebookSelector)
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

export const waitForCellOutput = (page, cellId) => waitForContent(page, `pluto-cell[id="${cellId}"] pluto-output`)
