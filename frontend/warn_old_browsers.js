function ismodern() {
    try {
        // See: https://kangax.github.io/compat-table/es2016plus/

        // 2020 check:
        // return eval("let {a, ...r} = {a:1,b:1}; r?.a != r.b; 1 ?? 2")
        // 2021 check:
        // return eval("let {a, ...r} = {a:1,b:1}; r?.a != r.b; 1 ?? 2; a ||= false")
        // 2021 check (Chrome 85+, Firefox 77+, Safari 13.1+)
        // Please check with macs
        return Boolean(String.prototype.replaceAll)
    } catch (ex) {
        return false
    }
}

window.addEventListener("DOMContentLoaded", function () {
    if (!ismodern()) {
        document.body.innerHTML =
            "<div style='width: 100%; height: 100%; font-family: sans-serif;'><div style='top: 0;right: 0;left: 0;bottom: 50%;width: 300px;height: 300px;margin: auto;position: absolute;background: white; z-index: 100;'><h1>You need a shiny new browser to use Pluto!</h1><p>The latest versions of Firefox and Chrome will work best.</p></div></div>"
    }
})
