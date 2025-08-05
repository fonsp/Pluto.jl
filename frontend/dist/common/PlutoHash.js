"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blob_url_to_data_url = exports.debounced_promises = exports.plutohash_str = exports.plutohash_arraybuffer = exports.base64url_to_base64 = exports.base64_to_base64url = exports.base64url_arraybuffer = exports.base64_arraybuffer = void 0;
//@ts-ignore
const sha256_mjs_1 = require("https://cdn.jsdelivr.net/gh/JuliaPluto/js-sha256@v0.9.0-es6/src/sha256.mjs");
const base64_arraybuffer = async (/** @type {BufferSource} */ data) => {
    /** @type {string} */
    const base64url = await new Promise((r) => {
        const reader = new FileReader();
        // @ts-ignore
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(new Blob([data]));
    });
    return base64url.substring(base64url.indexOf(',') + 1);
};
exports.base64_arraybuffer = base64_arraybuffer;
/** Encode a buffer using the `base64url` encoding, which uses URL-safe special characters, see https://en.wikipedia.org/wiki/Base64#Variants_summary_table */
const base64url_arraybuffer = async (/** @type {BufferSource} */ data) => {
    // This is roughly 0.5 as fast as `base64_arraybuffer`. See https://gist.github.com/fonsp/d2b84265012942dc40d0082b1fd405ba for benchmark and even slower alternatives.
    let original = await (0, exports.base64_arraybuffer)(data);
    return (0, exports.base64_to_base64url)(original);
};
exports.base64url_arraybuffer = base64url_arraybuffer;
/** Turn a base64-encoded string into a base64url-encoded string containing the same data. Do not apply on a `data://` URL. */
const base64_to_base64url = (/** @type {string} */ original) => {
    return original.replaceAll(/[\+\/\=]/g, (s) => {
        const c = s.charCodeAt(0);
        return c === 43 ? "-" : c === 47 ? "_" : "";
    });
};
exports.base64_to_base64url = base64_to_base64url;
/** Turn a base64url-encoded string into a base64-encoded string containing the same data. Do not apply on a `data://` URL. */
const base64url_to_base64 = (/** @type {string} */ original) => {
    const result_before_padding = original.replaceAll(/[-_]/g, (s) => {
        const c = s.charCodeAt(0);
        return c === 45 ? "+" : c === 95 ? "/" : "";
    });
    return result_before_padding + "=".repeat((4 - (result_before_padding.length % 4)) % 4);
};
exports.base64url_to_base64 = base64url_to_base64;
const t1 = "AAA/AAA+ZMg=";
const t2 = "AAA_AAA-ZMg";
console.assert((0, exports.base64_to_base64url)(t1) === t2);
console.assert((0, exports.base64url_to_base64)(t2) === t1);
(0, exports.base64_arraybuffer)(new Uint8Array([0, 0, 63, 0, 0, 62, 100, 200])).then((r) => console.assert(r === t1, r));
(0, exports.base64url_arraybuffer)(new Uint8Array([0, 0, 63, 0, 0, 62, 100, 200])).then((r) => console.assert(r === t2, r));
const plutohash_arraybuffer = async (/** @type {BufferSource} */ data) => {
    const hash = sha256_mjs_1.sha256.create();
    hash.update(data);
    const hashed_buffer = hash.arrayBuffer();
    // const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data)
    return await (0, exports.base64url_arraybuffer)(hashed_buffer);
};
exports.plutohash_arraybuffer = plutohash_arraybuffer;
const plutohash_str = async (/** @type {string} */ s) => {
    const data = new TextEncoder().encode(s);
    return await (0, exports.plutohash_arraybuffer)(data);
};
exports.plutohash_str = plutohash_str;
// hash_str("Hannes").then((r) => console.assert(r === "OI48wVWerxEEnz5lIj6CPPRB8NOwwba+LkFYTDp4aUU=", r))
(0, exports.plutohash_str)("Hannes").then((r) => console.assert(r === "OI48wVWerxEEnz5lIj6CPPRB8NOwwba-LkFYTDp4aUU", r));
const debounced_promises = (async_function) => {
    let currently_running = false;
    let rerun_when_done = false;
    return async () => {
        if (currently_running) {
            rerun_when_done = true;
        }
        else {
            currently_running = true;
            rerun_when_done = true;
            while (rerun_when_done) {
                rerun_when_done = false;
                await async_function();
            }
            currently_running = false;
        }
    };
};
exports.debounced_promises = debounced_promises;
/** @returns {Promise<string>} */
const blob_url_to_data_url = async (/** @type {string} */ blob_url) => {
    const blob = await (await fetch(blob_url)).blob();
    return await new Promise((r) => {
        const reader = new FileReader();
        // @ts-ignore
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(blob);
    });
};
exports.blob_url_to_data_url = blob_url_to_data_url;
