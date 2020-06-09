const code = document.querySelector("code pre")
const check = document.querySelector("input#enable-statistics")

const update_page = () => {
    const enable = localStorage.getItem("statistics enable")
    const sample = localStorage.getItem("statistics sample")
    check.checked = enable && (enable == "true")
    code.innerText = !sample ? "\n\tOpen a notebook to see statistics" : sample
}

check.disabled = false
update_page()
window.addEventListener("storage", update_page) // yesyes this too is reactive
check.oninput = () => {
    localStorage.setItem("statistics enable", check.checked)
}
