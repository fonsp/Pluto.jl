const waitForContent = async (page, selector, interval=100) => {
    return new Promise((resolve, _reject) => {
        const poll = async () => {
            const content = await page.evaluate(selector => document.querySelector(selector).textContent, selector)
            if (content && content.length > 0) {
                resolve(content)
            } else {
                setTimeout(poll, interval)
            }
        }
        setTimeout(poll, interval)
    })
}

const lastElement = arr => arr[arr.length - 1]

describe('Pluto', () => {
    beforeEach(async () => {
        await page.goto('http://localhost:1234', { waitUntil: 'networkidle0' })
    })

    it('should contain "Pluto.jl" in title', async () => {
        await expect(page.title()).resolves.toContain('Pluto.jl');
    })

    it('should create new notebook', async () => {
        const newNotebookSelector = 'a[href="new"]'
        await page.waitForSelector(newNotebookSelector)
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(newNotebookSelector)])

        // A pluto-input should exist in a new notebook
        const plutoInput = await page.evaluate(() => document.querySelector('pluto-input'))
        expect(plutoInput).not.toBeNull()
    })

    it('should run a single cell', async () => {
        const newNotebookSelector = 'a[href="new"]'
        await page.waitForSelector(newNotebookSelector)
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(newNotebookSelector)])

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
        // TODO: Extract new notebook creation (maybe in beforeEach)
        const newNotebookSelector = 'a[href="new"]'
        await page.waitForSelector(newNotebookSelector)
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(newNotebookSelector)])

        const cells = [
            'a = 1',
            'b = 2',
            'c = 3',
            'a + b + c'
        ]
        
        let plutoCellId
        for (const cell of cells) {
            plutoCellId = await page.evaluate(() => Array.from(document.querySelectorAll('pluto-cell')).slice(-1)[0].id)
            await page.type(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`, cell)
            await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
            await page.waitFor(100)
        }

        await page.click('.runallchanged')
        const content = await waitForContent(page, `pluto-cell[id="${plutoCellId}"] pluto-output`)
        expect(content).toBe('6')
    })

    it('should reactively re-evaluate dependent cells', async () => {
        const newNotebookSelector = 'a[href="new"]'
        await page.waitForSelector(newNotebookSelector)
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(newNotebookSelector)])

        const cells = [
            'a = 1',
            'b = 2',
            'c = 3',
            'a + b + c'
        ]
        
        const plutoCellIds = []
        for (const cell of cells) {
            const plutoCellId = await page.evaluate(() => Array.from(document.querySelectorAll('pluto-cell')).slice(-1)[0].id)
            plutoCellIds.push(plutoCellId)
            await page.type(`pluto-cell[id="${plutoCellId}"] pluto-input textarea`, cell)
            await page.click(`pluto-cell[id="${plutoCellId}"] .add_cell.after`)
            await page.waitFor(100)
        }

        await page.click('.runallchanged')
        const initialLastCellContent = await waitForContent(page, `pluto-cell[id="${lastElement(plutoCellIds)}"] pluto-output`)
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
        const reactiveLastCellContent = await waitForContent(page, `pluto-cell[id="${lastElement(plutoCellIds)}"] pluto-output`)
        expect(reactiveLastCellContent).toBe('14')
    })
})
