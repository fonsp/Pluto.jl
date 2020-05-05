observablehq.Library()

function makeBond(bondNode) {
    if(bondNode.getRootNode() != document){
        return
    }
    bondNode.generator.next().value.then(val => {
        window.statistics.numBondSets++

        window.refreshAllCompletionPromise()
        window.client.sendreceive("bond_set", {
            sym: bondNode.getAttribute("def"),
            val: val,
        }).then(u => {
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

    bondNodes.forEach(bondNode => {
        bondNode.generator = observablehq.Generators.input(bondNode.firstElementChild)
        window.allCellsCompletedPromise.then(_ => {
            makeBond(bondNode)
        })
    })
}, false)
