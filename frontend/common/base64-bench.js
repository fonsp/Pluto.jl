const base64_arraybuffer = async (data) => {
    // Use a FileReader to generate a base64 data URI
    const base64url = await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([data]))
    })

    /*
    The result looks like 
    "data:application/octet-stream;base64,<your base64 data>", 
    so we split off the beginning:
    */
    return base64url.split(",", 2)[1]
}

const base64url_arraybuffer1 = async (data) => {
    let original = await base64_arraybuffer(data)
    return original.replaceAll("+", "-").replaceAll("/", "_").replace(/\=+$/, "")
}

// A single regex, with a function to replace
const base64url_arraybuffer2 = async (data) => {
    let original = await base64_arraybuffer(data)
    return original.replaceAll(/[\+\/\=]/g, (s) => (s === "+" ? "-" : s === "/" ? "_" : ""))
}

const base64url_arraybuffer2a = async (data) => {
    let original = await base64_arraybuffer(data)
    return original.replaceAll(/[\+\/\=]/g, (s) => {
        const c = s.charCodeAt(0)
        return c === 43 ? "-" : c === 47 ? "_" : ""
    })
}

// Same as last one, but the = trimming at the end is not handled by the regex, but manually.
const base64url_arraybuffer3 = async (data) => {
    let original = await base64_arraybuffer(data)

    const almost = original.replaceAll(/[\+\/]/g, (s) => (s === "+" ? "-" : "_"))
    if (almost.length < 2) {
        return almost
    } else {
        const offset = almost[almost.length - 1] === "=" ? (almost[almost.length - 2] === "=" ? 2 : 1) : 0
        return almost.slice(0, almost.length - offset)
    }
}

const enc = new TextEncoder()
const dec = new TextDecoder()

const plus = enc.encode("+")[0]
const slash = enc.encode("/")[0]
const equals = enc.encode("=")[0]
const dash = enc.encode("-")[0]
const underscore = enc.encode("_")[0]

const base64url_arraybuffer4 = async (data) => {
    const original = await base64_arraybuffer(data)
    const buffer = enc.encode(original)
    for (let i = 0; i < buffer.length; i++) {
        const old = buffer[i]
        buffer[i] = old === plus ? dash : old === slash ? underscore : old
    }
    return dec.decode(buffer)
}

let measure = async (f) => {
    // create some random data in a small buffer
    let smallbuffer = new Uint8Array(50000)
    crypto.getRandomValues(smallbuffer)

    // create a large buffer (10MB) with this random data
    let length = 10000000
    let buffer = new Uint8Array(length)
    buffer.forEach((_, i) => {
        buffer[i] = smallbuffer[i % 50000]
    })

    // call our function
    let start = performance.now()
    await f(buffer)
    let stop = performance.now()

    // return a measurement
    let seconds = (stop - start) / 1000
    let megabytes = length / 1000 / 1000
    return `MB per second: ${Math.floor(megabytes / seconds)}`
}

// example use:
for (let f of [base64_arraybuffer, base64url_arraybuffer1, base64url_arraybuffer2, base64url_arraybuffer2a, base64url_arraybuffer3, base64url_arraybuffer4]) {
    console.log(f.name)
    console.log(await f(new Uint8Array([0, 0, 63, 0, 0, 62, 100, 200])))

    for (let i of new Array(10)) {
        console.log(await measure(f))
    }
}
// returns: 'MB per second: 261'
