function createCodeMirrorFilepicker(placer, onEnter, reset, suggestNewFile) {
    var editor = CodeMirror(placer, {
        value: "",
        lineNumbers: false,
        lineWrapping: false,
        theme: "plutoheader",
        viewportMargin: Infinity,
        placeholder: "Enter path...",
        indentWithTabs: true,
        indentUnit: 4,
        hintOptions: {
            hint: pathhints,
            completeSingle: false,
            suggestNewFile: suggestNewFile,
        },
        scrollbarStyle: "null",
    });

    editor.setOption("extraKeys", {
        "Ctrl-Enter": onEnter,
        "Ctrl-Shift-Enter": onEnter,
        "Enter": onEnter,
        "Esc": (cm) => {
            cm.closeHint()
            reset()
            document.activeElement.blur()
        },
        "Tab": (cm) => requestPathCompletions(cm),
    });

    editor.on("change", (cm, change) => {
        requestPathCompletions(cm)
    })

    return editor
}

function requestPathCompletions(cm) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)

    if(!cm.somethingSelected()){
        if(cursor.ch == oldLine.length)
        {
            cm.showHint()
        }
    }
}

function pathhints(cm, option) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)

    return client.sendreceive("completepath", {
        query: oldLine,
    }).then(update => {
        const results = update.message.results
        const from = utf8index_to_ut16index(oldLine, update.message.start)
        const to = utf8index_to_ut16index(oldLine, update.message.stop)

        var styledResults = results.map(r => ({
            text: r,
            className: (r.endsWith("/") || r.endsWith("\\")) ? "dir" : "file",
        }))

        if(results.length == 1 && results[0].length == (to - from)){
            console.log("precise match")
            return null
        }

        if(option.suggestNewFile){
            const queryFileName = oldLine.split("/").pop().split("\\").pop()

            for(var initLength = 3; initLength >= 0; initLength--){
                const init = ".jl".substring(0,initLength)
                if(queryFileName.endsWith(init)){
                    var suggestedFileName = queryFileName + ".jl".substring(initLength)

                    if (suggestedFileName == ".jl"){
                        suggestedFileName = "notebook.jl"
                    }

                    if(initLength == 3){
                        return null
                    }
                    if(!results.includes(suggestedFileName)){
                        styledResults.push({
                            text: suggestedFileName,
                            displayText: suggestedFileName + " (new)",
                            className: "file new",
                        })
                    }
                    break
                }
            }
        }

        return {
            list: styledResults,
            from: CodeMirror.Pos(cursor.line, from),
            to: CodeMirror.Pos(cursor.line, to),
        }
    })
}