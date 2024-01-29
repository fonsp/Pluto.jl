import { html } from "../imports/Preact.js"

export const read_Uint8Array_with_progress = async (/** @type {Response} */ response, on_progress) => {
    if (response.body != null) {
        const length_str = response.headers.get("Content-Length")
        const length = length_str == null ? null : Number(length_str)

        const reader = response.body.getReader()

        let receivedLength = 0
        let chunks = []
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            chunks.push(value)
            receivedLength += value.length

            if (length != null) {
                on_progress(Math.min(1, receivedLength / length))
            } else {
                // fake progress: 50% at 1MB, 67% at 2MB, 75% at 3MB, etc.
                const z = 1e6
                on_progress(1.0 - z / (receivedLength - z))
            }
            console.log({ receivedLength })
        }

        on_progress(1)

        const buffer = new Uint8Array(receivedLength)
        let position = 0
        for (let chunk of chunks) {
            buffer.set(chunk, position)
            position += chunk.length
        }
        return buffer
    } else {
        return new Uint8Array(await response.arrayBuffer())
    }
}

export const FetchProgress = ({ progress }) =>
    progress == null || progress === 1
        ? null
        : html`<progress class="statefile-fetch-progress" max="100" value=${progress === "indeterminate" ? undefined : Math.round(progress * 100)}>
              ${progress === "indeterminate" ? null : Math.round(progress * 100)}%
          </progress>`
