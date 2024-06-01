// @ts-nocheck
;(function () {
    // Toggle Show/Hide Code
    const clickDiv2 = document.createElement("div")
    const clickButton2 = document.createElement("button")

    clickDiv2.style.cssText = `
      position: relative;
      display: inline-block;
    `

    const eyeopen =
        '<span> <img class="dropButtonIcon" width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/eye-outline.svg"></img> </span>'
    const eyeclosed =
        '<span> <img class="dropButtonIcon" width="25" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/eye-off-outline.svg"></img> </span>'

    clickButton2.innerHTML = eyeopen
    clickButton2.style.cssText = `
      color: white;
      cursor: pointer;
      margin-right: 2rem;
      border: none;
      padding: 0.3rem 0.55rem;
      opacity: 0.5;
      background-color: Transparent;
      filter: invert(1);
    `

    clickButton2.title = "Show Code"
    clickButton2.className = "clickButton"
    clickButton2.onclick = function () {
        document.querySelectorAll("pluto-cell:has(pluto-output)").forEach((cell) => {
            cell.classList.toggle("show_input")
            cell.classList.toggle("code_folded")
            if (clickButton2.title == "Show Code") {
                clickButton2.innerHTML = eyeclosed
                clickButton2.title = "Hide Code"
            } else {
                clickButton2.innerHTML = eyeopen
                clickButton2.title = "Show Code"
            }
        })
    }

    // Add a mouseover event listener
    clickButton2.addEventListener("mouseover", () => {
        // Change the button's background color
        clickButton2.style.opacity = "1"
    })

    // Add a mouseout event listener
    clickButton2.addEventListener("mouseout", () => {
        // Change the button's background color back to its original color
        clickButton2.style.opacity = "0.5"
    })

    const toggleExport = document.querySelector("#at_the_top .toggle_export")
    clickDiv2.appendChild(clickButton2)
    toggleExport.before(clickDiv2)
})()
