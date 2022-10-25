// ES6 import for msgpack-lite, we use the fonsp/msgpack-lite fork to make it ES6-importable (without nodejs)
import msgpack from "../imports/msgpack-lite.js"

// based on https://github.com/kawanet/msgpack-lite/blob/5b71d82cad4b96289a466a6403d2faaa3e254167/lib/ext-packer.js
const codec = msgpack.createCodec()
const packTypedArray = (x) => new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
codec.addExtPacker(0x11, Int8Array, packTypedArray)
codec.addExtPacker(0x12, Uint8Array, packTypedArray)
codec.addExtPacker(0x13, Int16Array, packTypedArray)
codec.addExtPacker(0x14, Uint16Array, packTypedArray)
codec.addExtPacker(0x15, Int32Array, packTypedArray)
codec.addExtPacker(0x16, Uint32Array, packTypedArray)
codec.addExtPacker(0x17, Float32Array, packTypedArray)
codec.addExtPacker(0x18, Float64Array, packTypedArray)

codec.addExtPacker(0x12, Uint8ClampedArray, packTypedArray)
codec.addExtPacker(0x12, ArrayBuffer, (x) => new Uint8Array(x))
codec.addExtPacker(0x12, DataView, packTypedArray)

// Pack and unpack dates. However, encoding a date does throw on Safari because it doesn't have BigInt64Array.
// This isn't too much a problem, as Safari doesn't even support <input type=date /> yet...
// But it does throw when I create a custom @bind that has a Date value...
// For decoding I now also use a "Invalid Date", but the code in https://stackoverflow.com/a/55338384/2681964 did work in Safari.
// Also there is no way now to send an "Invalid Date", so it just does nothing
codec.addExtPacker(0x0d, Date, (d) => new BigInt64Array([BigInt(+d)]))
codec.addExtUnpacker(0x0d, (uintarray) => {
    if ("getBigInt64" in DataView.prototype) {
        let dataview = new DataView(uintarray.buffer, uintarray.byteOffset, uintarray.byteLength)
        let bigint = dataview.getBigInt64(0, true) // true here is "littleEndianes", not sure if this only Works On My Machine©
        if (bigint > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Can't read too big number as date (how far in the future is this?!)`)
        }
        return new Date(Number(bigint))
    } else {
        return new Date(NaN)
    }
})

codec.addExtUnpacker(0x11, (x) => new Int8Array(x.buffer))
codec.addExtUnpacker(0x12, (x) => new Uint8Array(x.buffer))
codec.addExtUnpacker(0x13, (x) => new Int16Array(x.buffer))
codec.addExtUnpacker(0x14, (x) => new Uint16Array(x.buffer))
codec.addExtUnpacker(0x15, (x) => new Int32Array(x.buffer))
codec.addExtUnpacker(0x16, (x) => new Uint32Array(x.buffer))
codec.addExtUnpacker(0x17, (x) => new Float32Array(x.buffer))
codec.addExtUnpacker(0x18, (x) => new Float64Array(x.buffer))

/** @param {any} x */
export const pack = (x) => {
    return msgpack.encode(x, { codec: codec })
}

/** @param {Uint8Array} x */
export const unpack = (x) => {
    return msgpack.decode(x, { codec: codec })
}
