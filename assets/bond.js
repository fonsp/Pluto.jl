observablehq.Library()

function makeBond(bondNode) {
    bondNode.generator.next().value.then(val => {
        console.log("New val: "+val)
        window.refreshAllCompletionPromise()
        window.client.sendreceive("bond_set", {
            sym: bondNode.getAttribute("def"),
            val: val,
        }).then(u => {
            // TODO: wait for all cells to finish running, maybe make this an event
        })
        window.allCellsCompletedPromise.then(_ => {
            makeBond(bondNode)
        })
    })
}

document.addEventListener("celloutputchanged", (e) => {
    const cellNode = e.detail.cell
    const mime = e.detail.mime
    if(mime != "text/html"){
        return
    }
    const bondNodes = cellNode.querySelectorAll("bond")

    bondNodes.forEach(bond => {
        bond.generator = observablehq.Generators.input(bond.firstChild)
        makeBond(bond)
    })
}, false)
