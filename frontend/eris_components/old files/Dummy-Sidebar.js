;(function () {
    /*
      Add Sidebar
    */
    // add style file
    function addCss(fileName) {
        var head = document.head
        var link = document.createElement("link")

        link.type = "text/css"
        link.rel = "stylesheet"
        link.href = fileName

        head.appendChild(link)
    }

    addCss("./eris_components/jive2.css")

    // make space for sidebar
    const frameDiv = document.getElementById("frame")
    // @ts-ignore
    frameDiv.style = `
    margin-left: var(--sidebar-width);
    `

    const sideBar = document.createElement("div")
    sideBar.id = "sidebar"
    sideBar.className = "jv-sidebar jv-bar-block jv-collapse-2 jv-light-grey jv-card" // jv-animate-left

    // @ts-ignore
    frameDiv.before(sideBar)

    // Search Bar
    const searchItem = document.createElement("input")
    searchItem.className = "jv-input jv-padding"
    searchItem.type = "search"
    searchItem.placeholder = "Search..."
    searchItem.id = "sideBarInput"
    searchItem.style.cssText = `
        border-radius: 12px;
        margin: 10% auto 10% 2.5%;
    `
    searchItem.onkeyup = function () {
        var input, filter, a, i
        input = document.getElementById("sideBarInput")
        // @ts-ignore
        filter = input.value.toUpperCase()
        const div = document.getElementById("sidebar")
        // @ts-ignore
        a = div.getElementsByTagName("a")
        for (i = 0; i < a.length; i++) {
            const txtValue = a[i].textContent || a[i].innerText
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                a[i].style.display = "block"
            } else {
                a[i].style.display = "none"
            }
        }
    }
    searchItem.addEventListener("search", function () {
        // @ts-ignore
        const a = div.getElementsByTagName("a")
        // @ts-ignore
        for (i = 0; i < a.length; i++) {
            // @ts-ignore
            a[i].style.display = "block"
        }
    })

    // buttons
    const closeButton = document.createElement("button")
    closeButton.className = "jv-bar-item jv-button jv-hide-large"
    closeButton.innerHTML = "Close &times"
    closeButton.onclick = w3_close

    const titleDiv = document.createElement("div")
    titleDiv.className = "jv-container "
    titleDiv.innerHTML = "<h2>JIVE </h2> \n v.0.0"
    titleDiv.style.textAlign = "center"

    const itemBar1 = document.createElement("a")
    itemBar1.href = "#"
    itemBar1.className = "jv-bar-item jv-button"
    itemBar1.innerText = "Link 1"

    // Accordion
    const itemBar2 = document.createElement("div")

    const accButton = document.createElement("button")
    accButton.className = "jv-button jv-block jv-left-align"
    accButton.innerHTML = 'Accordion <img width="15" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-down.svg"></img>'
    accButton.onclick = myAccFunc

    const demoAcc = document.createElement("div")
    demoAcc.id = "demoAcc"
    demoAcc.className = "jv-hide jv-card"
    demoAcc.style.boxShadow = "none"
    // demoAcc.style.margin = "0px 0px 5px 15px"

    const demoAccItem = document.createElement("a")
    demoAccItem.href = "#"
    demoAccItem.className = "jv-bar-item jv-button"
    demoAccItem.innerHTML = "&#x2022 "
    demoAccItem.innerText += "Link"

    const demoAccItem2 = document.createElement("a")
    demoAccItem2.href = "#"
    demoAccItem2.className = "jv-bar-item jv-button"
    demoAccItem2.innerHTML = "&#x2022 "
    demoAccItem2.innerText += "Link"

    demoAcc.appendChild(demoAccItem)
    demoAcc.appendChild(demoAccItem2)

    itemBar2.appendChild(accButton)
    itemBar2.appendChild(demoAcc)

    const itemBar3 = document.createElement("a")
    itemBar3.href = "#"
    itemBar3.className = "jv-bar-item jv-button"
    itemBar3.innerText = "Link 2"

    // Put menu together
    sideBar.appendChild(titleDiv)
    // sideBar.appendChild(closeButton)
    sideBar.appendChild(searchItem)
    sideBar.appendChild(itemBar1)
    sideBar.appendChild(itemBar2)
    sideBar.appendChild(itemBar3)

    // open button in navbar
    const openButton = document.createElement("button")
    openButton.className = "jv-button-nav jv-large jv-hide-large"
    openButton.title = "Open Sidebar"
    openButton.innerHTML =
        '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-forward.svg"></img> </span>'
    openButton.onclick = w3_open

    // Add a mouseover event listener
    openButton.addEventListener("mouseover", () => {
        // Change the button's background color
        openButton.style.opacity = "1"
    })

    // Add a mouseout event listener
    openButton.addEventListener("mouseout", () => {
        // Change the button's background color back to its original color
        openButton.style.opacity = "0.5"
    })

    const navbar = document.querySelector("#at_the_top")
    navbar?.prepend(openButton)

    ////////////////
    // functions //
    ///////////////
    function w3_open() {
        // @ts-ignore
        frameDiv.style = "margin-left: var(--sidebar-width) !important;"
        // @ts-ignore
        sideBar.style = "width: var(--sidebar-width);"
        sideBar.style.display = "block"
        openButton.innerHTML =
            '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-back.svg"></img> </span>'
        openButton.title = "Close Sidebar"
        openButton.onclick = w3_close
    }

    function w3_close() {
        // @ts-ignore
        frameDiv.style = "margin-left: 0%;"
        // @ts-ignore
        sideBar.style = "width: 0%;"
        sideBar.style.display = "none"
        openButton.innerHTML =
            '<span> <img class="dropButtonIcon" width="20" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/chevron-forward.svg"></img> </span>'
        openButton.title = "Open Sidebar"
        openButton.onclick = w3_open
    }

    function myAccFunc() {
        var x = document.getElementById("demoAcc")
        // @ts-ignore
        if (x.className.indexOf("jv-show") == -1) {
            // @ts-ignore
            x.className += " jv-show"
            // x.previousElementSibling.className += " jv-light-gray"
        } else {
            // @ts-ignore
            x.className = x.className.replace(" jv-show", "")
            // x.previousElementSibling.className = x.previousElementSibling.className.replace(" jv-light-gray", "")
        }
    }
})()
