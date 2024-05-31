// @ts-nocheck
;(function () {
    /*
      Add Drop-down Menu
    */

    const toggleExport = document.querySelector("#at_the_top .toggle_export")
    const dropDiv = document.createElement("div")
    const dropButton = document.createElement("button")
    const dropMenu = document.createElement("div")
    const dropMenuItem1 = document.createElement("a")
    const dropMenuItem2 = document.createElement("a")
    const dropMenuItem3 = document.createElement("a")
    // const searchItem = document.createElement("input")

    dropDiv.style.cssText = `
      position: relative;
      display: inline-block;
    `

    dropButton.innerHTML =
        '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/document-outline.svg"></img> </span>'
    dropButton.style.cssText = `
      color: white;
      cursor: pointer;
      margin-right: 2rem;
      border: none;
      padding: 0.3rem 0.55rem;
      opacity: 0.5;
      background-color: Transparent;
    `

    dropButton.title = "Menu"
    dropButton.className = "dropButton"
    dropButton.onclick = function () {
        if (dropMenu.style.display === "none") {
            dropMenu.style.display = "block"
        } else {
            dropMenu.style.display = "none"
        }
    }

    // Add a mouseover event listener
    dropButton.addEventListener("mouseover", () => {
        // Change the button's background color
        dropButton.style.opacity = "1"
    })

    // Add a mouseout event listener
    dropButton.addEventListener("mouseout", () => {
        // Change the button's background color back to its original color
        dropButton.style.opacity = "0.5"
    })

    dropMenu.id = "dropMenu"
    dropMenu.style.cssText = `
    display: none;
    position: absolute;
    background-color: var(--code-background);
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    border-radius: 12px;
    z-index: 1;
    `

    dropMenuItem1.href = "#about"
    dropMenuItem1.innerText = "About"
    dropMenuItem1.style.cssText = `
      color: var(--cursor-color);
      padding: 12px 16px;
      text-decoration: none;
      display: block;
    `

    dropMenuItem2.href = "#base"
    dropMenuItem2.innerText = "Base"
    dropMenuItem2.style.cssText = `
      color: var(--cursor-color);
      padding: 12px 16px;
      text-decoration: none;
      display: block;
    `
    dropMenuItem3.href = "#tools"
    dropMenuItem3.innerText = "Tools"
    dropMenuItem3.style.cssText = `
      color: var(--cursor-color);
      padding: 12px 16px;
      text-decoration: none;
      display: block;
    `

    // searchItem.className = "searchItem"
    // searchItem.type = "search"
    // searchItem.placeholder = "Search..."
    // searchItem.id = "myInput"
    // searchItem.style.cssText = `
    //   font-family: var(--julia-mono-font-stack);
    //   box-sizing: border-box;
    //   background-color: var(--nord-polar-night-1);
    //   background-image: url(https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/search.svg);
    //   background-position: 14px 12px;
    //   background-repeat: no-repeat;
    //   padding: 14px 20px 12px 25px;
    //   border: none;
    //   border-radius: 12px;
    //   border-bottom: 1px solid #ddd;
    // `
    // searchItem.onkeyup = function () {
    //     var input, filter, ul, li, a, i
    //     input = document.getElementById("myInput")
    //     filter = input.value.toUpperCase()
    //     div = document.getElementById("dropMenu")
    //     a = div.getElementsByTagName("a")
    //     for (i = 0; i < a.length; i++) {
    //         txtValue = a[i].textContent || a[i].innerText
    //         if (txtValue.toUpperCase().indexOf(filter) > -1) {
    //             a[i].style.display = "block"
    //         } else {
    //             a[i].style.display = "none"
    //         }
    //     }
    // }
    // searchItem.addEventListener("search", function (event) {
    //     a = div.getElementsByTagName("a")
    //     for (i = 0; i < a.length; i++) {
    //         a[i].style.display = "block"
    //     }
    // })

    window.onclick = function (e) {
        if (!e.target.matches(".dropButton") && !e.target.matches(".dropButtonIcon") && !e.target.matches(".searchItem")) {
            dropMenu.style.display = "none"
        }
    }

    // dropMenu.appendChild(searchItem)

    dropMenu.appendChild(dropMenuItem1)
    dropMenu.appendChild(dropMenuItem2)
    dropMenu.appendChild(dropMenuItem3)

    dropDiv.appendChild(dropButton)
    dropDiv.appendChild(dropMenu)
    toggleExport.before(dropDiv)

    // other buttons
    const clickDiv = document.createElement("div")
    const clickButton = document.createElement("button")

    clickDiv.style.cssText = `
      position: relative;
      display: inline-block;
    `

    clickButton.innerHTML =
        '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/play-outline.svg"></img> </span>'
    clickButton.style.cssText = `
      color: white;
      cursor: pointer;
      margin-right: 2rem;
      border: none;
      padding: 0.3rem 0.55rem;
      opacity: 0.5;
      background-color: Transparent;
    `

    clickButton.title = "Menu2"
    clickButton.className = "clickButton"
    clickButton.onclick = function () {}

    // Add a mouseover event listener
    clickButton.addEventListener("mouseover", () => {
        // Change the button's background color
        clickButton.style.opacity = "1"
    })

    // Add a mouseout event listener
    clickButton.addEventListener("mouseout", () => {
        // Change the button's background color back to its original color
        clickButton.style.opacity = "0.5"
    })

    clickDiv.appendChild(clickButton)
    toggleExport.before(clickDiv)

    //
    const clickDiv2 = document.createElement("div")
    const clickButton2 = document.createElement("button")

    clickDiv2.style.cssText = `
      position: relative;
      display: inline-block;
    `

    const eyeopen =
        '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/eye-outline.svg"></img> </span>'
    const eyeclosed =
        '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/eye-off-outline.svg"></img> </span>'

    clickButton2.innerHTML = eyeopen
    clickButton2.style.cssText = `
      color: white;
      cursor: pointer;
      margin-right: 2rem;
      border: none;
      padding: 0.3rem 0.55rem;
      opacity: 0.5;
      background-color: Transparent;
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

    clickDiv2.appendChild(clickButton2)
    toggleExport.before(clickDiv2)
})()
