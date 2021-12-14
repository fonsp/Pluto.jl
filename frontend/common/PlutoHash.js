export const base64_arraybuffer = async (/** @type {BufferSource} */ data) => {
    const base64url = await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([data]))
    })

    return base64url.split(",", 2)[1]
}

export const hash_arraybuffer = async (/** @type {BufferSource} */ data) => {
    // @ts-ignore
    const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data)
    return await base64_arraybuffer(hashed_buffer)
}

export const hash_str = async (/** @type {string} */ s) => {
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

export const blob_url_to_data_url = async (/** @type {string} */ blob_url) => {
    const blob = await (await fetch(blob_url)).blob()
    return await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(blob)
    })
}
