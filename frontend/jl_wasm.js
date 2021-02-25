const std = {}

let _resolve_wasm_backend_ready
const wasm_backend_ready = new Promise((r) => {
    _resolve_wasm_backend_ready = r
})

const init_std = () => {
    std["repr"] = register_jl_function(`x->(buf = IOBuffer(); show(buf, MIME"text/plain"(), x); String(take!(buf)))`)
}

var Module = {
    preRun: [],
    postRun: [],
    noInitialRun: true,
    print: (function () {
        return function (text) {
            console.info(text)
        }
    })(),
    printErr: function (text) {
        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(" ")
        if (0) {
            // XXX disabled for safety typeof dump == 'function') {
            // dump(text + "\n") // fast, straight to the real console
            console.error(text)
        } else {
            console.error(text)
        }
    },
    setStatus: function (text) {
        console.info("Status: ", text)
    },
    totalDependencies: 0,
    monitorRunDependencies: function (left) {
        this.totalDependencies = Math.max(this.totalDependencies, left)
        Module.setStatus(left ? "Preparing... (" + (this.totalDependencies - left) + "/" + this.totalDependencies + ")" : "All downloads complete.")
    },
    postRun: [
        function () {
            Module._jl_initialize()
            input = "Base.load_InteractiveUtils()"
            ptr = Module._malloc(input.length + 1)
            Module.stringToUTF8(input, ptr, input.length + 1)
            Module._jl_eval_string(ptr)
            if (Module.initialize_jscall_runtime !== undefined) {
                Module.initialize_jscall_runtime()
            }

            _resolve_wasm_backend_ready()
        },
    ],
}
Module.setStatus("Downloading...")
window.onerror = function (event) {
    // TODO: do not warn on ok events like simulating an infinite loop or exitStatus
    Module.setStatus("Exception thrown, see JavaScript console")
    Module.setStatus = function (text) {
        if (text) Module.printErr("[post-exception status] " + text)
    }
}

Module["locateFile"] = function (file, prefix) {
    // var root = "https://fonsp-julia-wasm-build.netlify.app/"
    var root = "https://keno.github.io/julia-wasm-build/"
    return new URL(file, root).href
}

Module.JlProxy = {
    isExtensible: function () {
        return false
    },
    isJlProxy: function (jsobj) {
        return jsobj["ptr"] !== undefined
    },
    has: function (jsobj, key) {
        return false
    },
    getPtr: function (jsobj) {
        return jsobj["ptr"]
    },
}

///

const eval_jl = (input) => {
    ptr = Module._malloc(input.length + 1)
    Module.stringToUTF8(input, ptr, input.length + 1)
    result = Module._jl_eval_string(ptr)
    return new Proxy({ ptr: result }, Module.JlProxy)
}

const register_jl_function = (code) => {
    code_str_ptr = Module._malloc(code.length + 1)
    Module.stringToUTF8(code, code_str_ptr, code.length + 1)
    function_handle = Module._jl_eval_string(code_str_ptr)

    return (arg) => {
        arg_handle = Module.JlProxy.getPtr(arg)

        str = Module._jl_call1(function_handle, arg_handle)
        output = UTF8ToString(Module._jl_string_ptr(str), 4096)
        return output
    }
}

wasm_backend_ready.then(init_std)

const process_input = (input) => std.repr(eval_jl(input))

window.jl_wasm = {
    ready: wasm_backend_ready,
    eval_jl,
    register_jl_function,
    std,
}
