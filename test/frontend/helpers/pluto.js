import { clickAndWaitForNavigation, waitForContent } from './common'

export const createNewNotebook = async (page) => {
    const newNotebookSelector = 'a[href="new"]'
    await page.waitForSelector(newNotebookSelector)
    return clickAndWaitForNavigation(page, newNotebookSelector)
}

export const getCellIds = page => page.evaluate(() => Array.from(document.querySelectorAll('pluto-cell')).map(cell => cell.id))

export const waitForCellOutput = (page, cellId) => waitForContent(page, `pluto-cell[id="${cellId}"] pluto-output`)
