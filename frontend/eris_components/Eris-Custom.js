// @ts-nocheck
;(function () {
    "use strict"
    // Apply customization to notebook
    if (!document.querySelector("pluto-notebook")) return

    /*
      Custom styling
    */
    // Variable for light(0)/dark(1) theme toggle
    document.documentElement.style.cssText = "--theme: 0"

    const customStyle = document.createElement("style")

    customStyle.innerHTML =
        /*
        Dark mode
      */
        "html {filter: invert(var(--theme)); }\n" +
        // Do not alter to dark mode
        `input, img,
      pluto-logs-container,
      .plot-container, .plotly {
        filter: invert(var(--theme));
      }\n` +
        // Set tab size to 2
        ".cm-content { tab-size: 2 !important; }\n" +
        /*
        Style table of contents
      */
        // Fix padding issue in table of contents
        `a.H3 { padding-left: 20px !important; }
       .plutoui-toc.aside { right: 0; background-color: var(--nord-polar-night-4) !important;}  \n` +
        `.plutoui-toc header {background-color: var(--nord-polar-night-4) !important;} ` +
        `.plutoui-toc.aside section .toc-row.in-view {background: var(--nord-polar-night-3) !important;}` +
        /*
        Other changes
      */
        // Center content of notebook
        " main { align-self: unset !important; }  \n" + // to center -> unset
        // Add left space for better cell drag icon visibility
        "main { margin-left: 10% !important; }\n" +
        /*
        Style terminal output
      */
        `pluto-log-dot-sizer { width: 75vw; }
      pluto-log-dot {
        width: 100%;
        padding: 0.5rem;
        line-height: 1.5rem;
        background: var(--nord-polar-night-4) !important;
      }
      pluto-logs-container {
        background-color: var(--nord-polar-night-4) !important;
      }`

    document.head.appendChild(customStyle)

    /*
      Add button to toggle light and dark mode
    */

    const toggleExport = document.querySelector("#container .export_small_btns .toggle_frontmatter_edit")
    const toggleTheme = document.createElement("button")
    const toggleThemeIcon = document.createElement("span")

    toggleThemeIcon.style.cssText = `
    background-image:  url("https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/bulb-outline.svg");
    filter: invert(1);
    `
    toggleTheme.title = "Toggle light/dark mode"

    toggleTheme.onclick = function () {
        document.documentElement.style.setProperty("--theme", String((parseInt(document.documentElement.style.getPropertyValue("--theme")) + 1) % 2))
    }

    toggleTheme.appendChild(toggleThemeIcon)
    toggleExport.before(toggleTheme)

    /*
      Obtain pluto-cell HTML element
    */
    function getPlutoCell(el) {
        try {
            if (el.tagName !== "PLUTO-CELL") {
                return getPlutoCell(el.parentElement)
            }
            return el
        } catch (e) {}
    }

    /*
      Create two lines of code,
      for first and last line, respectively,
      of Pluto code cell.
    */
    function insertCode(textStart, textEnd) {
        const divStart = document.createElement("div")
        divStart.classList.add("cm-line")
        const spanStart = document.createElement("span")
        spanStart.classList.add("ͼx")
        spanStart.innerText = textStart
        divStart.appendChild(spanStart)

        const divEnd = document.createElement("div")
        divEnd.classList.add("cm-line")
        const spanEnd = document.createElement("span")
        spanEnd.classList.add("ͼx")
        spanEnd.innerText = textEnd
        divEnd.appendChild(spanEnd)

        return [divStart, divEnd]
    }

    /*
      Extract raw code from Pluto cell
    */
    function extractCellCode(plutoCell) {
        const linesContainer = Array.from(plutoCell.querySelector("[role='textbox']").children)

        let codeText = ""
        linesContainer.forEach((lineContainer) => {
            lineContainer.childNodes.forEach((line) => {
                codeText += extractLineText(line)
            })
            codeText += "\n"
        })

        codeText = codeText.split("\n")
        codeText.pop()
        return codeText

        /*
      // Check that code text extraction is correct
      linesContainer[0].parentElement.innerHTML = codeText
        .map(line => `<div><span>${line}</span></div>`)
        .join('');
      */
    }

    function extractLineText(line) {
        if (line.nodeName === "#text") return line.nodeValue

        if (line.nodeName === "SPAN") {
            // Case like <span><span>text</span></span> .
            // Such HTML structure is sometimes triggered
            // automatically by Pluto for first and last cell lines.
            if (line.classList.contains("cm-matchingBracket")) {
                return extractLineText(line.firstChild)
            }

            // Case where span elements are used to contain
            // information about the code line, not the text itself.
            if (line.childElementCount) return ""

            // Usual case: <span>text</span>
            return line.innerText
        }

        // Case where the code text is inside a span element
        // contained in a <pluto-variable-link> element.
        if (line.nodeName === "PLUTO-VARIABLE-LINK") {
            return extractLineText(line.firstChild)
        }

        return ""
    }

    /*
      When some keyboard keys combination of the form
      ("Alt" or "Control" or "Shift") +
      "numeric_or_alphabetic key"
      is pressed, toggle insertion of two lines of code
      into selected Pluto code cell.
    */
    function keysAction(event, keys, firstLine, lastLine) {
        /*
        The keys parameter is an array of 2, 3 or 4 elements,
        filled with ".key" values obtained after a keydown
        event is registered by JavaScript.
  
        Such values can be obtained from this website:
        https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
      */

        // Example:
        // keys = ["Alt", "s"] will be turned to ["altKey", "s"],
        // where it is assumed that only the last element of the
        // keys array is a key not in ["Alt", "Control", "Shift"].

        // Specially deal with the cases where the
        // Alt, Control or Shift key was/were pressed
        const specialKeys = {
            Alt: "altKey",
            Control: "ctrlKey",
            Shift: "shiftKey",
        }
        keys = keys.map(function (key) {
            return Object.keys(specialKeys).includes(key) ? specialKeys[key] : key
        })

        // Check if the specific keys combination defined
        // by the keys array was pressed by the user.
        const keysCombinationPressed = keys.every((element, index) => {
            // Case for non special key
            if (index === keys.length - 1) {
                // Was non special key (upper or lower case) pressed?
                return event.key.toLowerCase() === element
                // Lower case is used due to sometimes
                // the non special key being registered
                // as upper case when other special keys
                // are also being pressed.
            } else {
                // Was the special key pressed?
                return event[element]
            }
        })

        if (keysCombinationPressed) {
            const cellCode = getPlutoCell(getSelection().anchorNode).querySelector("div[role='textbox'].cm-content")

            /* Create HTML for two new code lines */
            const [beginDiv, endDiv] = insertCode(firstLine, lastLine)

            /*
          Check if the two new lines' code is already
          present in the current cell,
          and remove them, if that's the case.
        */
            let currentFirstLine = ""
            // Read text from each node in current cell's
            // first line. Sometimes the code is not inserted
            // into span elements, but as #text.
            cellCode.firstElementChild.childNodes.forEach((line) => {
                if (line.nodeName === "#text") {
                    currentFirstLine += line.nodeValue
                } else {
                    // We assume the line is an HTML element
                    currentFirstLine += line.innerText
                }
            })

            if (firstLine === currentFirstLine) {
                cellCode.firstElementChild.remove()
            } else {
                cellCode.firstElementChild.before(beginDiv)
            }

            let currentLastLine = ""
            cellCode.lastElementChild.childNodes.forEach((line) => {
                if (line.nodeName === "#text") {
                    currentLastLine += line.nodeValue
                } else {
                    // We assume the line is an HTML element
                    currentLastLine += line.innerText
                }
            })

            if (lastLine === currentLastLine) {
                cellCode.lastElementChild.remove()
            } else {
                cellCode.appendChild(endDiv)
            }
        }
    }

    document.addEventListener("keydown", function (evt) {
        // Avoid keydown event repetition due to holding key
        if (evt.repeat) return

        /*
        Insert "begin ... end" code in Pluto cell
        Keyboard shortcut: Control+Alt+b
      */
        keysAction(evt, ["Control", "Alt", "b"], "begin", "end")

        /*
        Insert "let ... end" code in Pluto cell
        Keyboard shortcut: Control+Alt+l
      */
        keysAction(evt, ["Control", "Alt", "l"], "let", "end")

        /*
        Insert "with_terminal() do ... end" code in Pluto cell
        Keyboard shortcut: Control+Alt+t
      */
        keysAction(evt, ["Control", "Alt", "t"], "with_terminal() do", "end")

        /*
        Insert 'md""" ... """' code in Pluto cell
        Keyboard shortcut: Control+Alt+m
      */
        keysAction(evt, ["Control", "Alt", "m"], 'md"""', '"""')

        /*
        Toggle visibility of markdown cells' code: Alt+m
      */
        if (evt.altKey && !evt.ctrlKey && !evt.shiftKey && evt.key.toLowerCase() === "m") {
            document.querySelectorAll("pluto-cell:has(pluto-output .markdown)").forEach((cell) => {
                // Even if the Pluto cell has no class,
                // or has only the classes
                // "show_input" and "code_folded", the
                // following code will toggle the
                // visibility of the markdown cell's code.
                cell.classList.toggle("show_input")
                cell.classList.toggle("code_folded")
            })
        }

        /*
        Toggle code cell visibility: Alt+v
      */
        if (evt.altKey && !evt.ctrlKey && !evt.shiftKey && evt.key.toLowerCase() === "v") {
            getPlutoCell(getSelection().anchorNode).querySelector("button.foldcode").click()
        }

        /*
        Add cell before: Control+Shift+Enter
      */
        if (!evt.altKey && evt.ctrlKey && evt.shiftKey && evt.key.toLowerCase() === "enter") {
            getPlutoCell(getSelection().anchorNode).querySelector("button.add_cell.before").click()
        }

        /*
        Add cell after: Alt+Enter
      */
        if (evt.altKey && !evt.ctrlKey && !evt.shiftKey && evt.key.toLowerCase() === "enter") {
            getPlutoCell(getSelection().anchorNode).querySelector("button.add_cell.after").click()
        }

        /*
        Toggle live documentation: Control+Alt+d
      */
        if (evt.altKey && evt.ctrlKey && !evt.shiftKey && evt.key.toLowerCase() === "d") {
            if (document.querySelector("pluto-helpbox header input")) {
                document.querySelector("pluto-helpbox").classList.toggle("hidden")
                document.querySelector("pluto-helpbox button").click()
            } else {
                document.querySelector("pluto-helpbox").classList.toggle("hidden")
                document.querySelector("pluto-helpbox header").click()
            }
        }

        /*
        Split cell: Control+Alt+s
      */
        if (evt.altKey && evt.ctrlKey && !evt.shiftKey && evt.key.toLowerCase() === "s") {
            ;(async function () {
                // Get code line where mouse is located
                let oldLine = getSelection().anchorNode
                while (!oldLine.classList) {
                    oldLine = oldLine.parentElement
                }
                while (!oldLine.classList.contains("cm-line")) {
                    oldLine = oldLine.parentElement
                }

                // Extract code text from selected line
                let oldLineCode = ""
                oldLine.childNodes.forEach((node) => {
                    oldLineCode += extractLineText(node)
                })

                oldLineCode

                // Extract code text from selected cell
                const oldCell = getPlutoCell(getSelection().anchorNode)
                let oldCellCode = extractCellCode(oldCell)

                // Split code text based on selected line
                const lineIndex = oldCellCode.indexOf(oldLineCode)
                const newCellCode = oldCellCode.slice(lineIndex)
                oldCellCode = oldCellCode.slice(0, lineIndex)

                /*
            Due to Pluto only allowing one line per cell,
            unless something like "begin ... end" is used,
            and the fact that splitting a one line cell does
            not make much sense, we will replicate the first
            and last line of the old cell, into the new one.
          */
                oldCellCode.push(newCellCode.at(-1))
                newCellCode.unshift(oldCellCode[0])

                // Create new cell
                oldCell.querySelector("button.add_cell.after").click()

                await new Promise((r) => setTimeout(r, 500))
                const newCell = oldCell.nextElementSibling

                // Update code in cells
                oldCell.querySelector('[role="textbox"]').innerHTML = oldCellCode.map((line) => `<div><span>${line}</span></div>`).join("")

                newCell.querySelector('[role="textbox"]').innerHTML = newCellCode.map((line) => `<div><span>${line}</span></div>`).join("")

                return
            })()
        }
    })
})()
