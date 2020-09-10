import { waitForContent, lastElement, dismissBeforeUnloadDialogs } from '../helpers/common'
import { createNewNotebook, getCellIds, waitForCellOutput } from '../helpers/pluto'

describe('PlutoNewNotebook', () => {
    beforeAll(async () => {
        dismissBeforeUnloadDialogs(page)
    })

    beforeEach(async () => {
        await page.goto('http://localhost:1234', { waitUntil: 'networkidle0' })
        await createNewNotebook(page)
    })

    it('should create new notebook', async () => {
        // A pluto-input should exist in a new notebook
        const plutoInput = await page.evaluate(() => document.querySelector('pluto-input'))
        expect(plutoInput).not.toBeNull()
    })

    it('should run a single cell', async () => {
        const cellInputSelector = 'pluto-input textarea'
        await page.waitForSelector(cellInputSelector)
        await page.type(cellInputSelector, '1+1')

        const runSelector = '.runcell'
        await page.waitForSelector(runSelector)
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

        let plutoCellId
        for (const cell of cells) {
            plutoCellId = lastElement(await getCellIds(page))
            await page.type(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`, cell)
            await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
            await page.waitFor(500)
        }

        await page.click('.runallchanged')
        const content = await waitForCellOutput(page, plutoCellId)
        expect(content).toBe('6')
    })

    it('should reactively re-evaluate dependent cells', async () => {
        const cells = [
            'a = 1',
            'b = 2',
            'c = 3',
            'a + b + c'
        ]
        
        const plutoCellIds = []
        for (const cell of cells) {
            const plutoCellId = lastElement(await getCellIds(page))
            plutoCellIds.push(plutoCellId)
            await page.type(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`, cell)
            await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
            await page.waitFor(500)
        }

        await page.click('.runallchanged')
        const initialLastCellContent = await waitForCellOutput(page, lastElement(plutoCellIds))
        expect(initialLastCellContent).toBe('6')

        // Change second cell
        const secondCellSelector = `pluto-cell[id="${plutoCellIds[1]}"] pluto-input textarea`

        // Delete 2
        await page.focus(secondCellSelector)
        await page.keyboard.press('Backspace')

        // Enter 10
        await page.type(secondCellSelector, '10')

        // Re-evaluate
        await page.click('.runallchanged')
        const reactiveLastCellContent = await waitForCellOutput(page, lastElement(plutoCellIds))
        expect(reactiveLastCellContent).toBe('14')
    })
})
