const { Transformer } = require("@parcel/plugin")
const recast = require("recast")
const { visit, namedTypes: n, builders } = require("ast-types")

module.exports = new Transformer({
    // canReuseAST({ ast }) {
    //     return false // Except if something else also uses recast but I doubt it
    // },
    // async parse({ asset }) {
    //     return {
    //         type: "babel",
    //         version: "1.0.0", // idk just going through the motions here
    //         program: recast.parse(await asset.getCode(), {
    //             parser: require("recast/parsers/babel.js"),
    //         }),
    //     }
    // },
    async transform({ asset }) {
        // let ast = await asset.getAST()

        // visit(ast.program, {
        //     visitTaggedTemplateExpression(path) {
        //         var node = path.node

        //         if (!n.Identifier.check(node.tag) || node.tag.name !== "html") {
        //             this.traverse(path)
        //             return
        //         }

        //         // Very crude and naive, but it works for what we need.
        //         // If we wanna go further we can use a real parser and all that.. but who cares
        //         // (Like https://github.com/developit/htm/tree/master/packages/babel-plugin-htm)
        //         // I just want to get this working and I'm not going to spend any more time on it.
        //         // (The last line was brought to you by Copilot 🙃)
        //         const JSDELIVR_URL_REX = /"(https:\/\/cdn.jsdelivr.net\/gh\/[^ "]+)"/g
        //         for (const quasi of node.quasi.quasis) {
        //             quasi.value.raw = quasi.value.raw.replace(JSDELIVR_URL_REX, (m, url) => {
        //                 // Replace the original specifier with a dependency id
        //                 // as a placeholder. This will be replaced later with
        //                 // the final bundle URL.
        //                 console.log(`ADDING URL url:`, url)
        //                 // let depId = asset.addURLDependency(url, {})
        //                 // return `"${depId}"`
        //                 return `"${url}"`
        //             })
        //         }
        //         this.traverse(path)
        //     },
        // })

        // asset.setAST(ast)

        return [asset]
    },
    // async generate({ ast }) {
    //     let output = recast.print(ast.program)
    //     return {
    //         content: output.code,
    //         map: output.map,
    //     }
    // },
})
