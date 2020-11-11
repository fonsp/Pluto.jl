import { waitForContent, 
    lastElement, 
    dismissBeforeUnloadDialogs,
    saveScreenshot,
    getTestScreenshotPath
} from '../helpers/common'
import {
    createNewNotebook,
    getCellIds,
    waitForCellOutput,
    getPlutoUrl,
    prewarmPluto,
    waitForCellOutputToChange,
    keyboardPressInPlutoInput,
    writeSingleLineInPlutoInput
} from '../helpers/pluto'

const manuallyEnterCells = async (page, cells) => {
    const plutoCellIds = []
    for (const cell of cells) {
        const plutoCellId = lastElement(await getCellIds(page))
        plutoCellIds.push(plutoCellId)
        await page.waitForSelector(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`)
        await writeSingleLineInPlutoInput(page, `pluto-cell[id="${plutoCellId}"] pluto-input`, cell)

        const runSelector = `pluto-cell[id="${plutoCellId}"] .runcell`
        await page.waitForSelector(runSelector, { visible: true })
        await page.click(runSelector)
        await waitForCellOutput(page, plutoCellId)

        await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
        await page.waitFor((nCells) => document.querySelectorAll('pluto-cell').length === nCells, {}, plutoCellIds.length + 1)
    }
    return plutoCellIds
}

describe('PlutoNewNotebook', () => {
    beforeAll(async () => {
        dismissBeforeUnloadDialogs(page)
        await prewarmPluto(page)
    })

    beforeEach(async () => {
        await page.goto(getPlutoUrl(), { waitUntil: 'networkidle0' })
        await createNewNotebook(page)
        await page.waitForSelector('pluto-input', { visible: true })
    })

    afterEach(async () => {
        await saveScreenshot(page, getTestScreenshotPath())
    })

    it('should create new notebook', async () => {
        // A pluto-input should exist in a new notebook
        const plutoInput = await page.evaluate(() => document.querySelector('pluto-input'))
        expect(plutoInput).not.toBeNull()
    })

    it('should run a single cell', async () => {
        const cellInputSelector = 'pluto-input textarea'
        await page.waitForSelector(cellInputSelector)
        await writeSingleLineInPlutoInput(page, 'pluto-input', '1+1')

        const runSelector = '.runcell'
        await page.waitForSelector(runSelector, { visible: true })
        await page.click(runSelector)

        const content = await waitForContent(page, 'pluto-output')
        expect(content).toBe('2')
    })

    it('should run multiple cells', async () => {
        const cells = [
            'a = 1',
            'b = 2',
            'c = 3',
            'a + b + c'
        ]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        const content = await waitForCellOutput(page, lastElement(plutoCellIds))
        expect(content).toBe('6')
    })

    it('should reactively re-evaluate dependent cells', async () => {
        const cells = [
            'a = 1',
            'b = 2',
            'c = 3',
            'a + b + c'
        ]
        const plutoCellIds = await manuallyEnterCells(page, cells)
        const initialLastCellContent = await waitForCellOutput(page, lastElement(plutoCellIds))
        expect(initialLastCellContent).toBe('6')

        // Change second cell
        const secondCellInputSelector = `pluto-cell[id="${plutoCellIds[1]}"] pluto-input`

        // Delete 2
        await keyboardPressInPlutoInput(page, secondCellInputSelector, 'Backspace')

        // Enter 10
        await writeSingleLineInPlutoInput(page, secondCellInputSelector, '10')

        // Re-evaluate
        await page.click('.runallchanged')
        const reactiveLastCellContent = await waitForCellOutputToChange(page, lastElement(plutoCellIds), '6')

        expect(reactiveLastCellContent).toBe('14')
    })
})
