const code = document.querySelector("code pre")
const check = document.querySelector("input#enable-statistics")

function updatePage() {
    const enable = localStorage.getItem("statistics enable")
    const sample = localStorage.getItem("statistics sample")
    check.checked = !enable || (enable == "true")
    code.innerText = !sample ? "\n\tOpen a notebook to see statistics" : sample
}

check.disabled = false
updatePage()
window.addEventListener("storage", updatePage) // yesyes this too is reactive
check.oninput = () => {
    localStorage.setItem("statistics enable", check.checked)
}
