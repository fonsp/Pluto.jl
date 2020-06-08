// Polyfill for Blob::text when there is none (safari)
// This is not "officialy" supported
if (Blob.prototype.text == null) {
    Blob.prototype.text = function () {
        const reader = new FileReader()
        const promise = new Promise((resolve, reject) => {
            // on read success
            reader.onload = () => {
                resolve(reader.result)
            }
            // on failure
            reader.onerror = (e) => {
                reader.abort()
                reject(e)
            }
        })
        reader.readAsText(this)
        return promise
    }
}

Array.prototype.last = function () {
    return this[this.length-1]
}