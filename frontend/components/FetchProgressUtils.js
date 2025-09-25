/**
 * 读取Uint8Array数据并显示进度
 * @param {Response} response - Fetch响应对象
 * @param {Function} on_progress - 进度回调函数，接收0-1之间的进度值
 * @returns {Promise<Uint8Array>} - 返回读取的数据
 */
export const read_Uint8Array_with_progress = async (response, on_progress) => {
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