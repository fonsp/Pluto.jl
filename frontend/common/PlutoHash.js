export const base64_arraybuffer = async (data) => {
    const base64url = await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([data]))
    })

    return base64url.split(",", 2)[1]
}

export const hash_arraybuffer = async (data) => {
    const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data)
    return await base64_arraybuffer(hashed_buffer)
}

export const hash_str = async (s) => {
    const data = new TextEncoder().encode(s)
    return await hash_arraybuffer(data)
}

export const debounced_promises = (async_function) => {
    let currently_running = false
    let rerun_when_done = false

    return async () => {
        if (currently_running) {
            rerun_when_done = true
        } else {
            currently_running = true
            rerun_when_done = true
            while (rerun_when_done) {
                rerun_when_done = false
                await async_function()
            }
            currently_running = false
        }
    }
}

// const notebook_url = "https://mkhj.fra1.cdn.digitaloceanspaces.com/sample%20Tower%20of%20Hanoi%2016.jl"

// const thehash = await myhash(await (await fetch(notebook_url)).text())

// let patch = {
//     a: 1,
//     b: [1, 2],
// }

// const url = `/staterequest/${encodeURIComponent(thehash)}/`

// let response = await fetch(url, {
//     method: "POST",
//     body: pack(patch),
// })

// unpack(new Uint8Array(await response.arrayBuffer()))
