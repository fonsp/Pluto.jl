export const hash_arraybuffer = async (data) => {
    const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data)

    const base64url = await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([hashed_buffer]))
    })

    return base64url.split(",", 2)[1]
}

export const hash_str = async (s) => {
    const data = new TextEncoder().encode(s)
    return await hash_arraybuffer(data)
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
