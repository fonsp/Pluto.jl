'use strict';

var _esm = require('https://cdn.jsdelivr.net/npm/@observablehq/stdlib@3.3.1/+esm');
var msgpack = require('https://cdn.jsdelivr.net/gh/fonsp/msgpack-lite@0.1.27-es.1/dist/msgpack-es.min.mjs');
var polyfill_js_pin_v113_target_es2020 = require('https://esm.sh/seamless-scroll-polyfill@2.1.8/lib/polyfill.js?pin=v113&target=es2020');
var preact_10_13_2_pin_v113_target_es2020 = require('https://esm.sh/preact@10.13.2?pin=v113&target=es2020');
var hooks_pin_v113_target_es2020 = require('https://esm.sh/preact@10.13.2/hooks?pin=v113&target=es2020');
var htm = require('https://esm.sh/htm@3.1.1?pin=v113&target=es2020');
var immer = require('https://cdn.jsdelivr.net/npm/immer@8.0.0/dist/immer.esm.js');
var _ = require('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm');
var index_es_min_js = require('https://cdn.jsdelivr.net/gh/JuliaPluto/codemirror-pluto-setup@2001.0.0/dist/index.es.min.js');
var purify = require('https://esm.sh/dompurify@3.2.3?pin=v135');
var AnsiUpPackage = require('https://cdn.jsdelivr.net/npm/ansi_up@5.1.0/+esm');
var dialogPolyfill = require('https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js');
var sha256_mjs = require('https://cdn.jsdelivr.net/gh/JuliaPluto/js-sha256@v0.9.0-es6/src/sha256.mjs');
var hljs = require('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/highlight.min.js');
var hljs_julia = require('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia.min.js');
var hljs_juliarepl = require('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia-repl.min.js');
require('https://cdn.jsdelivr.net/npm/requestidlecallback-polyfill@1.0.2/index.js');
var vmsg = require('https://cdn.jsdelivr.net/npm/vmsg@0.4.0/vmsg.js');
require('https://cdn.jsdelivr.net/gh/fonsp/rebel-tag-input@1.0.6/lib/rebel-tag-input.mjs');

// @ts-ignore

const make_library = () => {
    // @ts-ignore
    const library = new _esm.Library();
    return {
        DOM: library.DOM,
        Files: library.Files,
        Generators: library.Generators,
        Promises: library.Promises,
        now: library.now,
        svg: library.svg(),
        html: library.html(),
        require: library.require(),
    }

    // TODO
    // observablehq.md and observablehq.tex will call d3-require, which will create a conflict if something else is using d3-require
    // in particular, plotly.js will break

    // observablehq.md(observablehq.require()).then((md) => (observablehq_exports.md = md))
    // observablehq.tex().then(tex => observablehq_exports.tex = tex)
};

// We use two different observable stdlib instances: one for ourselves and one for the JS code in cell outputs
const observablehq_for_myself = make_library();
const observablehq_for_cells = make_library();
const Promises = observablehq_for_myself.Promises;

// ES6 import for msgpack-lite, we use the fonsp/msgpack-lite fork to make it ES6-importable (without nodejs)

// based on https://github.com/kawanet/msgpack-lite/blob/5b71d82cad4b96289a466a6403d2faaa3e254167/lib/ext-packer.js
const codec = msgpack.createCodec();
const packTypedArray = (x) => new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
codec.addExtPacker(0x11, Int8Array, packTypedArray);
codec.addExtPacker(0x12, Uint8Array, packTypedArray);
codec.addExtPacker(0x13, Int16Array, packTypedArray);
codec.addExtPacker(0x14, Uint16Array, packTypedArray);
codec.addExtPacker(0x15, Int32Array, packTypedArray);
codec.addExtPacker(0x16, Uint32Array, packTypedArray);
codec.addExtPacker(0x17, Float32Array, packTypedArray);
codec.addExtPacker(0x18, Float64Array, packTypedArray);

codec.addExtPacker(0x12, Uint8ClampedArray, packTypedArray);
codec.addExtPacker(0x12, ArrayBuffer, (x) => new Uint8Array(x));
codec.addExtPacker(0x12, DataView, packTypedArray);

// Pack and unpack dates. However, encoding a date does throw on Safari because it doesn't have BigInt64Array.
// This isn't too much a problem, as Safari doesn't even support <input type=date /> yet...
// But it does throw when I create a custom @bind that has a Date value...
// For decoding I now also use a "Invalid Date", but the code in https://stackoverflow.com/a/55338384/2681964 did work in Safari.
// Also there is no way now to send an "Invalid Date", so it just does nothing
codec.addExtPacker(0x0d, Date, (d) => new BigInt64Array([BigInt(+d)]));
codec.addExtUnpacker(0x0d, (uintarray) => {
    if ("getBigInt64" in DataView.prototype) {
        let dataview = new DataView(uintarray.buffer, uintarray.byteOffset, uintarray.byteLength);
        let bigint = dataview.getBigInt64(0, true); // true here is "littleEndianes", not sure if this only Works On My Machine©
        if (bigint > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Can't read too big number as date (how far in the future is this?!)`)
        }
        return new Date(Number(bigint))
    } else {
        return new Date(NaN)
    }
});

codec.addExtUnpacker(0x11, (x) => new Int8Array(x.buffer));
codec.addExtUnpacker(0x12, (x) => new Uint8Array(x.buffer));
codec.addExtUnpacker(0x13, (x) => new Int16Array(x.buffer));
codec.addExtUnpacker(0x14, (x) => new Uint16Array(x.buffer));
codec.addExtUnpacker(0x15, (x) => new Int32Array(x.buffer));
codec.addExtUnpacker(0x16, (x) => new Uint32Array(x.buffer));
codec.addExtUnpacker(0x17, (x) => new Float32Array(x.buffer));
codec.addExtUnpacker(0x18, (x) => new Float64Array(x.buffer));

/** @param {any} x */
const pack = (x) => {
    return msgpack.encode(x, { codec: codec })
};

/** @param {Uint8Array} x */
const unpack = (x) => {
    return msgpack.decode(x, { codec: codec })
};

// Polyfill for Blob::text when there is none (safari)
// This is not "officialy" supported
if (Blob.prototype.text == null) {
    Blob.prototype.text = function () {
        const reader = new FileReader();
        const promise = new Promise((resolve, reject) => {
            // on read success
            reader.onload = () => {
                resolve(reader.result);
            };
            // on failure
            reader.onerror = (e) => {
                reader.abort();
                reject(e);
            };
        });
        reader.readAsText(this);
        return promise
    };
}

// Polyfill for Blob::arrayBuffer when there is none (safari)
// This is not "officialy" supported
if (Blob.prototype.arrayBuffer == null) {
    Blob.prototype.arrayBuffer = function () {
        return new Response(this).arrayBuffer()
    };
}

polyfill_js_pin_v113_target_es2020.polyfill();

/**
 * @template T
 * @type {Stack<T>}
 */
class Stack {
    /**
     * @param {number} max_size
     */
    constructor(max_size) {
        this.max_size = max_size;
        this.arr = [];
    }
    /**
     * @param {T} item
     * @returns {void}
     */
    push(item) {
        this.arr.push(item);
        if (this.arr.length > this.max_size) {
            this.arr.shift();
        }
    }
    /**
     * @returns {T[]}
     */
    get() {
        return this.arr
    }
}

const with_query_params = (/** @type {String | URL} */ url_str, /** @type {Record<string,string | null | undefined>} */ params) => {
    const fake_base = "http://delete-me.com/";
    const url = new URL(url_str, fake_base);
    Object.entries(params).forEach(([key, val]) => {
        if (val != null) url.searchParams.append(key, val);
    });
    return url.toString().replace(fake_base, "")
};

console.assert(with_query_params("https://example.com/", { a: "b c" }) === "https://example.com/?a=b+c");
console.assert(with_query_params(new URL("https://example.com/"), { a: "b c" }) === "https://example.com/?a=b+c");
console.assert(with_query_params(new URL("https://example.com/"), { a: "b c", asdf: null, xx: "123" }) === "https://example.com/?a=b+c&xx=123");
console.assert(with_query_params("index.html", { a: "b c" }) === "index.html?a=b+c");
console.assert(with_query_params("index.html?x=123", { a: "b c" }) === "index.html?x=123&a=b+c");
console.assert(with_query_params("index.html?x=123#asdf", { a: "b c" }) === "index.html?x=123&a=b+c#asdf");

const reconnect_after_close_delay = 500;
const retry_after_connect_failure_delay = 5000;

/**
 * Return a promise that resolves to:
 *  - the resolved value of `promise`
 *  - an error after `time_ms` milliseconds
 * whichever comes first.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} time_ms
 * @returns {Promise<T>}
 */
const timeout_promise = (promise, time_ms) =>
    Promise.race([
        promise,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("Promise timed out."));
            }, time_ms);
        }),
    ]);

/**
 * @template T
 * @returns {{current: Promise<T>, resolve: (value: T) => void, reject: (error: any) => void }}
 */
const resolvable_promise = () => {
    let resolve = () => {};
    let reject = () => {};
    const p = new Promise((_resolve, _reject) => {
        //@ts-ignore
        resolve = _resolve;
        reject = _reject;
    });
    return {
        current: p,
        resolve: resolve,
        reject: reject,
    }
};

/**
 * @returns {string}
 */
const get_unique_short_id = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

const socket_is_alright = (socket) => socket.readyState == WebSocket.OPEN || socket.readyState == WebSocket.CONNECTING;

const socket_is_alright_with_grace_period = (socket) =>
    new Promise((res) => {
        if (socket_is_alright(socket)) {
            res(true);
        } else {
            setTimeout(() => {
                res(socket_is_alright(socket));
            }, 1000);
        }
    });

const try_close_socket_connection = (/** @type {WebSocket} */ socket) => {
    socket.onopen = () => {
        try_close_socket_connection(socket);
    };
    socket.onmessage = socket.onclose = socket.onerror = null;
    try {
        socket.close(1000, "byebye");
    } catch (ex) {}
};

/**
 * Open a 'raw' websocket connection to an API with MessagePack serialization. The method is asynchonous, and resolves to a @see WebsocketConnection when the connection is established.
 * @typedef {{socket: WebSocket, send: Function}} WebsocketConnection
 * @param {string} address The WebSocket URL
 * @param {{on_message: Function, on_socket_close:Function}} callbacks
 * @param {number} timeout_s Timeout for creating the websocket connection (seconds)
 * @returns {Promise<WebsocketConnection>}
 */
const create_ws_connection = (address, { on_message, on_socket_close }, timeout_s = 30) => {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(address);

        let has_been_open = false;

        const timeout_handle = setTimeout(() => {
            console.warn("Creating websocket timed out", new Date().toLocaleTimeString());
            try_close_socket_connection(socket);
            reject("Socket timeout");
        }, timeout_s * 1000);

        const send_encoded = (message) => {
            const encoded = pack(message);
            if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) throw new Error("Socket is closed")
            socket.send(encoded);
        };

        let last_task = Promise.resolve();
        socket.onmessage = (event) => {
            // we read and deserialize the incoming messages asynchronously
            // they arrive in order (WS guarantees this), i.e. this socket.onmessage event gets fired with the message events in the right order
            // but some message are read and deserialized much faster than others, because of varying sizes, so _after_ async read & deserialization, messages are no longer guaranteed to be in order
            //
            // the solution is a task queue, where each task includes the deserialization and the update handler
            last_task = last_task.then(async () => {
                try {
                    const buffer = await event.data.arrayBuffer();
                    const message = unpack(new Uint8Array(buffer));

                    try {
                        on_message(message);
                    } catch (process_err) {
                        console.error("Failed to process message from websocket", process_err, { message });
                        // prettier-ignore
                        alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${process_err.message}\n\n${JSON.stringify(event)}`);
                    }
                } catch (unpack_err) {
                    console.error("Failed to unpack message from websocket", unpack_err, { event });

                    // prettier-ignore
                    alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to unpack message\n${unpack_err}\n\n${JSON.stringify(event)}`);
                }
            });
        };

        socket.onerror = async (e) => {
            console.error(`Socket did an oopsie - ${e.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e);

            if (await socket_is_alright_with_grace_period(socket)) {
                console.log("The socket somehow recovered from an error?! Onbegrijpelijk");
                console.log(socket);
                console.log(socket.readyState);
            } else {
                if (has_been_open) {
                    on_socket_close();
                    try_close_socket_connection(socket);
                } else {
                    reject(e);
                }
            }
        };
        socket.onclose = async (e) => {
            console.warn(`Socket did an oopsie - ${e.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e);

            if (has_been_open) {
                on_socket_close();
                try_close_socket_connection(socket);
            } else {
                reject(e);
            }
        };
        socket.onopen = () => {
            console.log("Socket opened", new Date().toLocaleTimeString());
            clearInterval(timeout_handle);
            has_been_open = true;
            resolve({
                socket: socket,
                send: send_encoded,
            });
        };
        console.log("Waiting for socket to open...", new Date().toLocaleTimeString());
    })
};

let next_tick_promise = () => {
    return new Promise((resolve) => setTimeout(resolve, 0))
};

/**
 * batched_updates(send) creates a wrapper around the real send, and understands the update_notebook messages.
 * Whenever those are sent, it will wait for a "tick" (basically the end of the code running now)
 * and then send all updates from this tick at once. We use this to fix https://github.com/fonsp/Pluto.jl/issues/928
 *
 * I need to put it here so other code,
 * like running cells, will also wait for the updates to complete.
 * I SHALL MAKE IT MORE COMPLEX! (https://www.youtube.com/watch?v=aO3JgPUJ6iQ&t=195s)
 * @param {import("./PlutoConnectionSendFn").SendFn} send
 * @returns {import("./PlutoConnectionSendFn").SendFn}
 */
const batched_updates = (send) => {
    let current_combined_updates_promise = null;
    let current_combined_updates = [];
    let current_combined_notebook_id = null;

    let batched = async (message_type, body, metadata, no_broadcast) => {
        if (message_type === "update_notebook") {
            if (current_combined_notebook_id != null && current_combined_notebook_id != metadata.notebook_id) {
                // prettier-ignore
                throw new Error("Switched notebook inbetween same-tick updates??? WHAT?!?!")
            }
            current_combined_updates = [...current_combined_updates, ...body.updates];
            current_combined_notebook_id = metadata.notebook_id;

            if (current_combined_updates_promise == null) {
                current_combined_updates_promise = next_tick_promise().then(async () => {
                    let sending_current_combined_updates = current_combined_updates;
                    current_combined_updates_promise = null;
                    current_combined_updates = [];
                    current_combined_notebook_id = null;
                    return await send(message_type, { updates: sending_current_combined_updates }, metadata, no_broadcast)
                });
            }

            return await current_combined_updates_promise
        } else {
            return await send(message_type, body, metadata, no_broadcast)
        }
    };

    return batched
};

const ws_address_from_base = (/** @type {string | URL} */ base_url) => {
    const ws_url = new URL("./", base_url);
    ws_url.protocol = ws_url.protocol.replace("http", "ws");

    // if the original URL had a secret in the URL, we can also add it here:
    const ws_url_with_secret = with_query_params(ws_url, { secret: new URL(base_url).searchParams.get("secret") });

    return ws_url_with_secret
};

const default_ws_address = () => ws_address_from_base(window.location.href);

/**
 * @typedef PlutoConnection
 * @type {{
 *  session_options: Record<string,any>,
 *  send: import("./PlutoConnectionSendFn").SendFn,
 *  kill: (allow_reconnect?: boolean) => void,
 *  version_info: {
 *      julia: string,
 *      pluto: string,
 *      dismiss_update_notification: boolean,
 *  },
 *  notebook_exists: boolean,
 *  message_log: import("./Stack.js").Stack<any>,
 * }}
 */

/**
 * @typedef PlutoMessage
 * @type {any}
 */

/**
 * Open a connection with Pluto, that supports a question-response mechanism. The method is asynchonous, and resolves to a @see PlutoConnection when the connection is established.
 *
 * The server can also send messages to all clients, without being requested by them. These end up in the @see on_unrequested_update callback.
 *
 * @param {{
 *  on_unrequested_update: (message: PlutoMessage, by_me: boolean) => void,
 *  on_reconnect: () => Promise<boolean>,
 *  on_connection_status: (connection_status: boolean, hopeless: boolean) => void,
 *  connect_metadata?: Object,
 *  ws_address?: String,
 * }} options
 * @return {Promise<PlutoConnection>}
 */
const create_pluto_connection = async ({
    on_unrequested_update,
    on_reconnect,
    on_connection_status,
    connect_metadata = {},
    ws_address = default_ws_address(),
}) => {
    let ws_connection = /** @type {WebsocketConnection?} */ (null); // will be defined later i promise
    const message_log = new Stack(100);
    // @ts-ignore
    window.pluto_get_message_log = () => message_log.get();
    let auto_reconnect = true;

    const client = {
        // send: null,
        // session_options: null,
        version_info: {
            julia: "unknown",
            pluto: "unknown",
            dismiss_update_notification: false,
        },
        notebook_exists: true,
        // kill: null,
        message_log,
    }; // same

    const client_id = get_unique_short_id();
    const sent_requests = new Map();

    /** @type {import("./PlutoConnectionSendFn").SendFn} */
    const send = async (message_type, body = {}, metadata = {}, no_broadcast = true) => {
        if (ws_connection == null) {
            throw new Error("No connection established yet")
        }
        const request_id = get_unique_short_id();

        // This data will be sent:
        const message = {
            type: message_type,
            client_id: client_id,
            request_id: request_id,
            body: body,
            ...metadata,
        };

        let p = resolvable_promise();

        sent_requests.set(request_id, (response_message) => {
            p.resolve(response_message);
            if (no_broadcast === false) {
                on_unrequested_update(response_message, true);
            }
        });

        ws_connection.send(message);
        return await p.current
    };

    client.send = batched_updates(send);

    const connect = async () => {
        let update_url_with_binder_token = async () => {
            try {
                const on_a_binder_server = window.location.href.includes("binder");
                if (!on_a_binder_server) return
                const url = new URL(window.location.href);
                const response = await fetch("possible_binder_token_please");
                if (!response.ok) {
                    return
                }
                const possible_binder_token = await response.text();
                if (possible_binder_token !== "" && url.searchParams.get("token") !== possible_binder_token) {
                    url.searchParams.set("token", possible_binder_token);
                    history.replaceState({}, "", url.toString());
                }
            } catch (error) {
                console.warn("Error while setting binder url:", error);
            }
        };
        update_url_with_binder_token();

        try {
            ws_connection = await create_ws_connection(String(ws_address), {
                on_message: (update) => {
                    message_log.push(update);

                    const by_me = update.initiator_id == client_id;
                    const request_id = update.request_id;

                    if (by_me && request_id) {
                        const request = sent_requests.get(request_id);
                        if (request) {
                            request(update);
                            sent_requests.delete(request_id);
                            return
                        }
                    }
                    on_unrequested_update(update, by_me);
                },
                on_socket_close: async () => {
                    on_connection_status(false, false);
                    if (!auto_reconnect) {
                        console.log("Auto-reconnect is disabled, so we're not reconnecting");
                        on_connection_status(false, true);
                        return
                    }

                    console.log(`Starting new websocket`, new Date().toLocaleTimeString());
                    await Promises.delay(reconnect_after_close_delay);
                    await connect(); // reconnect!

                    console.log(`Starting state sync`, new Date().toLocaleTimeString());
                    const accept = await on_reconnect();
                    console.log(`State sync ${accept ? "" : "not "}successful`, new Date().toLocaleTimeString());
                    on_connection_status(accept, false);
                    if (!accept) {
                        alert("Connection out of sync 😥\n\nRefresh the page to continue");
                    }
                },
            });

            // let's say hello
            console.log("Hello?");
            const u = await send("connect", {}, connect_metadata);
            console.log("Hello!");
            client.kill = (allow_reconnect = true) => {
                auto_reconnect = allow_reconnect;
                if (ws_connection) ws_connection.socket.close();
            };
            client.session_options = u.message.session_options;
            client.version_info = u.message.version_info;
            client.notebook_exists = u.message.notebook_exists;

            console.log("Client object: ", client);

            if (connect_metadata.notebook_id != null && !u.message.notebook_exists) {
                on_connection_status(false, true);
                return {}
            }
            on_connection_status(true, false);

            const ping = () => {
                send("ping", {}, {})
                    .then(() => {
                        // Ping faster than timeout?
                        setTimeout(ping, 28 * 1000);
                    })
                    .catch(() => undefined);
            };
            ping();

            return u.message
        } catch (ex) {
            console.error("connect() failed", ex);
            await Promises.delay(retry_after_connect_failure_delay);
            return await connect()
        }
    };
    await connect();

    return /** @type {PlutoConnection} */ (client)
};

// @ts-nocheck

const html = htm.bind(preact_10_13_2_pin_v113_target_es2020.h);

var preact = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Component: preact_10_13_2_pin_v113_target_es2020.Component,
    cloneElement: preact_10_13_2_pin_v113_target_es2020.cloneElement,
    createContext: preact_10_13_2_pin_v113_target_es2020.createContext,
    createRef: preact_10_13_2_pin_v113_target_es2020.createRef,
    h: preact_10_13_2_pin_v113_target_es2020.h,
    html: html,
    hydrate: preact_10_13_2_pin_v113_target_es2020.hydrate,
    render: preact_10_13_2_pin_v113_target_es2020.render,
    useCallback: hooks_pin_v113_target_es2020.useCallback,
    useContext: hooks_pin_v113_target_es2020.useContext,
    useEffect: hooks_pin_v113_target_es2020.useEffect,
    useErrorBoundary: hooks_pin_v113_target_es2020.useErrorBoundary,
    useLayoutEffect: hooks_pin_v113_target_es2020.useLayoutEffect,
    useMemo: hooks_pin_v113_target_es2020.useMemo,
    useRef: hooks_pin_v113_target_es2020.useRef,
    useState: hooks_pin_v113_target_es2020.useState
});

// @ts-nocheck

/*
Some packages look for `process.env`, so we give it to them.
*/
/*
Why not just `window.process = { env: NODE_ENV }`?
I once had an extension that was broken and exported its `window.process` to all pages.
I'm not saying we should support that, but this code made it work.
The extension itself is now fixed, but this might just work when an extension
  does something similar in the future 🤷‍♀️
*/

try {
    if (window.process == null) {
        window.process = {};
    }
    if (window.process.env == null) {
        window.process.env = {};
    }
    window.process.env.NODE_ENV = "production";
} catch (err) {
    console.warn(`Couldn't set window.process.env, this might break some things`);
}

// @ts-nocheck

immer.enablePatches();

// we have some Editor.setState functions that use immer, so Editor.this.state becomes an "immer immutable frozen object". But we also have some Editor.setState functions that don't use immer, and they try to _mutate_ Editor.this.state. This gives errors like https://github.com/immerjs/immer/issues/576

// The solution is to tell immer not to create immutable objects

immer.setAutoFreeze(false);

// Sorry Fons, even this part of the code is now unnessarily overengineered.
// But at least, I overengineered this on purpose. - DRAL

let async = async (async) => async();

let firebase_load_promise = null;
const init_firebase = async () => {
    if (firebase_load_promise == null) {
        firebase_load_promise = async(async () => {
            let [{ initializeApp }, firestore_module] = await Promise.all([
                // @ts-ignore
                import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
                // @ts-ignore
                import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'),
            ]);
            let { getFirestore, addDoc, doc, collection } = firestore_module;

            // @ts-ignore
            let app = initializeApp({
                apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
                authDomain: "localhost",
                projectId: "pluto-feedback",
            });

            let db = getFirestore(app);
            let feedback_db = collection(db, "feedback");

            let add_feedback = async (feedback) => {
                let docref = await addDoc(feedback_db, feedback);
                console.debug("Firestore doc created ", docref.id, docref);
            };

            console.log("🔥base loaded", { initializeApp, firestore_module, app, db, feedback_db, add_feedback });

            // @ts-ignore
            return add_feedback
        });
    }
    return await firebase_load_promise
};

const init_feedback = async () => {
    try {
        // Only load firebase when the feedback form is touched
        const feedbackform = document.querySelector("form#feedback");
        if (feedbackform == null) return
        feedbackform.addEventListener("submit", (e) => {
            const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)");

            e.preventDefault();

            async(async () => {
                try {
                    const feedback = String(new FormData(e.target).get("opinion"));
                    if (feedback.length < 4) return

                    let add_feedback = await init_firebase();
                    await timeout_promise(
                        add_feedback({
                            feedback,
                            timestamp: Date.now(),
                            email: email ? email : "",
                        }),
                        5000
                    );
                    let message = "Submitted. Thank you for your feedback! 💕";
                    console.log(message);
                    alert(message);
                    // @ts-ignore
                    feedbackform.querySelector("#opinion").value = "";
                } catch (error) {
                    let message =
                        "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n";
                    console.error(message);
                    console.error(error);
                    alert(message + error);
                }
            });
        });

        feedbackform.addEventListener("focusin", () => {
            // Start loading firebase when someone interacts with the form
            init_firebase();
        });
    } catch (error) {
        console.error("Something went wrong loading the feedback form:", error);
        // @ts-ignore
        document.querySelector("form#feedback").style.opacity = 0;
        for (let char of "Oh noooooooooooooooooo...") {
            // @ts-ignore
            document.querySelector("form#feedback input").value += char;
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
};

/**
 * Serialize an array of cells into a string form (similar to the .jl file).
 *
 * Used for implementing clipboard functionality. This isn't in topological
 * order, so you won't necessarily be able to run it directly.
 *
 * @param {Array<import("../components/Editor.js").CellInputData>} cells
 * @return {String}
 */
function serialize_cells(cells) {
    return cells.map((cell) => `# ╔═╡ ${cell.cell_id}\n` + cell.code + "\n").join("\n")
}

/**
 * Deserialize a Julia program or output from `serialize_cells`.
 *
 * If a Julia program, it will return a single String containing it. Otherwise,
 * it will split the string into cells based on the special delimiter.
 *
 * @param {String} serialized_cells
 * @return {Array<String>}
 */
function deserialize_cells(serialized_cells) {
    const segments = serialized_cells.replace(/\r\n/g, "\n").split(/# ╔═╡ \S+\n/);
    return segments.map((s) => s.trim()).filter((s) => s !== "")
}

const JULIA_REPL_PROMPT = "julia> ";

/**
 * Deserialize a Julia REPL session.
 *
 * It will split the string into cells based on the Julia prompt. Multiple
 * lines are detected based on indentation.
 *
 * @param {String} repl_session
 * @return {Array<String>}
 */
function deserialize_repl(repl_session) {
    const segments = repl_session.replace(/\r\n/g, "\n").split(JULIA_REPL_PROMPT);
    const indent = " ".repeat(prompt.length);
    return segments
        .map(function (s) {
            return (indent + s)
                .split("\n")
                .filter((line) => line.startsWith(indent))
                .map((s) => s.replace(indent, ""))
                .join("\n")
        })
        .map((s) => s.trim())
        .filter((s) => s !== "")
}

const detect_deserializer = (/** @type {string} */ topaste) =>
    topaste.trim().startsWith(JULIA_REPL_PROMPT)
        ? deserialize_repl
        : topaste.match(/# ╔═╡ ........-....-....-....-............/g)?.length
        ? deserialize_cells
        : null;

const te = new TextEncoder();
const td = new TextDecoder();

const utf8index_to_ut16index = (str, index_utf8) => td.decode(te.encode(str).slice(0, index_utf8)).length;

const splice_utf8 = (original, startindex_utf8, endindex_utf8, replacement) => {
    // JS uses UTF-16 for internal representation of strings, e.g.
    // "e".length == 1, "é".length == 1, "🐶".length == 2

    // Julia uses UTF-8, e.g.
    // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
    //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

    // Completion results from julia will give the 'splice indices': "where should the completed keyword be inserted?"
    // we need to splice into javascript string, so we convert to a UTF-8 byte array, then splice, then back to the string.

    const original_enc = te.encode(original);
    const replacement_enc = te.encode(replacement);

    const result_enc = new Uint8Array(original_enc.length + replacement_enc.length - (endindex_utf8 - startindex_utf8));

    result_enc.set(original_enc.slice(0, startindex_utf8), 0);
    result_enc.set(replacement_enc, startindex_utf8);
    result_enc.set(original_enc.slice(endindex_utf8), startindex_utf8 + replacement_enc.length);

    return td.decode(result_enc)
};

const slice_utf8 = (original, startindex_utf8, endindex_utf8) => {
    // JS uses UTF-16 for internal representation of strings, e.g.
    // "e".length == 1, "é".length == 1, "🐶".length == 2

    // Julia uses UTF-8, e.g.
    // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
    //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

    const original_enc = te.encode(original);
    return td.decode(original_enc.slice(startindex_utf8, endindex_utf8))
};

console.assert(splice_utf8("e é 🐶 is a dog", 5, 9, "hannes ❤") === "e é hannes ❤ is a dog");
console.assert(slice_utf8("e é 🐶 is a dog", 5, 9) === "🐶");

// get this by running commit fd78c36f from https://github.com/fonsp/Pluto.jl/pull/3271
// and manually add greek characters, see https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
const sub_charmap = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "x": "ₓ",
    "k": "ₖ",
    "j": "ⱼ",
    "v": "ᵥ",
    "o": "ₒ",
    "-": "₋",
    "s": "ₛ",
    "n": "ₙ",
    "=": "₌",
    "p": "ₚ",
    "i": "ᵢ",
    "u": "ᵤ",
    "r": "ᵣ",
    "a": "ₐ",
    "t": "ₜ",
    ")": "₎",
    "+": "₊",
    "h": "ₕ",
    "l": "ₗ",
    "e": "ₑ",
    "(": "₍",
    "m": "ₘ",
    // manually added greek characters
    "β": "ᵦ",
    "γ": "ᵧ",
    "ι": "ͺ",
    "ρ": "ᵨ",
    "φ": "ᵩ",
    "χ": "ᵪ",
};

// get this by running commit fd78c36f from https://github.com/fonsp/Pluto.jl/pull/3271
// and manually add greek characters, see https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
const sup_charmap = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "l": "ˡ",
    "J": "ᴶ",
    "D": "ᴰ",
    ")": "⁾",
    "W": "ᵂ",
    "m": "ᵐ",
    "I": "ᴵ",
    "o": "ᵒ",
    "h": "ʰ",
    "e": "ᵉ",
    "G": "ᴳ",
    "x": "ˣ",
    "V": "ⱽ",
    "b": "ᵇ",
    "f": "ᶠ",
    "g": "ᵍ",
    "T": "ᵀ",
    "R": "ᴿ",
    "p": "ᵖ",
    "(": "⁽",
    "M": "ᴹ",
    "r": "ʳ",
    "B": "ᴮ",
    "k": "ᵏ",
    "P": "ᴾ",
    "=": "⁼",
    "H": "ᴴ",
    "L": "ᴸ",
    "w": "ʷ",
    "+": "⁺",
    "i": "ⁱ",
    "N": "ᴺ",
    "t": "ᵗ",
    "n": "ⁿ",
    "z": "ᶻ",
    "U": "ᵁ",
    "E": "ᴱ",
    "d": "ᵈ",
    "u": "ᵘ",
    "j": "ʲ",
    "a": "ᵃ",
    "v": "ᵛ",
    "A": "ᴬ",
    "y": "ʸ",
    "c": "ᶜ",
    "K": "ᴷ",
    "s": "ˢ",
    "O": "ᴼ",
    "-": "⁻",
    "!": "ꜝ",
    // manually added greek characters
    "α": "ᵅ",
    "β": "ᵝ",
    "γ": "ᵞ",
    "δ": "ᵟ",
    "ε": "ᵋ",
    "θ": "ᶿ",
};

// @ts-ignore
let is_mac_keyboard = /Mac/i.test(navigator.userAgentData?.platform ?? navigator.platform);

let control_name = is_mac_keyboard ? "⌃" : "Ctrl";
let ctrl_or_cmd_name = is_mac_keyboard ? "⌘" : "Ctrl";
let alt_or_options_name = is_mac_keyboard ? "⌥" : "Alt";
let and = is_mac_keyboard ? " " : "+";

let has_ctrl_or_cmd_pressed = (event) => event.ctrlKey || (is_mac_keyboard && event.metaKey);

let in_textarea_or_input = () => {
    const in_footer = document.activeElement?.closest("footer") != null;
    const in_header = document.activeElement?.closest("header") != null;
    const in_cm = document.activeElement?.closest(".cm-editor") != null;

    const { tagName } = document.activeElement ?? {};
    return tagName === "INPUT" || tagName === "TEXTAREA" || in_footer || in_header || in_cm
};

// should strip characters similar to how github converts filenames into the #file-... URL hash.
// test on: https://gist.github.com/fonsp/f7d230da4f067a11ad18de15bff80470
const gist_normalizer = (str) =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z1-9]/g, "");

const guess_notebook_location = async (path_or_url) => {
    try {
        const u = new URL(path_or_url);
        if (!["http:", "https:", "ftp:", "ftps:"].includes(u.protocol)) {
            throw "Not a web URL"
        }
        if (u.host === "gist.github.com") {
            console.log("Gist URL detected");
            const parts = u.pathname.substring(1).split("/");
            const gist_id = parts[1];
            const gist = await (
                await fetch(`https://api.github.com/gists/${gist_id}`, {
                    headers: { Accept: "application/vnd.github.v3+json" },
                }).then((r) => (r.ok ? r : Promise.reject(r)))
            ).json();
            console.log(gist);
            const files = Object.values(gist.files);

            const selected = files.find((f) => gist_normalizer("#file-" + f.filename) === gist_normalizer(u.hash));
            if (selected != null) {
                return {
                    type: "url",
                    path_or_url: selected.raw_url,
                }
            }

            return {
                type: "url",
                path_or_url: files[0].raw_url,
            }
        } else if (u.host === "github.com") {
            u.searchParams.set("raw", "true");
        }
        return {
            type: "url",
            path_or_url: u.href,
        }
    } catch (ex) {
        /* Remove eventual single/double quotes from the path if they surround it, see
          https://github.com/fonsp/Pluto.jl/issues/1639 */
        if (path_or_url[path_or_url.length - 1] === '"' && path_or_url[0] === '"') {
            path_or_url = path_or_url.slice(1, -1); /* Remove first and last character */
        }
        return {
            type: "path",
            path_or_url: path_or_url,
        }
    }
};

const open_pluto_popup = (/** @type{import("../components/Popup").PkgPopupDetails | import("../components/Popup").MiscPopupDetails} */ detail) => {
    window.dispatchEvent(
        new CustomEvent("open pluto popup", {
            detail,
        })
    );
};

/** @type {any} */
const TabHelpEffect = index_es_min_js.StateEffect.define();
const TabHelp = index_es_min_js.StateField.define({
    create() {
        return false
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(TabHelpEffect)) return effect.value
        }
        return value
    },
});

/** @type {any} */
const LastFocusWasForcedEffect = index_es_min_js.StateEffect.define();
const LastFocusWasForced = index_es_min_js.StateField.define({
    create() {
        return false
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(LastFocusWasForcedEffect)) return effect.value
        }
        return value
    },
});

const tab_help_plugin = index_es_min_js.ViewPlugin.define(
    (view) => ({
        setready: (x) =>
            requestIdleCallback(() => {
                view.dispatch({
                    effects: [TabHelpEffect.of(x)],
                });
            }),
    }),
    {
        provide: (p) => [TabHelp, LastFocusWasForced],
        eventObservers: {
            focus: function (event, view) {
                // The next key should trigger the popup
                this.setready(true);
            },
            blur: function (event, view) {
                this.setready(false);
                requestIdleCallback(() => {
                    view.dispatch({
                        effects: [LastFocusWasForcedEffect.of(false)],
                    });
                });
            },
            click: function (event, view) {
                // This means you are not doing keyboard navigation :)
                this.setready(false);
            },
            keydown: function (event, view) {
                if (event.key == "Tab") {
                    if (view.state.field(TabHelp) && !view.state.field(LastFocusWasForced) && !view.state.readOnly) {
                        open_pluto_popup({
                            type: "info",
                            source_element: view.dom,
                            body: html`Press <kbd>Esc</kbd> and then <kbd>Tab</kbd> to continue navigation. <em style="font-size: .6em;">skkrt!</em>`,
                        });
                        this.setready(false);
                    }
                } else {
                    this.setready(false);
                }
            },
        },
    }
);

let { autocompletion: autocompletion$1, completionKeymap: completionKeymap$1 } = index_es_min_js.autocomplete;

let start_autocomplete_command = completionKeymap$1.find((keybinding) => keybinding.key === "Ctrl-Space");
let accept_autocomplete_command = completionKeymap$1.find((keybinding) => keybinding.key === "Enter");
completionKeymap$1.find((keybinding) => keybinding.key === "Escape");

const assert_not_null = (x) => {
    if (x == null) {
        throw new Error("Unexpected null value")
    } else {
        return x
    }
};

const set_cm_value = (/** @type{EditorView} */ cm, /** @type {string} */ value, scroll = true) => {
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
        selection: index_es_min_js.EditorSelection.cursor(value.length),
        // a long path like /Users/fons/Documents/article-test-1/asdfasdfasdfsadf.jl does not fit in the little box, so we scroll it to the left so that you can see the filename easily.
        scrollIntoView: scroll,
    });
};

const is_desktop = !!window.plutoDesktop;

if (is_desktop) {
    console.log("Running in Desktop Environment! Found following properties/methods:", window.plutoDesktop);
}

/**
 * @param {{
 *  value: String,
 *  suggest_new_file: {base: String},
 *  button_label: String,
 *  placeholder: String,
 *  on_submit: (new_path: String) => Promise<void>,
 *  on_desktop_submit?: (loc?: string) => Promise<void>,
 *  client: import("../common/PlutoConnection.js").PlutoConnection,
 *  clear_on_blur: Boolean,
 * }} props
 */
const FilePicker = ({ value, suggest_new_file, button_label, placeholder, on_submit, on_desktop_submit, client, clear_on_blur }) => {
    const [is_button_disabled, set_is_button_disabled] = hooks_pin_v113_target_es2020.useState(true);
    const [url_value, set_url_value] = hooks_pin_v113_target_es2020.useState("");
    const forced_value = hooks_pin_v113_target_es2020.useRef("");
    /** @type {import("../imports/Preact.js").Ref<HTMLElement>} */
    const base = hooks_pin_v113_target_es2020.useRef(/** @type {any} */ (null));
    const cm = hooks_pin_v113_target_es2020.useRef(/** @type {EditorView?} */ (null));

    const suggest_not_tmp = () => {
        const current_cm = cm.current;
        if (current_cm == null) return
        if (suggest_new_file != null && current_cm.state.doc.length === 0) {
            // current_cm.focus()
            set_cm_value(current_cm, suggest_new_file.base, false);
            request_path_completions();
        }
        window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}));
    };

    let run = async (fn) => await fn();

    const onSubmit = () => {
        const current_cm = cm.current;
        if (current_cm == null) return
        if (!is_desktop) {
            const my_val = current_cm.state.doc.toString();
            if (my_val === forced_value.current) {
                suggest_not_tmp();
                return true
            }
        }
        run(async () => {
            try {
                if (is_desktop && on_desktop_submit) {
                    await on_desktop_submit((await guess_notebook_location(url_value)).path_or_url);
                } else {
                    await on_submit(current_cm.state.doc.toString());
                }
                current_cm.dom.blur();
            } catch (error) {
                set_cm_value(current_cm, forced_value.current, true);
                current_cm.dom.blur();
            }
        });
        return true
    };

    const onBlur = (e) => {
        const still_in_focus = base.current?.matches(":focus-within") || base.current?.contains(e.relatedTarget);
        if (still_in_focus) return
        const current_cm = cm.current;
        if (current_cm == null) return
        if (clear_on_blur)
            requestAnimationFrame(() => {
                if (!current_cm.hasFocus) {
                    set_cm_value(current_cm, forced_value.current, true);
                }
            });
    };

    const request_path_completions = () => {
        const current_cm = cm.current;
        if (current_cm == null) return
        let selection = current_cm.state.selection.main;
        if (selection.from !== selection.to) return
        if (current_cm.state.doc.length !== selection.to) return
        return assert_not_null(start_autocomplete_command).run(current_cm)
    };

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const keyMapSubmit = () => {
            onSubmit();
            return true
        };
        cm.current = new index_es_min_js.EditorView({
            state: index_es_min_js.EditorState.create({
                doc: "",
                extensions: [
                    index_es_min_js.drawSelection(),
                    index_es_min_js.EditorView.domEventHandlers({
                        focus: (event, cm) => {
                            setTimeout(() => {
                                if (suggest_new_file) {
                                    suggest_not_tmp();
                                } else {
                                    request_path_completions();
                                }
                            }, 0);
                            return true
                        },
                    }),
                    index_es_min_js.EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            set_is_button_disabled(update.state.doc.length === 0);
                        }
                    }),
                    index_es_min_js.EditorView.theme(
                        {
                            "&": {
                                fontSize: "inherit",
                            },
                            ".cm-scroller": {
                                fontFamily: "inherit",
                                overflowY: "hidden",
                                overflowX: "auto",
                            },
                        },
                        { dark: usesDarkTheme }
                    ),
                    // EditorView.updateListener.of(onCM6Update),
                    index_es_min_js.history(),
                    autocompletion$1({
                        activateOnTyping: true,
                        override: [
                            pathhints({
                                suggest_new_file: suggest_new_file,
                                client: client,
                            }),
                        ],
                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => c.type ?? "",
                    }),
                    // When a completion is picked, immediately start autocompleting again
                    index_es_min_js.EditorView.updateListener.of((update) => {
                        update.transactions.forEach((transaction) => {
                            const completion = transaction.annotation(index_es_min_js.autocomplete.pickedCompletion);
                            if (completion != null) {
                                update.view.dispatch({
                                    effects: index_es_min_js.EditorView.scrollIntoView(update.state.doc.length),
                                    selection: index_es_min_js.EditorSelection.cursor(update.state.doc.length),
                                });

                                request_path_completions();
                            }
                        });
                    }),
                    index_es_min_js.keymap.of([
                        {
                            key: "Enter",
                            run: (cm) => {
                                // If there is autocomplete open, accept that. It will return `true`
                                return assert_not_null(accept_autocomplete_command).run(cm)
                            },
                        },
                        {
                            key: "Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Enter",
                            mac: "Cmd-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Shift-Enter",
                            mac: "Cmd-Shift-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Tab",
                            run: (cm) => {
                                // If there is autocomplete open, accept that
                                if (assert_not_null(accept_autocomplete_command).run(cm)) {
                                    // and request the next ones
                                    request_path_completions();
                                    return true
                                }
                                // Else, activate it (possibly)
                                return request_path_completions()
                            },
                        },
                    ]),
                    index_es_min_js.keymap.of(completionKeymap$1),

                    index_es_min_js.placeholder(placeholder),
                    tab_help_plugin,
                ],
            }),
        });
        const current_cm = cm.current;

        if (!is_desktop) base.current.insertBefore(current_cm.dom, base.current.firstElementChild);
        // window.addEventListener("resize", () => {
        //     if (!cm.current.hasFocus()) {
        //         deselect(cm.current)
        //     }
        // })
    }, []);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (forced_value.current != value) {
            if (cm.current == null) return
            set_cm_value(cm.current, value, true);
            forced_value.current = value;
        }
    });

    return is_desktop
        ? html`<div class="desktop_picker_group" ref=${base}>
              <input
                  value=${url_value}
                  placeholder="Enter notebook URL..."
                  onChange=${(v) => {
                      set_url_value(v.target.value);
                  }}
              />
              <div onClick=${onSubmit} class="desktop_picker">
                  <button>${button_label}</button>
              </div>
          </div>`
        : html`
              <pluto-filepicker ref=${base} onfocusout=${onBlur}>
                  <button onClick=${onSubmit} disabled=${is_button_disabled}>${button_label}</button>
              </pluto-filepicker>
          `
};

const dirname = (/** @type {string} */ str) => {
    // using regex /\/|\\/
    const idx = [...str.matchAll(/[\/\\]/g)].map((r) => r.index);
    return idx.length > 0 ? str.slice(0, _.last(idx) + 1) : str
};

const basename = (/** @type {string} */ str) => (str.split("/").pop() ?? "").split("\\").pop() ?? "";

const pathhints =
    ({ client, suggest_new_file }) =>
    /** @type {autocomplete.CompletionSource} */
    (ctx) => {
        const query_full = /** @type {String} */ (ctx.state.sliceDoc(0, ctx.pos));
        const query = dirname(query_full);

        return client
            .send("completepath", {
                query,
            })
            .then((update) => {
                const queryFileName = basename(query_full);

                const results = update.message.results;
                const from = utf8index_to_ut16index(query, update.message.start);

                // if the typed text matches one of the paths exactly, stop autocomplete immediately.
                if (results.includes(queryFileName)) {
                    return null
                }

                let styledResults = results.map((r) => {
                    let dir = r.endsWith("/") || r.endsWith("\\");
                    return {
                        label: r,
                        type: dir ? "dir" : "file",
                        boost: dir ? 1 : 0,
                    }
                });

                if (suggest_new_file != null) {
                    for (let initLength = 3; initLength >= 0; initLength--) {
                        const init = ".jl".substring(0, initLength);
                        if (queryFileName.endsWith(init)) {
                            let suggestedFileName = queryFileName + ".jl".substring(initLength);

                            if (suggestedFileName == ".jl") {
                                suggestedFileName = "notebook.jl";
                            }

                            if (initLength == 3) {
                                return null
                            }
                            if (!results.includes(suggestedFileName)) {
                                styledResults.push({
                                    label: suggestedFileName + " (new)",
                                    apply: suggestedFileName,
                                    type: "file new",
                                    boost: -99,
                                });
                            }
                            break
                        }
                    }
                }

                const validFor = (/** @type {string} */ text) => {
                    return (
                        /[\p{L}\p{Nl}\p{Sc}\d_!-\.]*$/u.test(text) &&
                        // if the typed text matches one of the paths exactly, stop autocomplete immediately.
                        !results.includes(basename(text))
                    )
                };

                return {
                    options: styledResults,
                    from: from,
                    validFor,
                }
            })
    };

// EXAMPLE:

/*
cl({a: true, b: false, c: true})
 ==
"a c "
*/

const cl = (classTable) => {
    if(!classTable){
        return null
    }
    return Object.entries(classTable).reduce((allClasses, [nextClass, enable]) => (enable ? nextClass + " " + allClasses : allClasses), "")
};

let PlutoActionsContext = preact_10_13_2_pin_v113_target_es2020.createContext();
// export let PlutoActionsContext = createContext(/** @type {Record<string,Function?>?} */ (null))
let PlutoBondsContext = preact_10_13_2_pin_v113_target_es2020.createContext(/** @type {import("../components/Editor.js").BondValuesDict?} */ (null));
let PlutoJSInitializingContext = preact_10_13_2_pin_v113_target_es2020.createContext(/** @type {SetWithEmptyCallback<HTMLElement>?} */ (null));

// Hey copilot, create a class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
/**
 * A class like the built-in `Set` class, but with a callback that is fired when the set becomes empty.
 * @template T
 * @extends {Set<T>}
 */
class SetWithEmptyCallback extends Set {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
        super();
        this.callback = callback;
    }

    /**
     * @param {T} value
     */
    delete(value) {
        let result = super.delete(value);
        if (result && this.size === 0) {
            this.callback();
        }
        return result
    }
}
// THANKS COPILOT ❤️

const await_focus = () =>
    document.visibilityState === "visible"
        ? Promise.resolve()
        : new Promise((res) => {
              const h = () => {
                  await_focus().then(res);
                  document.removeEventListener("visibilitychange", h);
              };
              document.addEventListener("visibilitychange", h);
          });

const Preamble = ({ any_code_differs, last_update_time, last_hot_reload_time, connected }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    const [state, set_state] = hooks_pin_v113_target_es2020.useState("");
    const [reload_state, set_reload_state] = hooks_pin_v113_target_es2020.useState("");
    const timeout_ref = hooks_pin_v113_target_es2020.useRef(null);
    const reload_timeout_ref = hooks_pin_v113_target_es2020.useRef(null);

    hooks_pin_v113_target_es2020.useEffect(() => {
        // console.log("code differs", any_code_differs)
        clearTimeout(timeout_ref?.current);
        if (any_code_differs) {
            set_state("ask_to_save");
        } else {
            if (Date.now() - last_update_time < 1000) {
                set_state("saved");
                timeout_ref.current = setTimeout(() => {
                    set_state("");
                }, 1000);
            } else {
                set_state("");
            }
        }
        return () => clearTimeout(timeout_ref?.current)
    }, [any_code_differs]);

    // silly bits to not show "Reloaded from file" immediately
    const [old_enough, set_old_enough] = hooks_pin_v113_target_es2020.useState(false);
    hooks_pin_v113_target_es2020.useEffect(() => {
        if (connected) {
            setTimeout(() => set_old_enough(true), 1000);
        }
    }, [connected]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        console.log("Hottt", last_hot_reload_time, old_enough);
        if (old_enough) {
            set_reload_state("reloaded_from_file");
            console.log("set state");

            await_focus().then(() => {
                reload_timeout_ref.current = setTimeout(() => {
                    set_reload_state("");
                    console.log("reset state");
                }, 8000);
            });
            return () => clearTimeout(reload_timeout_ref?.current)
        }
    }, [last_hot_reload_time]);

    return html`<preamble>
        ${state === "ask_to_save"
            ? html`
                  <div id="saveall-container" class="overlay-button ${state}">
                      <button
                          onClick=${() => {
                              set_state("saving");
                              pluto_actions.set_and_run_all_changed_remote_cells();
                          }}
                          class=${cl({ runallchanged: true })}
                          title="Save and run all changed cells"
                      >
                          <span class="only-on-hover"><b>Save all changes</b> </span>${is_mac_keyboard
                              ? html`<kbd>⌘ S</kbd>`
                              : html`<kbd>Ctrl</kbd>+<kbd>S</kbd>`}
                      </button>
                  </div>
              `
            : // : state === "saving"
            // ? html` <div id="saveall-container" class="overlay-button ${state}">Saving... <span class="saving-icon"></span></div> `
            state === "saved" || state === "saving"
            ? html`
                  <div id="saveall-container" class="overlay-button ${state}">
                      <span><span class="only-on-hover">Saved </span><span class="saved-icon pluto-icon"></span></span>
                  </div>
              `
            : reload_state === "reloaded_from_file"
            ? html`
                  <div id="saveall-container" class="overlay-button ${state}">
                      <span>File change detected, <b>notebook updated </b><span class="saved-icon pluto-icon"></span></span>
                  </div>
              `
            : null}
    </preamble>`
};

// @ts-ignore
// needs .default a second time, weird
const AnsiUp = AnsiUpPackage.default;

const ansi_to_html = (ansi, { use_classes = true } = {}) => {
    const ansi_up = new AnsiUp();
    ansi_up.use_classes = use_classes;
    return ansi_up.ansi_to_html(ansi)
};

const make_spinner_spin = (original_html) => original_html.replaceAll("◐", `<span class="make-me-spin">◐</span>`);

const TerminalViewAnsiUp = ({ value }) => {
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    const start_time = hooks_pin_v113_target_es2020.useRef(Date.now());

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!node_ref.current) return
        node_ref.current.style.cssText = `--animation-delay: -${(Date.now() - start_time.current) % 1000}ms`;
        node_ref.current.innerHTML = make_spinner_spin(ansi_to_html(value));
        const parent = node_ref.current.parentElement;
        if (parent) parent.scrollTop = 1e5;
    }, [node_ref.current, value]);

    return !!value
        ? html`<pkg-terminal
              ><div class="scroller" tabindex="0"><pre ref=${node_ref} class="pkg-terminal"></pre></div
          ></pkg-terminal>`
        : null
};

const PkgTerminalView = TerminalViewAnsiUp;

/**
 * @param {{
 * focus_on_open: boolean,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string) => void,
 * notebook: import("./Editor.js").NotebookData,
 * sanitize_html?: boolean,
 * }} props
 */
let LiveDocsTab = ({ focus_on_open, desired_doc_query, on_update_doc_query, notebook, sanitize_html = true }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    let live_doc_search_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLInputElement?} */ (null));

    // This is all in a single state object so that we can update multiple field simultaneously
    let [state, set_state] = hooks_pin_v113_target_es2020.useState({
        shown_query: null,
        searched_query: null,
        body: `<p>Welcome to the <b>Live docs</b>! Keep this little window open while you work on the notebook, and you will get documentation of everything you type!</p><p>You can also type a query above.</p><hr><p><em>Still stuck? Here are <a target="_blank" href="https://julialang.org/about/help/">some tips</a>.</em></p>`,
        loading: false,
    });
    let update_state = (mutation) => set_state(immer((state) => mutation(state)));

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (state.loading) {
            return
        }
        if (desired_doc_query != null && !/[^\s]/.test(desired_doc_query)) {
            // only whitespace
            return
        }

        if (state.searched_query !== desired_doc_query) {
            fetch_docs(desired_doc_query);
        }
    }, [desired_doc_query, state.loading, state.searched_query]);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (focus_on_open && live_doc_search_ref.current) {
            live_doc_search_ref.current.focus({ preventScroll: true });
            live_doc_search_ref.current.select();
        }
    }, [focus_on_open]);

    let fetch_docs = (new_query) => {
        update_state((state) => {
            state.loading = true;
            state.searched_query = new_query;
        });
        Promise.race([
            observablehq_for_myself.Promises.delay(2000, false),
            pluto_actions.send("docs", { query: new_query.replace(/^\?/, "") }, { notebook_id: notebook.notebook_id }).then((u) => {
                if (u.message.status === "⌛") {
                    return false
                }
                if (u.message.status === "👍") {
                    update_state((state) => {
                        state.shown_query = new_query;
                        state.body = u.message.doc;
                    });
                    return true
                }
            }),
        ]).then(() => {
            update_state((state) => {
                state.loading = false;
            });
        });
    };

    let docs_element = hooks_pin_v113_target_es2020.useMemo(
        () => html`<${RawHTMLContainer} body=${without_workspace_stuff(state.body)} sanitize_html=${sanitize_html} sanitize_html_message=${false} />`,
        [state.body, sanitize_html]
    );
    let no_docs_found = state.loading === false && state.searched_query !== "" && state.searched_query !== state.shown_query;

    return html`
        <div
            class=${cl({
                "live-docs-searchbox": true,
                "loading": state.loading,
                "notfound": no_docs_found,
            })}
            translate=${false}
        >
            <input
                title=${no_docs_found ? `"${state.searched_query}" not found` : ""}
                id="live-docs-search"
                placeholder="Search docs..."
                ref=${live_doc_search_ref}
                onInput=${(e) => on_update_doc_query(e.target.value)}
                value=${desired_doc_query}
                type="search"
            ></input>
            
        </div>
        <section ref=${(ref) => ref != null && post_process_doc_node(ref, on_update_doc_query)}>
            <h1><code>${state.shown_query}</code></h1>
            ${docs_element}
        </section>
    `
};

const post_process_doc_node = (node, on_update_doc_query) => {
    // Apply syntax highlighting to code blocks:

    // In the standard HTML container we already do this for code.language-julia blocks,
    // but in the docs it's safe to extend to to all highlighting I think
    // Actually, showing the jldoctest stuff wasn't as pretty... should make a mode for that sometimes
    // for (let code_element of container_ref.current.querySelectorAll("code.language-jldoctest")) {
    //     highlight(code_element, "julia")
    // }
    for (let code_element of node.querySelectorAll("code:not([class])")) {
        highlight(code_element, "julia");
    }

    // Resolve @doc reference links:
    for (let anchor of node.querySelectorAll("a")) {
        const href = anchor.getAttribute("href");
        if (href != null && href.startsWith("@ref")) {
            const query = href.length > 4 ? href.substr(5) : anchor.textContent;
            anchor.onclick = (e) => {
                on_update_doc_query(query);
                e.preventDefault();
            };
        }
    }
};

const without_workspace_stuff = (str) =>
    str
        .replace(/Main\.var&quot;workspace\#\d+&quot;\./g, "") // remove workspace modules from variable names
        .replace(/Main\.workspace\#\d+\./g, "") // remove workspace modules from variable names
        .replace(/ in Main\.var&quot;workspace\#\d+&quot;/g, "") // remove workspace modules from method lists
        .replace(/ in Main\.workspace\#\d+/g, "") // remove workspace modules from method lists
        .replace(/#&#61;&#61;#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\:\d+/g, ""); // remove UUIDs from filenames

const RunArea = ({
    runtime,
    running,
    queued,
    code_differs,
    on_run,
    on_interrupt,
    set_cell_disabled,
    depends_on_disabled_cells,
    running_disabled,
    on_jump,
}) => {
    const on_save = on_run; /* because disabled cells save without running */

    const local_time_running_ms = useMillisSinceTruthy(running);
    const local_time_running_ns = local_time_running_ms == null ? null : 1e6 * local_time_running_ms;
    hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    const action = running || queued ? "interrupt" : running_disabled ? "save" : depends_on_disabled_cells && !code_differs ? "jump" : "run";

    const fmap = {
        on_interrupt,
        on_save,
        on_jump,
        on_run,
    };

    const titlemap = {
        interrupt: "Interrupt (Ctrl + Q)",
        save: "Save code without running",
        jump: "This cell depends on a disabled cell",
        run: "Run cell (Shift + Enter)",
    };

    const on_double_click = (/** @type {MouseEvent} */ e) => {
        console.log(running_disabled);
        if (running_disabled)
            open_pluto_popup({
                type: "info",
                source_element: /** @type {HTMLElement?} */ (e.target),
                body: html`${`This cell is disabled. `}
                    <a
                        href="#"
                        onClick=${(e) => {
                            //@ts-ignore
                            set_cell_disabled(false);

                            e.preventDefault();
                            window.dispatchEvent(new CustomEvent("close pluto popup"));
                        }}
                        >Enable this cell</a
                    >
                    ${` to run the code.`}`,
            });
    };

    return html`
        <pluto-runarea class=${action}>
            <button onDblClick=${on_double_click} onClick=${fmap[`on_${action}`]} class="runcell" title=${titlemap[action]}>
                <span></span>
            </button>
            <span class="runtime">${prettytime(running ? local_time_running_ns ?? runtime : runtime)}</span>
        </pluto-runarea>
    `
};

const prettytime = (time_ns) => {
    if (time_ns == null) {
        return "---"
    }
    let result = time_ns;
    const prefices = ["n", "μ", "m", ""];
    let i = 0;
    while (i < prefices.length - 1 && result >= 1000.0) {
        i += 1;
        result /= 1000;
    }
    const roundedtime = result.toFixed(time_ns < 100 || result >= 100.0 ? 0 : 1);

    return roundedtime + "\xa0" + prefices[i] + "s"
};

const update_interval = 50;
/**
 * Returns the milliseconds passed since the argument became truthy.
 * If argument is falsy, returns undefined.
 *
 * @param {boolean} truthy
 */
const useMillisSinceTruthy = (truthy) => {
    const [now, setNow] = hooks_pin_v113_target_es2020.useState(0);
    const [startRunning, setStartRunning] = hooks_pin_v113_target_es2020.useState(0);
    hooks_pin_v113_target_es2020.useEffect(() => {
        let interval;
        if (truthy) {
            const now = +new Date();
            setStartRunning(now);
            setNow(now);
            interval = setInterval(() => setNow(+new Date()), update_interval);
        }
        return () => {
            interval && clearInterval(interval);
        }
    }, [truthy]);
    return truthy ? now - startRunning : undefined
};

const useDebouncedTruth = (truthy, delay = 5) => {
    const [mytruth, setMyTruth] = hooks_pin_v113_target_es2020.useState(truthy);
    const setMyTruthAfterNSeconds = hooks_pin_v113_target_es2020.useMemo(() => _.debounce(setMyTruth, delay * 1000), [setMyTruth]);
    hooks_pin_v113_target_es2020.useEffect(() => {
        if (truthy) {
            setMyTruth(true);
            setMyTruthAfterNSeconds.cancel();
        } else {
            setMyTruthAfterNSeconds(false);
        }
        return () => {}
    }, [truthy]);
    return mytruth
};

const DiscreteProgressBar = ({ onClick, total, done, busy, failed_indices }) => {
    total = Math.max(1, total);

    return html`
        <div
            class=${cl({
                "discrete-progress-bar": true,
                "small": total < 8,
                "mid": total >= 8 && total < 48,
                "big": total >= 48,
            })}
            data-total=${total}
            onClick=${onClick}
        >
            ${[...Array(total)].map((_, i) => {
                return html`<div
                    class=${cl({
                        done: i < done,
                        failed: failed_indices.includes(i),
                        busy: i >= done && i < done + busy,
                    })}
                ></div>`
            })}
        </div>
    `
};

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * }} props
 */
let NotifyWhenDone = ({ status }) => {
    const all_done = Object.values(status.subtasks).every(is_finished);

    const [enabled, setEnabled] = hooks_pin_v113_target_es2020.useState(false);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (enabled && all_done) {
            console.log("all done");

            /** @type {Notification?} */
            let notification = null;

            let timeouthandler = setTimeout(() => {
                setEnabled(false);
                let count = total_done(status);
                notification = new Notification("Pluto: notebook ready", {
                    tag: "notebook ready",
                    body: `✓ All ${count} steps completed`,
                    lang: "en-US",
                    dir: "ltr",
                    icon: url_logo_small,
                });
                notification.onclick = (e) => {
                    parent.focus();
                    window.focus();
                    notification?.close();
                };
            }, 3000);

            const vishandler = () => {
                if (document.visibilityState === "visible") {
                    notification?.close();
                }
            };
            document.addEventListener("visibilitychange", vishandler);
            document.body.addEventListener("click", vishandler);

            return () => {
                notification?.close();

                clearTimeout(timeouthandler);
                document.removeEventListener("visibilitychange", vishandler);
                document.body.removeEventListener("click", vishandler);
            }
        }
    }, [all_done]);

    const visible = useDelayedTruth(!all_done, 2500) || enabled;

    return html`
        <div class=${cl({ visible, "notify-when-done": true })} inert=${!visible}>
            <label
                >${"Notify when done"}
                <input
                    type="checkbox"
                    checked=${enabled}
                    disabled=${!visible}
                    onInput=${(e) => {
                        if (e.target.checked) {
                            Notification.requestPermission().then((r) => {
                                console.log(r);
                                const granted = r === "granted";
                                setEnabled(granted);
                                e.target.checked = granted;

                                if (!granted)
                                    open_pluto_popup({
                                        type: "warn",
                                        body: html`
                                            Pluto needs permission to show notifications. <strong>Enable notifications</strong> in your browser settings to use
                                            this feature.
                                        `,
                                    });
                            });
                        } else {
                            setEnabled(false);
                        }
                    }}
            /></label>
        </div>
    `
};

/**
 * @typedef EventListenerAddable
 * @type Document | HTMLElement | Window | EventSource | MediaQueryList | null
 */

const useEventListener = (
    /** @type {EventListenerAddable | import("../imports/Preact.js").Ref<EventListenerAddable>} */ element,
    /** @type {string} */ event_name,
    /** @type {EventListenerOrEventListenerObject} */ handler,
    /** @type {any[] | undefined} */ deps
) => {
    let handler_cached = hooks_pin_v113_target_es2020.useCallback(handler, deps);
    hooks_pin_v113_target_es2020.useEffect(() => {
        const e = element;
        const useme =
            e == null || e instanceof Document || e instanceof HTMLElement || e instanceof Window || e instanceof EventSource || e instanceof MediaQueryList
                ? /** @type {EventListenerAddable} */ (e)
                : e.current;

        if (useme == null) return
        useme.addEventListener(event_name, handler_cached);
        return () => useme.removeEventListener(event_name, handler_cached)
    }, [element, event_name, handler_cached]);
};

/**
 * Utility component that scrolls the page automatically, when the pointer is
 * moved to the upper or lower 30%.
 *
 * Useful for things like selections and drag-and-drop.
 */
const Scroller = ({ active }) => {
    const pointer = hooks_pin_v113_target_es2020.useRef();

    const onmove = (e) => {
        pointer.current = { x: e.clientX, y: e.clientY };
    };
    useEventListener(window, "pointermove", onmove, []);
    useEventListener(window, "dragover", onmove, []);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (active.up || active.down) {
            let prev_time = null;
            let current = true;
            const scroll_update = (timestamp) => {
                if (current) {
                    if (prev_time == null) {
                        prev_time = timestamp;
                    }
                    const dt = timestamp - prev_time;
                    prev_time = timestamp;

                    if (pointer.current) {
                        const y_ratio = pointer.current.y / window.innerHeight;
                        if (active.up && y_ratio < 0.3) {
                            window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000);
                        } else if (active.down && y_ratio > 0.7) {
                            window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000);
                        }
                    }

                    window.requestAnimationFrame(scroll_update);
                }
            };
            window.requestAnimationFrame(scroll_update);
            return () => (current = false)
        }
    }, [active.up, active.down]);

    return null
};

const scroll_cell_into_view = (/** @type {string} */ cell_id) => {
    document.getElementById(cell_id)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
    });
};

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * backend_launch_phase: number?,
 * status: Record<string,any>,
 * }} props
 */
const ProgressBar$1 = ({ notebook, backend_launch_phase, status }) => {
    const [recently_running, set_recently_running] = hooks_pin_v113_target_es2020.useState(/** @type {string[]} */ ([]));
    const [currently_running, set_currently_running] = hooks_pin_v113_target_es2020.useState(/** @type {string[]} */ ([]));

    hooks_pin_v113_target_es2020.useEffect(
        () => {
            const currently = Object.values(notebook.cell_results)
                .filter((c) => c.running || c.queued)
                .map((c) => c.cell_id);

            set_currently_running(currently);

            if (currently.length === 0) {
                // all cells completed
                set_recently_running([]);
            } else {
                // add any new running cells to our pile
                set_recently_running(_.union(currently, recently_running));
            }
        },
        Object.values(notebook.cell_results).map((c) => c.running || c.queued)
    );

    let cell_progress = recently_running.length === 0 ? 0 : 1 - Math.max(0, currently_running.length - 0.3) / recently_running.length;

    let binder_loading = status.loading && status.binder;
    let progress = binder_loading ? backend_launch_phase ?? 0 : cell_progress;

    const anything = (binder_loading || recently_running.length !== 0) && progress !== 1;
    // Double inversion with ! to short-circuit the true, not the false
    const anything_for_a_short_while = !useDelayedTruth(!anything, 500);
    const anything_for_a_long_while = !useDelayedTruth(!anything, 2000);

    if (!(anything || anything_for_a_short_while || anything_for_a_long_while)) {
        return null
    }

    // set to 1 when all cells completed, instead of moving the progress bar to the start
    if (anything_for_a_short_while && !(binder_loading || recently_running.length !== 0)) {
        progress = 1;
    }

    const title = binder_loading
        ? "Loading binder..."
        : `Running cells... (${recently_running.length - currently_running.length}/${recently_running.length} done)`;

    return html`<loading-bar
        class=${binder_loading ? "slow" : "fast"}
        style=${`
            width: ${100 * progress}vw; 
            opacity: ${anything && anything_for_a_short_while ? 1 : 0};
            ${anything || anything_for_a_short_while ? "" : "transition: none;"}
            pointer-events: ${anything ? "auto" : "none"};
            cursor: ${!binder_loading && anything ? "pointer" : "auto"};
        `}
        onClick=${(e) => {
            if (!binder_loading) {
                scroll_to_busy_cell(notebook);
            }
        }}
        aria-hidden="true"
        title=${title}
    ></loading-bar>`
};

const scroll_to_busy_cell = (notebook) => {
    const running_cell_id =
        notebook == null
            ? (document.querySelector("pluto-cell.running") ?? document.querySelector("pluto-cell.queued"))?.id
            : (Object.values(notebook.cell_results).find((c) => c.running) ?? Object.values(notebook.cell_results).find((c) => c.queued))?.cell_id;
    if (running_cell_id) {
        scroll_cell_into_view(running_cell_id);
    }
};

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * notebook: import("./Editor.js").NotebookData,
 * backend_launch_logs: string?,
 * my_clock_is_ahead_by: number,
 * }} props
 */
const StatusTab = ({ status, notebook, backend_launch_logs, my_clock_is_ahead_by }) => {
    return html`
        <section>
            <${StatusItem}
                status_tree=${status}
                path=${[]}
                my_clock_is_ahead_by=${my_clock_is_ahead_by}
                nbpkg=${notebook.nbpkg}
                backend_launch_logs=${backend_launch_logs}
            />
            <${NotifyWhenDone} status=${status} />
        </section>
    `
};

/**
 * Status items are sorted in the same order as they appear in list. Unspecified items are sorted to the end.
 */
const global_order = `
workspace

create_process
init_process


pkg

analysis
waiting_for_others
resolve
remove
add
instantiate
instantiate1
instantiate2
instantiate3
precompile

run


saving

`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

const blocklist = ["saving"];

/** @type {Record<string,string>} */
const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Package management",
    instantiate1: "instantiate",
    instantiate2: "instantiate",
    instantiate3: "instantiate",
    run: "Evaluating cells",
    evaluate: "Running code",
    registry_update: "Updating package registry",
    waiting_for_others: "Waiting for other notebooks to finish package operations",

    backend_launch: "Connecting to backend",
    backend_requesting: "Requesting a worker",
    backend_created: "Starting Pluto server",
    backend_responded: "Opening notebook file",
    backend_notebook_running: "Switching to live editing",
};

const friendly_name = (/** @type {string} */ task_name) => {
    const descr = descriptions[task_name];

    return descr != null ? descr : isnumber(task_name) ? `Step ${task_name}` : task_name
};

const to_ns = (x) => x * 1e9;

/**
 * @param {{
 * status_tree: import("./Editor.js").StatusEntryData?,
 * path: string[],
 * my_clock_is_ahead_by: number,
 * nbpkg: import("./Editor.js").NotebookPkgData?,
 * backend_launch_logs: string?,
 * }} props
 */
const StatusItem = ({ status_tree, path, my_clock_is_ahead_by, nbpkg, backend_launch_logs }) => {
    if (status_tree == null) return null

    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status_tree);
    if (!mystatus) return null

    const [is_open, set_is_open] = hooks_pin_v113_target_es2020.useState(path.length < 1);

    const started = path.length > 0 && is_started(mystatus);
    const finished = started && is_finished(mystatus);
    const busy = started && !finished;

    const start = mystatus.started_at ?? 0;
    const end = mystatus.finished_at ?? 0;

    const local_busy_time = (useMillisSinceTruthy(busy) ?? 0) / 1000;
    const mytime = Date.now() / 1000;

    const busy_time = Math.max(local_busy_time, mytime - start - (mystatus.timing === "local" ? 0 : my_clock_is_ahead_by));

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (busy || mystatus.success === false) {
            let handle = setTimeout(() => {
                set_is_open(true);
            }, Math.max(100, 500 - path.length * 200));

            return () => clearTimeout(handle)
        }
    }, [busy || mystatus.success === false]);

    useEffectWithPrevious(
        ([old_finished]) => {
            if (!old_finished && finished) {
                // let audio = new Audio("https://proxy.notificationsounds.com/message-tones/succeeded-message-tone/download/file-sounds-1210-succeeded.mp3")
                // audio.play()

                let handle = setTimeout(() => {
                    set_is_open(false);
                }, 1800 - path.length * 200);

                return () => clearTimeout(handle)
            }
        },
        [finished]
    );

    const render_child_tasks = () =>
        Object.entries(mystatus.subtasks)
            .sort((a, b) => sort_on(a[1], b[1]))
            .map(([key, _subtask]) =>
                blocklist.includes(key)
                    ? null
                    : html`<${StatusItem}
                          key=${key}
                          status_tree=${status_tree}
                          my_clock_is_ahead_by=${my_clock_is_ahead_by}
                          path=${[...path, key]}
                          nbpkg=${nbpkg}
                          backend_launch_logs=${backend_launch_logs}
                      />`
            );

    const render_child_progress = () => {
        let kids = Object.values(mystatus.subtasks);
        let done = kids.reduce((acc, x) => acc + (is_finished(x) ? 1 : 0), 0);
        let busy = kids.reduce((acc, x) => acc + (is_busy(x) ? 1 : 0), 0);
        let total = kids.length;

        let failed_indices = kids.reduce((acc, x, i) => (x.success === false ? [...acc, i] : acc), []);

        const onClick = mystatus.name === "evaluate" ? () => scroll_to_busy_cell() : undefined;

        return html`<${DiscreteProgressBar} busy=${busy} done=${done} total=${total} failed_indices=${failed_indices} onClick=${onClick} />`
    };

    const inner = is_open
        ? // are all kids a numbered task?
          Object.values(mystatus.subtasks).every((x) => isnumber(x.name)) && Object.values(mystatus.subtasks).length > 0
            ? render_child_progress()
            : render_child_tasks()
        : null;

    let inner_progress = null;
    if (started) {
        let t = total_tasks(mystatus);
        let d = total_done(mystatus);

        if (t > 1) {
            inner_progress = html`<span class="subprogress-counter">${" "}(${d}/${t})</span>`;
        }
    }

    const can_open = Object.values(mystatus.subtasks).length > 0;

    return path.length === 0
        ? inner
        : html`<pl-status
              data-depth=${path.length}
              class=${cl({
                  started,
                  failed: mystatus.success === false,
                  finished,
                  busy,
                  is_open,
                  can_open,
              })}
              aria-expanded=${can_open ? is_open : undefined}
          >
              <div
                  onClick=${(e) => {
                      set_is_open(!is_open);
                  }}
              >
                  <span class="status-icon"></span>
                  <span class="status-name">${friendly_name(mystatus.name)}${inner_progress}</span>
                  <span class="status-time">${finished ? prettytime(to_ns(end - start)) : busy ? prettytime(to_ns(busy_time)) : null}</span>
              </div>
              ${inner}
              ${is_open && mystatus.name === "pkg"
                  ? html`<${PkgTerminalView} value=${nbpkg?.terminal_outputs?.nbpkg_sync} />`
                  : is_open && mystatus.name === "backend_launch"
                  ? html`<${PkgTerminalView} value=${backend_launch_logs} />`
                  : undefined}
          </pl-status>`
};

const isnumber = (str) => /^\d+$/.test(str);

/**
 * @param {import("./Editor.js").StatusEntryData} a
 * @param {import("./Editor.js").StatusEntryData} b
 */
const sort_on = (a, b) => {
    const a_order = global_order.indexOf(a.name);
    const b_order = global_order.indexOf(b.name);
    if (a_order === -1 && b_order === -1) {
        if (a.started_at != null || b.started_at != null) {
            return (a.started_at ?? Infinity) - (b.started_at ?? Infinity)
        } else if (isnumber(a.name) && isnumber(b.name)) {
            return parseInt(a.name) - parseInt(b.name)
        } else {
            return a.name.localeCompare(b.name)
        }
    } else {
        let m = (x) => (x === -1 ? Infinity : x);
        return m(a_order) - m(b_order)
    }
};

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_finished = (status) => status.finished_at != null;

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_started = (status) => status.started_at != null;

/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_busy = (status) => is_started(status) && !is_finished(status);

/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
const total_done = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_done(status), is_finished(status) ? 1 : 0);

/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
const total_tasks = (status) => Object.values(status.subtasks).reduce((total, status) => total + total_tasks(status), 1);

/** @returns {import("./Editor.js").StatusEntryData} */
const useStatusItem = (/** @type {string} */ name, /** @type {boolean} */ started, /** @type {boolean} */ finished, subtasks = {}) => ({
    name,
    subtasks,
    timing: "local",
    started_at: hooks_pin_v113_target_es2020.useMemo(() => (started || finished ? Date.now() / 1000 : null), [started || finished]),
    finished_at: hooks_pin_v113_target_es2020.useMemo(() => (finished ? Date.now() / 1000 : null), [finished]),
});

/** Like `useEffect`, but the handler function gets the previous deps value as argument. */
const useEffectWithPrevious = (fn, deps) => {
    const ref = hooks_pin_v113_target_es2020.useRef(deps);
    hooks_pin_v113_target_es2020.useEffect(() => {
        let result = fn(ref.current);
        ref.current = deps;
        return result
    }, deps);
};

/** Request the current time from the server, compare with the local time, and return the current best estimate of our time difference. Updates regularly.
 * @param {{connected: boolean}} props
 */
const useMyClockIsAheadBy = ({ connected }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    const [my_clock_is_ahead_by, set_my_clock_is_ahead_by] = hooks_pin_v113_target_es2020.useState(0);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (connected) {
            let f = async () => {
                let getserver = () => pluto_actions.send("current_time").then((m) => m.message.time);
                let getlocal = () => Date.now() / 1000;

                // once to precompile and to make sure that the server is not busy with other tasks
                // console.log("getting server time warmup")
                for (let i = 0; i < 16; i++) await getserver();
                // console.log("getting server time warmup done")

                let t1 = await getlocal();
                let s1 = await getserver();
                let s2 = await getserver();
                let t2 = await getlocal();
                // console.log("getting server time done")

                let mytime = (t1 + t2) / 2;
                let servertime = (s1 + s2) / 2;

                let diff = mytime - servertime;
                // console.info("My clock is ahead by ", diff, " s")
                if (!isNaN(diff)) set_my_clock_is_ahead_by(diff);
            };

            f();

            let handle = setInterval(f, 60 * 1000);

            return () => clearInterval(handle)
        }
    }, [connected]);

    return my_clock_is_ahead_by
};

const BackendLaunchPhase = {
    wait_for_user: 0,
    requesting: 0.4,
    created: 0.6,
    responded: 0.7,
    notebook_running: 0.9,
    ready: 1.0,
};

// The following function is based on the wonderful https://github.com/executablebooks/thebe which has the following license:

/*
LICENSE

Copyright Executable Books Project

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

const trailingslash = (s) => (s.endsWith("/") ? s : s + "/");

const request_binder = (build_url, { on_log }) =>
    new Promise((resolve, reject) => {
        console.log("Starting binder connection to", build_url);
        try {
            let es = new EventSource(build_url);
            es.onerror = (err) => {
                console.error("Binder error: Lost connection to " + build_url, err);
                es.close();
                reject(err);
            };
            let phase = null;
            let logs = ``;
            let report_log = (msg) => {
                console.log("Binder: ", msg, ` at ${new Date().toLocaleTimeString()}`);

                logs = `${logs}${msg}\n`;
                on_log(logs);
            };
            es.onmessage = (evt) => {
                let msg = JSON.parse(evt.data);

                if (msg.phase && msg.phase !== phase) {
                    phase = msg.phase.toLowerCase();

                    report_log(`\n\n⏱️ Binder subphase: ${phase}\n`);
                }
                if (msg.message) {
                    report_log(msg.message.replace(`] `, `]\n`));
                }
                switch (msg.phase) {
                    case "failed":
                        console.error("Binder error: Failed to build", build_url, msg);
                        es.close();
                        reject(new Error(msg));
                        break
                    case "ready":
                        es.close();

                        resolve({
                            binder_session_url: trailingslash(msg.url) + "pluto/",
                            binder_session_token: msg.token,
                        });
                        break
                }
            };
        } catch (err) {
            console.error(err);
            reject("Failed to open event source the mybinder.org. This probably means that the URL is invalid.");
        }
    });

// view stats on https://stats.plutojl.org/
const count_stat = (page) =>
    fetch(`https://stats.plutojl.org/count?p=/${page}&s=${screen.width},${screen.height},${devicePixelRatio}#skip_sw`, { cache: "no-cache" }).catch(() => {});

/**
 * Start a 'headless' binder session, open our notebook in it, and connect to it.
 */
const start_binder = async ({ setStatePromise, connect, launch_params }) => {
    try {
        // view stats on https://stats.plutojl.org/
        count_stat(`binder-start`);
        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.requesting;
                state.disable_ui = false;
                // Clear the Status of the process that generated the HTML
                state.notebook.status_tree = null;
            })
        );

        /// PART 1: Creating a binder session..
        const { binder_session_url, binder_session_token } = await request_binder(launch_params.binder_url.replace("mybinder.org/v2/", "mybinder.org/build/"), {
            on_log: (logs) =>
                setStatePromise(
                    immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                        state.backend_launch_logs = logs;
                    })
                ),
        });
        const with_token = (u) => with_query_params(u, { token: binder_session_token });

        console.log("Binder URL:", with_token(binder_session_url));

        //@ts-ignore
        window.shutdown_binder = () => {
            fetch(with_token(new URL("../api/shutdown", binder_session_url)), { method: "POST" });
        };

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.created;
                state.binder_session_url = binder_session_url;
                state.binder_session_token = binder_session_token;
            })
        );

        // fetch index to say hello to the pluto server. this ensures that the pluto server is running and it triggers JIT compiling some of the HTTP code.
        await fetch(with_token(binder_session_url));

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.responded;
            })
        );

        /// PART 2: Using Pluto's REST API to open the notebook file. We either upload the notebook with a POST request, or we let the server open by giving it the filename/URL.

        let download_locally_and_upload = async () => {
            const upload_url = with_token(
                with_query_params(new URL("notebookupload", binder_session_url), {
                    name: new URLSearchParams(window.location.search).get("name"),
                    execution_allowed: "true",
                })
            );
            console.log(`downloading locally and uploading `, upload_url, launch_params.notebookfile);

            return fetch(upload_url, {
                method: "POST",
                body: await (await fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity }))).arrayBuffer(),
            })
        };

        let open_remotely = async (p1, p2) => {
            const open_url = with_query_params(new URL("open", binder_session_url), {
                [p1]: p2,
                execution_allowed: "true",
            });

            console.log(`open ${p1}:`, open_url);
            return fetch(with_token(open_url), {
                method: "POST",
            })
        };
        let open_remotely_fn = (p1, p2) => () => open_remotely(p1, p2);

        let methods_to_try = launch_params.notebookfile.startsWith("data:")
            ? [download_locally_and_upload]
            : [
                  //
                  open_remotely_fn("path", launch_params.notebookfile),
                  //
                  open_remotely_fn("url", new URL(launch_params.notebookfile, window.location.href).href),
                  //
                  download_locally_and_upload,
              ];

        let open_response = new Response();
        for (let method of methods_to_try) {
            open_response = await method();
            if (open_response.ok) {
                break
            }
        }

        if (!open_response.ok) {
            let b = await open_response.blob();
            window.location.href = URL.createObjectURL(b);
            return
        }

        // Opening a notebook gives us the notebook ID, which means that we have a running session! Time to connect.

        const new_notebook_id = await open_response.text();
        const edit_url = with_token(with_query_params(new URL("edit", binder_session_url), { id: new_notebook_id }));
        console.info("notebook_id:", new_notebook_id);

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.notebook.notebook_id = new_notebook_id;
                state.backend_launch_phase = BackendLaunchPhase.notebook_running;
                state.refresh_target = edit_url;
            })
        );

        /// PART 3: We open the WebSocket connection to the Pluto server, connecting to the notebook ID that was created for us. If this fails, or after a 20 second timeout, we give up on hot-swapping a live backend into this static view, and instead we just redirect to the binder URL.

        console.log("Connecting WebSocket");

        const connect_promise = connect(with_token(new URL("channels", ws_address_from_base(binder_session_url))));
        await timeout_promise(connect_promise, 20_000).catch((e) => {
            console.error("Failed to establish connection within 20 seconds. Navigating to the edit URL directly.", e);
            window.parent.location.href = edit_url;
        });
    } catch (err) {
        console.error("Failed to initialize binder!", err);
        alert("Something went wrong! 😮\n\nWe failed to initialize the binder connection. Please try again with a different browser, or come back later.");
    }
};

/**
 * @typedef PanelTabName
 * @type {"docs" | "process" | null}
 */

const open_bottom_right_panel = (/** @type {PanelTabName} */ tab) => window.dispatchEvent(new CustomEvent("open_bottom_right_panel", { detail: tab }));

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string?) => void,
 * connected: boolean,
 * backend_launch_phase: number?,
 * backend_launch_logs: string?,
 * sanitize_html?: boolean,
 * }} props
 */
let BottomRightPanel = ({
    desired_doc_query,
    on_update_doc_query,
    notebook,
    connected,
    backend_launch_phase,
    backend_launch_logs,
    sanitize_html = true,
}) => {
    let container_ref = hooks_pin_v113_target_es2020.useRef();

    const focus_docs_on_open_ref = hooks_pin_v113_target_es2020.useRef(false);
    const [open_tab, set_open_tab] = hooks_pin_v113_target_es2020.useState(/** @type { PanelTabName} */ (null));
    const hidden = open_tab == null;

    // Open panel when "open_bottom_right_panel" event is triggered
    useEventListener(
        window,
        "open_bottom_right_panel",
        (/** @type {CustomEvent} */ e) => {
            console.log(e.detail);
            // https://github.com/fonsp/Pluto.jl/issues/321
            focus_docs_on_open_ref.current = false;
            set_open_tab(e.detail);
            if (window.getComputedStyle(container_ref.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.");
            }
        },
        [set_open_tab]
    );

    const status = useWithBackendStatus(notebook, backend_launch_phase);

    const [status_total, status_done] = hooks_pin_v113_target_es2020.useMemo(
        () =>
            status == null
                ? [0, 0]
                : [
                      // total_tasks minus 1, to exclude the notebook task itself
                      total_tasks(status) - 1,
                      // the notebook task should never be done, but lets be sure and subtract 1 if it is:
                      total_done(status) - (is_finished(status) ? 1 : 0),
                  ],
        [status]
    );

    const busy = status_done < status_total;

    const show_business_outline = useDelayedTruth(busy, 700);
    const show_business_counter = useDelayedTruth(busy, 3000);

    const my_clock_is_ahead_by = useMyClockIsAheadBy({ connected });

    const on_popout_click = async () => {
        // Open a Picture-in-Picture window, see https://developer.chrome.com/docs/web-platform/document-picture-in-picture/
        // @ts-ignore
        const pip_window = await documentPictureInPicture.requestWindow()

        // Copy style sheets
        ;[...document.styleSheets].forEach((styleSheet) => {
            try {
                const style = document.createElement("style");
                style.textContent = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
                pip_window.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = styleSheet.type;
                // @ts-ignore
                link.media = styleSheet.media;
                // @ts-ignore
                link.href = styleSheet.href;
                pip_window.document.head.appendChild(link);
            }
        });
        pip_window.document.body.append(container_ref.current.firstElementChild);
        pip_window.addEventListener("pagehide", (event) => {
            const pipPlayer = event.target.querySelector("pluto-helpbox");
            container_ref.current.append(pipPlayer);
        });
    };

    return html`
        <aside id="helpbox-wrapper" ref=${container_ref}>
            <pluto-helpbox class=${cl({ hidden, [`helpbox-${open_tab ?? hidden}`]: true })}>
                <header translate=${false}>
                    <button
                        title="Live Docs: Search for Julia documentation, and get live documentation of everything you type."
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-docs": true,
                            "active": open_tab === "docs",
                        })}
                        onClick=${() => {
                            focus_docs_on_open_ref.current = true;
                            set_open_tab(open_tab === "docs" ? null : "docs");
                            // TODO: focus the docs input
                        }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname">Live Docs</span>
                    </button>
                    <button
                        title=${"Process status"}
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-process": true,
                            "active": open_tab === "process",
                            "busy": show_business_outline,
                            "something_is_happening": busy || !connected,
                        })}
                        id="process-status-tab-button"
                        onClick=${() => {
                            set_open_tab(open_tab === "process" ? null : "process");
                        }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname"
                            >${open_tab === "process" || !show_business_counter
                                ? "Status"
                                : html`Status${" "}<span class="subprogress-counter">(${status_done}/${status_total})</span>`}</span
                        >
                    </button>

                    ${hidden
                        ? null
                        : html` ${"documentPictureInPicture" in window
                                  ? html`<button class="helpbox-popout" title="Pop out panel" onClick=${on_popout_click}>
                                        <span></span>
                                    </button>`
                                  : null}
                              <button
                                  class="helpbox-close"
                                  title="Close panel"
                                  onClick=${() => {
                                      set_open_tab(null);
                                  }}
                              >
                                  <span></span>
                              </button>`}
                </header>
                ${open_tab === "docs"
                    ? html`<${LiveDocsTab}
                          focus_on_open=${focus_docs_on_open_ref.current}
                          desired_doc_query=${desired_doc_query}
                          on_update_doc_query=${on_update_doc_query}
                          notebook=${notebook}
                          sanitize_html=${sanitize_html}
                      />`
                    : open_tab === "process"
                    ? html`<${StatusTab}
                          notebook=${notebook}
                          backend_launch_logs=${backend_launch_logs}
                          my_clock_is_ahead_by=${my_clock_is_ahead_by}
                          status=${status}
                      />`
                    : null}
            </pluto-helpbox>
        </aside>
    `
};

const useDelayedTruth = (/** @type {boolean} */ x, /** @type {number} */ timeout) => {
    const [output, set_output] = hooks_pin_v113_target_es2020.useState(false);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (x) {
            let handle = setTimeout(() => {
                set_output(true);
            }, timeout);
            return () => clearTimeout(handle)
        } else {
            set_output(false);
        }
    }, [x]);

    return output
};

/**
 *
 * @param {import("./Editor.js").NotebookData} notebook
 * @param {number?} backend_launch_phase
 * @returns {import("./Editor.js").StatusEntryData?}
 */
const useWithBackendStatus = (notebook, backend_launch_phase) => {
    const backend_launch = useBackendStatus(backend_launch_phase);

    return backend_launch_phase == null
        ? notebook.status_tree
        : {
              name: "notebook",
              started_at: 0,
              finished_at: null,
              subtasks: {
                  ...notebook.status_tree?.subtasks,
                  backend_launch,
              },
          }
};

const useBackendStatus = (/** @type {number | null} */ backend_launch_phase) => {
    let x = backend_launch_phase ?? -1;

    const subtasks = Object.fromEntries(
        ["requesting", "created", "responded", "notebook_running"].map((key) => {
            let val = BackendLaunchPhase[key];
            let name = `backend_${key}`;
            return [name, useStatusItem(name, x >= val, x > val)]
        })
    );

    return useStatusItem(
        "backend_launch",
        backend_launch_phase != null && backend_launch_phase > BackendLaunchPhase.wait_for_user,
        backend_launch_phase === BackendLaunchPhase.ready,
        subtasks
    )
};

const VERBOSE = false;

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 */

/**
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

/**
 * @typedef Range
 * @property {number} from
 * @property {number} to
 *
 * @typedef {Range & {valid_from: number}} Definition
 *
 * @typedef ScopeState
 * @property {Array<{
 *  usage: Range,
 *  definition: Range | null,
 *  name: string,
 * }>} usages
 * @property {Map<String, Definition>} definitions
 * @property {Array<{ definition: Range, validity: Range, name: string }>} locals
 */

const r = (cursor) => ({ from: cursor.from, to: cursor.to });

const find_local_definition = (locals, name, cursor) => {
    for (let lo of locals) {
        if (lo.name === name && cursor.from >= lo.validity.from && cursor.to <= lo.validity.to) {
            return lo
        }
    }
};

const HardScopeNames = new Set([
    "WhileStatement",
    "ForStatement",
    "TryStatement",
    "LetStatement",
    "FunctionDefinition",
    "MacroDefinition",
    "DoClause",
    "Generator",
]);

const does_this_create_scope = (/** @type {TreeCursor} */ cursor) => {
    if (HardScopeNames.has(cursor.name)) return true

    if (cursor.name === "Assignment") {
        const reset = cursor.firstChild();
        try {
            // f(x) = x
            // @ts-ignore
            if (cursor.name === "CallExpression") return true
        } finally {
            if (reset) cursor.parent();
        }
    }

    return false
};

/**
 * Look into the left-hand side of an Assigment expression and find all ranges where variables are defined.
 * E.g. `a, (b,c) = something` will return ranges for a, b, c.
 * @param {TreeCursor} root_cursor
 * @returns {Range[]}
 */
const explore_assignment_lhs = (root_cursor) => {
    const a = cursor_not_moved_checker(root_cursor);
    let found = [];
    root_cursor.iterate((cursor) => {
        if (cursor.name === "Identifier" || cursor.name === "MacroIdentifier" || cursor.name === "Operator") {
            found.push(r(cursor));
        }
        if (cursor.name === "IndexExpression" || cursor.name === "FieldExpression") {
            // not defining a variable but modifying an object
            return false
        }
    });
    a();
    return found
};

/**
 * Remember the position where this is called, and return a function that will move into parents until we are are back at that position.
 *
 * You can use this before exploring children of a cursor, and then go back when you are done.
 */
const back_to_parent_resetter = (/** @type {TreeCursor} */ cursor) => {
    const map = new index_es_min_js.NodeWeakMap();
    map.cursorSet(cursor, "here");
    return () => {
        while (map.cursorGet(cursor) !== "here") {
            if (!cursor.parent()) throw new Error("Could not find my back to the original parent!")
        }
    }
};

const cursor_not_moved_checker = (cursor) => {
    const map = new index_es_min_js.NodeWeakMap();
    map.cursorSet(cursor, "yay");

    const debug = (cursor) => `${cursor.name}(${cursor.from},${cursor.to})`;

    const debug_before = debug(cursor);

    return () => {
        if (map.cursorGet(cursor) !== "yay") {
            throw new Error(`Cursor changed position when forbidden! Before: ${debug_before}, after: ${debug(cursor)}`)
        }
    }
};

const i_am_nth_child = (cursor) => {
    const map = new index_es_min_js.NodeWeakMap();
    map.cursorSet(cursor, "here");
    if (!cursor.parent()) throw new Error("Cannot be toplevel")
    cursor.firstChild();
    let i = 0;
    while (map.cursorGet(cursor) !== "here") {
        i++;
        if (!cursor.nextSibling()) {
            throw new Error("Could not find my way back")
        }
    }
    return i
};

/**
 * @param {TreeCursor} cursor
 * @returns {Range[]}
 */
const explore_funcdef_arguments = (cursor, { enter, leave }) => {

    let found = [];

    const position_validation = cursor_not_moved_checker(cursor);
    const position_resetter = back_to_parent_resetter(cursor);

    if (!cursor.firstChild()) throw new Error(`Expected to go into function definition argument expression, stuck at ${cursor.name}`)
    // should be in the TupleExpression now

    cursor.firstChild();

    const explore_argument = () => {
        if (cursor.name === "Identifier" || cursor.name === "Operator") {
            found.push(r(cursor));
        } else if (cursor.name === "KwArg") {
            let went_in = cursor.firstChild();
            explore_argument();
            cursor.nextSibling();
            // find stuff used here
            cursor.iterate(enter, leave);

            if (went_in) cursor.parent();
        } else if (cursor.name === "BinaryExpression") {
            let went_in = cursor.firstChild();
            explore_argument();
            cursor.nextSibling();
            cursor.nextSibling();
            // find stuff used here
            cursor.iterate(enter, leave);

            if (went_in) cursor.parent();
        }
    };

    do {
        if (cursor.name === "KeywordArguments") {
            cursor.firstChild(); // go into kwarg arguments
        }
        explore_argument();
    } while (cursor.nextSibling())

    position_resetter();
    position_validation();
    return found
};

/**
 * @param {TreeCursor | SyntaxNode} tree
 * @param {Text} doc
 * @param {any} _scopestate
 * @param {boolean} [verbose]
 * @returns {ScopeState}
 */
let explore_variable_usage = (tree, doc, _scopestate, verbose = VERBOSE) => {
    if ("cursor" in tree) {
        console.trace("`explore_variable_usage()` called with a SyntaxNode, not a TreeCursor");
        tree = tree.cursor();
    }

    const scopestate = {
        usages: [],
        definitions: new Map(),
        locals: [],
    };

    let local_scope_stack = /** @type {Range[]} */ ([]);

    const definitions = /** @type {Map<string, Definition>} */ new Map();
    const locals = /** @type {Array<{ definition: Range, validity: Range, name: string }>} */ ([]);
    const usages = /** @type {Array<{ usage: Range, definition: Range | null, name: string }>} */ ([]);

    const return_false_immediately = new index_es_min_js.NodeWeakMap();

    let enter, leave;

    enter = (/** @type {TreeCursor} */ cursor) => {
        if (verbose) {
            console.group(`Explorer: ${cursor.name}`);

            console.groupCollapsed("Details");
            try {
                console.log(`Full tree: ${cursor.toString()}`);
                console.log("Full text:", doc.sliceString(cursor.from, cursor.to));
                console.log(`scopestate:`, scopestate);
            } finally {
                console.groupEnd();
            }
        }

        if (
            return_false_immediately.cursorGet(cursor) ||
            cursor.name === "ModuleDefinition" ||
            cursor.name === "QuoteStatement" ||
            cursor.name === "QuoteExpression" ||
            cursor.name === "MacroIdentifier" ||
            cursor.name === "ImportStatement" ||
            cursor.name === "UsingStatement"
        ) {
            if (verbose) console.groupEnd();
            return false
        }

        const register_variable = (range) => {
            const name = doc.sliceString(range.from, range.to);

            if (local_scope_stack.length === 0)
                definitions.set(name, {
                    ...range,
                    valid_from: range.from,
                });
            else locals.push({ name, validity: _.last(local_scope_stack), definition: range });
        };

        if (does_this_create_scope(cursor)) {
            local_scope_stack.push(r(cursor));
        }

        if (cursor.name === "Identifier" || cursor.name === "MacroIdentifier" || cursor.name === "Operator") {
            const name = doc.sliceString(cursor.from, cursor.to);
            usages.push({
                name: name,
                usage: {
                    from: cursor.from,
                    to: cursor.to,
                },
                definition: find_local_definition(locals, name, cursor) ?? null,
            });
        } else if (cursor.name === "Assignment" || cursor.name === "KwArg" || cursor.name === "ForBinding" || cursor.name === "CatchClause") {
            if (cursor.firstChild()) {
                // @ts-ignore
                if (cursor.name === "catch") cursor.nextSibling();
                // CallExpression means function definition `f(x) = x`, this is handled elsewhere
                // @ts-ignore
                if (cursor.name !== "CallExpression") {
                    explore_assignment_lhs(cursor).forEach(register_variable);
                    // mark this one as finished
                    return_false_immediately.cursorSet(cursor, true);
                }
                cursor.parent();
            }
        } else if (cursor.name === "Parameters") {
            explore_assignment_lhs(cursor).forEach(register_variable);
            if (verbose) console.groupEnd();
            return false
        } else if (cursor.name === "Field") {
            if (verbose) console.groupEnd();
            return false
        } else if (cursor.name === "CallExpression") {
            if (cursor.matchContext(["FunctionDefinition", "Signature"]) || (cursor.matchContext(["Assignment"]) && i_am_nth_child(cursor) === 0)) {
                const pos_resetter = back_to_parent_resetter(cursor);

                cursor.firstChild(); // Now we should have the function name
                // @ts-ignore
                if (cursor.name === "Identifier" || cursor.name === "Operator" || cursor.name === "FieldExpression") {
                    if (verbose) console.log("found function name", doc.sliceString(cursor.from, cursor.to), cursor.name);

                    const last_scoper = local_scope_stack.pop();
                    register_variable(r(cursor));
                    if (last_scoper) local_scope_stack.push(last_scoper);

                    cursor.nextSibling();
                }
                if (verbose) console.log("expl funcdef ", doc.sliceString(cursor.from, cursor.to));
                explore_funcdef_arguments(cursor, { enter, leave }).forEach(register_variable);
                if (verbose) console.log("expl funcdef ", doc.sliceString(cursor.from, cursor.to));

                pos_resetter();

                if (verbose) console.log("end of FunctionDefinition, currently at ", cursor.node);

                if (verbose) console.groupEnd();
                return false
            }
        } else if (cursor.name === "Generator") {
            // This is: (f(x) for x in xs) or [f(x) for x in xs]
            const savior = back_to_parent_resetter(cursor);

            // We do a Generator in two steps:
            // First we explore all the ForBindings (where locals get defined), and then we go into the first child (where those locals are used).

            // 1. The for bindings `x in xs`
            if (cursor.firstChild()) {
                // Note that we skip the first child here, which is what we want! That's the iterated expression that we leave for the end.
                while (cursor.nextSibling()) {
                    cursor.iterate(enter, leave);
                }
                savior();
            }
            // 2. The iterated expression `f(x)`
            if (cursor.firstChild()) {
                cursor.iterate(enter, leave);
                savior();
            }

            // k thx byeee
            leave(cursor);
            return false
        }
    };

    leave = (/** @type {TreeCursor} */ cursor) => {
        if (verbose) {
            console.groupEnd();
        }

        if (does_this_create_scope(cursor)) {
            local_scope_stack.pop();
        }
    };

    const debugged_enter = (cursor) => {
        const a = cursor_not_moved_checker(cursor);
        const result = enter(cursor);
        a();
        return result
    };

    tree.iterate(verbose ? debugged_enter : enter, leave);

    if (local_scope_stack.length > 0) throw new Error(`Some scopes were not leaved... ${JSON.stringify(local_scope_stack)}`)

    const output = { usages, definitions, locals };
    if (verbose) console.log(output);
    return output
};

/**
 * @type {StateField<ScopeState>}
 */
let ScopeStateField = index_es_min_js.StateField.define({
    create(state) {
        try {
            let cursor = index_es_min_js.syntaxTree(state).cursor();
            let scopestate = explore_variable_usage(cursor, state.doc, undefined);
            return scopestate
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error);
            return {
                usages: [],
                definitions: new Map(),
                locals: [],
            }
        }
    },

    update(value, tr) {
        try {
            if (index_es_min_js.syntaxTree(tr.state) != index_es_min_js.syntaxTree(tr.startState)) {
                let cursor = index_es_min_js.syntaxTree(tr.state).cursor();
                let scopestate = explore_variable_usage(cursor, tr.state.doc, null);
                return scopestate
            } else {
                return value
            }
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error);
            return {
                usages: [],
                definitions: new Map(),
                locals: [],
            }
        }
    },
});

let get_root_variable_from_expression = (cursor) => {
    if (cursor.name === "IndexExpression") {
        cursor.firstChild();
        return get_root_variable_from_expression(cursor)
    }
    if (cursor.name === "FieldExpression") {
        cursor.firstChild();
        return get_root_variable_from_expression(cursor)
    }
    if (cursor.name === "Identifier") {
        cursor.firstChild();
        return cursor.node
    }
    return null
};

let VALID_DOCS_TYPES = [
    "Identifier",
    "Field",
    "FieldExpression",
    "IndexExpression",
    "MacroFieldExpression",
    "MacroIdentifier",
    "Operator",
    "TypeHead",
    "Signature",
    "ParametrizedExpression",
];
let keywords_that_have_docs_and_are_cool = [
    "import",
    "export",
    "try",
    "catch",
    "finally",
    "quote",
    "do",
    "struct",
    "mutable",
    "module",
    "baremodule",
    "if",
    "let",
    ".",
];

let is_docs_searchable = (/** @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor} */ cursor) => {
    if (keywords_that_have_docs_and_are_cool.includes(cursor.name)) {
        return true
    } else if (VALID_DOCS_TYPES.includes(cursor.name)) {
        if (cursor.firstChild()) {
            do {
                // Numbers themselves can't be docs searched, but using numbers inside IndexExpression can be.
                if (cursor.name === "IntegerLiteral" || cursor.name === "FloatLiteral") {
                    continue
                }
                // This is for the VERY specific case like `Vector{Int}(1,2,3,4) which I want to yield `Vector{Int}`
                if (cursor.name === "BraceExpression") {
                    continue
                }
                if (cursor.name === "FieldName" || cursor.name === "MacroName" || cursor.name === "MacroFieldName") {
                    continue
                }
                if (!is_docs_searchable(cursor)) {
                    return false
                }
            } while (cursor.nextSibling())
            cursor.parent();
            return true
        } else {
            return true
        }
    } else {
        return false
    }
};

let get_selected_doc_from_state = (/** @type {EditorState} */ state, verbose = false) => {
    let selection = state.selection.main;

    let scopestate = state.field(ScopeStateField);

    if (selection.empty) {
        // If the cell starts with a questionmark, we interpret it as a
        // docs query, so I'm gonna spit out exactly what the user typed.
        let current_line = state.doc.lineAt(selection.from).text;
        if (current_line[0] === "?") {
            return current_line.slice(1)
        }

        let tree = index_es_min_js.syntaxTree(state);
        let cursor = tree.cursor();
        verbose && console.log(`Full tree:`, cursor.toString());
        cursor.moveTo(selection.to, -1);

        let iterations = 0;

        do {
            verbose && console.group(`Iteration #${iterations}`);
            try {
                verbose && console.log("cursor", cursor.toString());

                // Just to make sure we don't accidentally end up in an infinite loop
                if (iterations > 100) {
                    console.group("Infinite loop while checking docs");
                    console.log("Selection:", selection, state.doc.sliceString(selection.from, selection.to).trim());
                    console.log("Current node:", cursor.name, state.doc.sliceString(cursor.from, cursor.to).trim());
                    console.groupEnd();
                    break
                }
                iterations = iterations + 1;

                // Collect parents in a list so I can compare them easily
                let parent_cursor = cursor.node.cursor();
                let parents = [];
                while (parent_cursor.parent()) {
                    parents.push(parent_cursor.name);
                }
                // Also just have the first parent as a node
                let parent = cursor.node.parent;
                if (parent == null) {
                    break
                }

                verbose && console.log(`parents:`, parents);

                let index_of_struct_in_parents = parents.indexOf("StructDefinition");
                if (index_of_struct_in_parents !== -1) {
                    verbose && console.log(`in a struct?`);
                    // If we're in a struct, we basically barely want to search the docs:
                    // - Struct name is useless: you are looking at the definition
                    // - Properties are just named, not in the workspace or anything
                    // Only thing we do want, are types and the right hand side of `=`'s.
                    if (parents.includes("binding") && parents.indexOf("binding") < index_of_struct_in_parents) {
                        // We're inside a `... = ...` inside the struct
                    } else if (parents.includes("TypedExpression") && parents.indexOf("TypedExpression") < index_of_struct_in_parents) {
                        // We're inside a `x::X` inside the struct
                    } else if (parents.includes("SubtypedExpression") && parents.indexOf("SubtypedExpression") < index_of_struct_in_parents) {
                        // We're inside `Real` in `struct MyNumber<:Real`
                        while (parent?.name !== "SubtypedExpression") {
                            parent = parent.parent;
                        }
                        const type_node = parent.lastChild;
                        if (type_node.from <= cursor.from && type_node.to >= cursor.to) {
                            return state.doc.sliceString(type_node.from, type_node.to)
                        }
                    } else if (cursor.name === "struct" || cursor.name === "mutable") {
                        cursor.parent();
                        cursor.firstChild();
                        if (cursor.name === "struct") return "struct"
                        if (cursor.name === "mutable") {
                            cursor.nextSibling();
                            // @ts-ignore
                            if (cursor.name === "struct") return "mutable struct"
                        }
                        return undefined
                    } else {
                        return undefined
                    }
                }

                if (cursor.name === "AbstractDefinition") {
                    return "abstract type"
                }

                // `callee(...)` should yield "callee"
                // (Only if it is on the `(` or `)`, or in like a space,
                //    not on arguments (those are handle later))
                if (cursor.name === "CallExpression") {
                    cursor.firstChild(); // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                // `Base.:%` should yield... "Base.:%"
                if (
                    (cursor.name === "Operator" || cursor.name === "⚠" || cursor.name === "Identifier") &&
                    parent.name === "QuoteExpression" &&
                    parent.parent?.name === "FieldExpression"
                ) {
                    verbose && console.log("Quirky symbol in a quote expression");
                    // TODO Needs a fix added to is_docs_searchable, but this works fine for now
                    return state.sliceDoc(parent.parent.from, parent.parent.to)
                }

                if (cursor.name === "ParameterizedIdentifier") {
                    cursor.firstChild(); // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                // `html"asd"` should yield "html"
                if (cursor.name === "Identifier" && parent.name === "Prefix") {
                    continue
                }
                if (cursor.name === "PrefixedString") {
                    cursor.firstChild(); // Move to callee
                    let name = state.doc.sliceString(cursor.from, cursor.to);
                    return `${name}"`
                }

                // For identifiers in typed expressions e.g. `a::Number` always show the type
                if (cursor.name === "Identifier" && parent.name === "TypedExpression") {
                    cursor.parent(); // Move to TypedExpression
                    cursor.lastChild(); // Move to type Identifier
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }
                // For the :: inside a typed expression, show the type
                if (cursor.name === "TypedExpression") {
                    cursor.lastChild(); // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                // Docs for spread operator when you're in a SpreadExpression
                if (cursor.name === "SpreadExpression") {
                    return "..."
                }

                // For Identifiers, we expand them in the hopes of finding preceding (left side) parts.
                // So we make sure we don't move to the left (`to` stays the same) and then possibly expand
                if (parent.to === cursor.to) {
                    if (VALID_DOCS_TYPES.includes(cursor.name) && VALID_DOCS_TYPES.includes(parent.name)) {
                        verbose && console.log("Expanding identifier");
                        continue
                    }
                }

                // If we are an identifier inside a NamedField, we want to show whatever we are a named part of
                // EXEPT, when we are in the last part (the value) of a NamedField, because then we can show
                // the value.
                if (cursor.name === "Identifier" && parent.name === "NamedField") {
                    if (parent.lastChild.from != cursor.from && parent.lastChild.to != cursor.to) {
                        continue
                    }
                }

                // `a = 1` would yield `=`, `a += 1` would yield `+=`
                if (cursor.name === "binding") {
                    let end_of_first = cursor.node.firstChild.to;
                    let beginning_of_last = cursor.node.lastChild.from;
                    return state.doc.sliceString(end_of_first, beginning_of_last).trim()
                }

                // If we happen to be in an argumentslist, we should go to the parent
                if (cursor.name === "ArgumentList") {
                    continue
                }
                // If we are on an identifiers inside the argumentslist of a function *declaration*,
                // we should go to the parent.
                if (
                    cursor.name === "Identifier" &&
                    parent.name === "ArgumentList" &&
                    (parent.parent.parent.name === "FunctionAssignmentExpression" || parent.parent.name === "FunctionDefinition")
                ) {
                    continue
                }

                // Identifier that's actually a symbol? Not useful at all!
                if (cursor.name === "Identifier" && parent.name === "Symbol") {
                    continue
                }

                // If we happen to be anywhere else in a function declaration, we want the function name
                // `function X() ... end` should yield `X`
                if (cursor.name === "FunctionDefinition") {
                    cursor.firstChild(); // "function"
                    cursor.nextSibling(); // Identifier
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }
                // `X() = ...` should yield `X`
                if (cursor.name === "FunctionAssignmentExpression") {
                    cursor.firstChild(); // Identifier
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                if (cursor.name === "Identifier" && parent.name === "MacroIdentifier") {
                    continue
                }

                // `@X` should yield `X`
                if (cursor.name === "MacroExpression") {
                    cursor.firstChild();
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                // `1 + 1` should yield `+`
                // A bit odd, but we don't get the span of the actual operator in a binary expression,
                // so we infer it from the end of the left side and start of the right side.
                if (cursor.name === "BinaryExpression") {
                    let end_of_first = cursor.node.firstChild.to;
                    let beginning_of_last = cursor.node.lastChild.from;
                    return state.doc.sliceString(end_of_first, beginning_of_last).trim()
                }

                // Putting in a special case for ternary expressions (a ? b : c) because I think
                // these might be confusing to new users so I want to extra show them docs about it.
                // Sad thing is, our current docs think that `?:` means "give me info about :", so
                // TODO Make Pluto treat `?` prefixes (or specifically `?:`) as normal identifiers
                if (cursor.name === "TernaryExpression") {
                    return "??:"
                }

                if (VALID_DOCS_TYPES.includes(cursor.name) || keywords_that_have_docs_and_are_cool.includes(cursor.name)) {
                    if (!is_docs_searchable(cursor)) {
                        verbose && console.log("Not searchable aaa");
                        return undefined
                    }

                    // When we can already see that a variable is local, we don't want to show docs for it
                    // because we won't be able to load it in anyway.
                    let root_variable_node = get_root_variable_from_expression(cursor.node.cursor);
                    if (root_variable_node == null) {
                        return state.doc.sliceString(cursor.from, cursor.to)
                    }

                    // We have do find the current usage of the variable, and make sure it has no definition inside this cell
                    let usage = scopestate.usages.find((x) => x.usage.from === root_variable_node.from && x.usage.to === root_variable_node.to);
                    // If we can't find the usage... we just assume it can be docs showed I guess
                    if (usage?.definition == null) {
                        return state.doc.sliceString(cursor.from, cursor.to)
                    }
                }

                // If you get here (so you have no cool other matches) and your parent is a FunctionDefinition,
                // I don't want to show you the function name, so imma head out.
                if (parent.name === "FunctionDefinition") {
                    return undefined
                }
                // If we are expanding to an AssigmentExpression, we DONT want to show `=`
                if (parent.name === "binding") {
                    return undefined
                }
            } finally {
                verbose && console.groupEnd();
            }
        } while (cursor.parent())
    } else {
        return state.doc.sliceString(selection.from, selection.to).trim()
    }
};

/**
 * @param {any} state
 * @param {{
 *  scopestate: import("./scopestate_statefield.js").ScopeState,
 *  global_definitions: { [key: string]: string }
 * }} context
 */
let get_variable_marks = (state, { scopestate, global_definitions }) => {
    return index_es_min_js.Decoration.set(
        filter_non_null(
            scopestate.usages.map(({ definition, usage, name }) => {
                if (definition == null) {
                    // TODO variables_with_origin_cell should be notebook wide, not just in the current cell
                    // .... Because now it will only show variables after it has run once
                    if (global_definitions[name]) {
                        return index_es_min_js.Decoration.mark({
                            tagName: "a",
                            attributes: {
                                "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                                "data-pluto-variable": name,
                                "href": `#${name}`,
                            },
                        }).range(usage.from, usage.to)
                    } else {
                        // This could be used to trigger @edit when clicked, to open
                        // in whatever editor the person wants to use.
                        // return Decoration.mark({
                        //     tagName: "a",
                        //     attributes: {
                        //         "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                        //         "data-external-variable": text,
                        //         "href": `#`,
                        //     },
                        // }).range(usage.from, usage.to)
                        return null
                    }
                } else {
                    // Could be used to select the definition of a variable inside the current cell
                    return index_es_min_js.Decoration.mark({
                        tagName: "a",
                        attributes: {
                            "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                            "data-cell-variable": name,
                            "data-cell-variable-from": `${definition.from}`,
                            "data-cell-variable-to": `${definition.to}`,
                            "href": `#`,
                        },
                    }).range(usage.from, usage.to)
                }
            })
        ),
        true
    )
};

/**
 *
 * @argument {Array<T?>} xs
 * @template T
 * @return {Array<T>}
 */
const filter_non_null = (xs) => /** @type {Array<T>} */ (xs.filter((x) => x != null));

/**
 * Key: variable name, value: cell id.
 * @type {Facet<{ [variable_name: string]: string }, { [variable_name: string]: string }>}
 */
const GlobalDefinitionsFacet = index_es_min_js.Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
});

const go_to_definition_plugin = index_es_min_js.ViewPlugin.fromClass(
    class {
        /**
         * @param {EditorView} view
         */
        constructor(view) {
            let global_definitions = view.state.facet(GlobalDefinitionsFacet);
            this.decorations = get_variable_marks(view.state, {
                scopestate: view.state.field(ScopeStateField),
                global_definitions,
            });
        }

        update(update) {
            // My best take on getting this to update when GlobalDefinitionsFacet does 🤷‍♀️
            let global_definitions = update.state.facet(GlobalDefinitionsFacet);
            if (update.docChanged || update.viewportChanged || global_definitions !== update.startState.facet(GlobalDefinitionsFacet)) {
                this.decorations = get_variable_marks(update.state, {
                    scopestate: update.state.field(ScopeStateField),
                    global_definitions,
                });
            }
        }
    },
    {
        decorations: (v) => v.decorations,

        eventHandlers: {
            click: (event, view) => {
                if (event.target instanceof Element) {
                    let pluto_variable = event.target.closest("[data-pluto-variable]");
                    if (pluto_variable) {
                        let variable = pluto_variable.getAttribute("data-pluto-variable");
                        if (variable == null) {
                            return false
                        }

                        if (!(has_ctrl_or_cmd_pressed(event) || view.state.readOnly)) {
                            return false
                        }

                        event.preventDefault();
                        let scrollto_selector = `[id='${encodeURI(variable)}']`;
                        document.querySelector(scrollto_selector)?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });

                        // TODO Something fancy where it counts going to definition as a page in history,
                        // .... so pressing/swiping back will go back to where you clicked on the definition.
                        // window.history.replaceState({ scrollTop: document.documentElement.scrollTop }, null)
                        // window.history.pushState({ scrollTo: scrollto_selector }, null)

                        let global_definitions = view.state.facet(GlobalDefinitionsFacet);

                        // TODO Something fancy where we actually emit the identifier we are looking for,
                        // .... and the cell then selects exactly that definition (using lezer and cool stuff)
                        if (global_definitions[variable]) {
                            window.dispatchEvent(
                                new CustomEvent("cell_focus", {
                                    detail: {
                                        cell_id: global_definitions[variable],
                                        line: 0, // 1-based to 0-based index
                                        definition_of: variable,
                                    },
                                })
                            );
                            return true
                        }
                    }

                    let cell_variable = event.target.closest("[data-cell-variable]");
                    if (cell_variable) {
                        let variable_name = cell_variable.getAttribute("data-cell-variable");
                        let variable_from = Number(cell_variable.getAttribute("data-cell-variable-from"));
                        let variable_to = Number(cell_variable.getAttribute("data-cell-variable-to"));

                        if (variable_name == null || variable_from == null || variable_to == null) {
                            return false
                        }

                        if (!(has_ctrl_or_cmd_pressed(event) || view.state.readOnly)) {
                            return false
                        }

                        event.preventDefault();

                        view.dispatch({
                            scrollIntoView: true,
                            selection: { anchor: variable_from, head: variable_to },
                        });
                        view.focus();
                        return true
                    }
                }
            },
        },
    }
);

// @ts-nocheck

const htmlParser = index_es_min_js.htmlLanguage.parser;
// @ts-ignore
const mdParserExt = index_es_min_js.markdownLanguage.parser.configure(index_es_min_js.parseCode({ htmlParser }));
const postgresParser = index_es_min_js.PostgreSQL.language.parser;
const sqlLang = index_es_min_js.sql({ dialect: index_es_min_js.PostgreSQL });
const pythonParser = index_es_min_js.pythonLanguage.parser;

/**
 * Markdown tags list; we create both `md""` and `@md("")` instances.
 */
const MD_TAGS = ["md", "mermaid", "cm", "markdown", "mdx", "mdl", "markdownliteral"].flatMap((x) => [x, `@${x}`]);

/**
 * Julia strings are do not represent the exact code that is going to run
 * for example the following julia string:
 *
 * ```julia
 * """
 * const test = "five"
 * const five = \${test}
 * """
 * ```
 *
 * is going to be executed as javascript, after escaping the \$ to $
 *
 * ```javascript
 * """
 * const test = "five"
 * const five = ${test}
 * """
 * ```
 *
 * The overlays already remove the string interpolation parts of the julia string.
 * This hack additionally removes the `\` from the overlay for common interpolations, so the underlaying parser
 * will get the javascript version of the string, and not the julia version of the string (which is invalid js)
 *
 */
const overlayHack = (overlay, input) => {
    return overlay.flatMap(({ from, to }) => {
        const text = input.read(from, to);
        // const newlines = [...text.matchAll(/\\n/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
        // const escdollars = [...text.matchAll(/\\\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 1 }))
        // const escjuliadollars = [...text.matchAll(/[^\\]\$/g)].map(({ index }) => ({ from: from + index, to: from + index + 2 }))
        // const extraOverlaysNegatives = _.sortBy([...newlines, ...escdollars, ...escjuliadollars], "from")

        // For simplicity I removed the newlines stuff and just removed the \$ from the overlays
        // Curious to see edge cases that this misses - DRAL

        const result = [];
        let last_content_start = from;
        for (let { index: relative_escape_start } of text.matchAll(/\\\$/g)) {
            let next_escape_start = from + relative_escape_start;
            if (last_content_start !== next_escape_start) {
                result.push({ from: last_content_start, to: next_escape_start });
            }
            last_content_start = next_escape_start + 1;
        }
        if (last_content_start !== to) {
            result.push({ from: last_content_start, to: to });
        }
        return result
    })
};

const STRING_NODE_NAMES = new Set(["StringLiteral", "CommandLiteral", "NsStringLiteral", "NsCommandLiteral"]);

const juliaWrapper = index_es_min_js.parseMixed((cursor, input) => {
    if (cursor.name !== "NsStringLiteral" && cursor.name !== "StringLiteral") {
        return null
    }

    const node = cursor.node;
    const first_string_delim = node.getChild('"""') ?? node.getChild('"');
    if (first_string_delim == null) return null
    const last_string_delim = node.lastChild;
    if (last_string_delim == null) return null

    // const offset = first_string_delim.to - first_string_delim.from
    // console.log({ first_string_delim, last_string_delim, offset })
    const string_content_from = first_string_delim.to;
    const string_content_to = Math.min(last_string_delim.from, input.length);

    if (string_content_from >= string_content_to) {
        return null
    }

    let tagNode;
    if (cursor.name === "NsStringLiteral") {
        tagNode = node.firstChild;
        // if (tagNode) tag = input.read(tagNode.from, tagNode.to)
    } else {
        // must be a string, let's search for the parent `@htl`.
        const start = node;
        const p1 = start.parent;
        if (p1 != null && p1.name === "Arguments") {
            const p2 = p1.parent;
            if (p2 != null && p2.name === "MacrocallExpression") {
                tagNode = p2.getChild("MacroIdentifier");
            }
        }
    }

    if (tagNode == null) return null

    const is_macro = tagNode.name === "MacroIdentifier";

    const tag = input.read(tagNode.from, tagNode.to);
    let parser = null;
    if (tag === "@htl" || tag === "html") {
        parser = htmlParser;
    } else if (MD_TAGS.includes(tag)) {
        parser = mdParserExt;
    } else if (tag === "@javascript" || tag === "@js" || tag === "js" || tag === "javascript") {
        parser = index_es_min_js.javascriptLanguage.parser;
    } else if (tag === "py" || tag === "pyr" || tag === "python" || tag === "@python") {
        parser = pythonParser;
    } else if (tag === "sql") {
        parser = postgresParser;
    } else {
        return null
    }

    let overlay = [];
    if (node.firstChild != null) {
        let last_content_start = string_content_from;
        let child = node.firstChild.cursor();

        do {
            if (last_content_start < child.from) {
                overlay.push({ from: last_content_start, to: child.from });
            }
            last_content_start = child.to;
        } while (child.nextSibling())
        if (last_content_start < string_content_to) {
            overlay.push({ from: last_content_start, to: string_content_to });
        }
    } else {
        overlay = [{ from: string_content_from, to: string_content_to }];
    }

    // If it is a macro, thus supports interpolations (prefixed strings only have faux-interpolations) but not raw strings (`\n` will be a newline, for the character `\n` you need to do `\\n`)
    // we need to remove `\$` (which should just be `$` in the javascript)
    if (is_macro) {
        overlay = overlayHack(overlay, input);
    }

    // No overlays for markdown yet
    // (They sometimes work, but sometimes also randomly crash when adding an interpolation
    //  I guess this has something to do with the fact that markdown isn't parsed with lezer,
    //  but has some custom made thing that emulates lezer.)
    if ([...MD_TAGS].includes(tag)) {
        return { parser, overlay: [{ from: string_content_from, to: string_content_to }] }
    }

    return { parser, overlay }
});

const julia_mixed = (config) => {
    const julia_simple = index_es_min_js.julia(config);
    // @ts-ignore
    julia_simple.language.parser = julia_simple.language.parser.configure({ wrap: juliaWrapper });
    return julia_simple
};

let { autocompletion, completionKeymap, completionStatus, acceptCompletion, selectedCompletion } = index_es_min_js.autocomplete;

// These should be imported from  @codemirror/autocomplete, but they are not exported.
const completionState = autocompletion()[1];

/** @param {EditorView} cm */
const tab_completion_command = (cm) => {
    // This will return true if the autocomplete select popup is open
    // To test the exception sink, uncomment these lines:
    // if (Math.random() > 0.7) {
    //     throw "LETS CRASH THIS"
    // }
    if (acceptCompletion(cm)) {
        return true
    }
    if (cm.state.readOnly) {
        return false
    }

    let selection = cm.state.selection.main;
    if (!selection.empty) return false

    let last_char = cm.state.sliceDoc(selection.from - 1, selection.from);
    let last_line = cm.state.sliceDoc(cm.state.doc.lineAt(selection.from).from, selection.from);

    // Some exceptions for when to trigger tab autocomplete
    if ("\t \n=".includes(last_char)) return false
    // ?([1,2], 3)<TAB> should trigger autocomplete
    if (last_char === ")" && !last_line.includes("?")) return false

    return index_es_min_js.autocomplete.startCompletion(cm)
};

// Remove this if we find that people actually need the `?` in their queries, but I very much doubt it.
// (Also because the ternary operator does require a space before the ?, thanks Julia!)
let open_docs_if_autocomplete_is_open_command = (cm) => {
    if (index_es_min_js.autocomplete.completionStatus(cm.state) != null) {
        open_bottom_right_panel("docs");
        return true
    }
    return false
};

const pluto_autocomplete_keymap = [
    { key: "Tab", run: tab_completion_command },
    { key: "?", run: open_docs_if_autocomplete_is_open_command },
];

/**
 * @param {(query: string) => void} on_update_doc_query
 */
let update_docs_from_autocomplete_selection = (on_update_doc_query) => {
    let last_query = null;

    return index_es_min_js.EditorView.updateListener.of((update) => {
        // But we can use `selectedCompletion` to better check if the autocomplete is open
        // (for some reason `autocompletion_state?.open != null` isn't enough anymore?)
        // Sadly we still need `update.state.field(completionState, false)` as well because we can't
        //   apply the result from `selectedCompletion()` yet (has no .from and .to, for example)
        if (selectedCompletion(update.state) == null) return

        let autocompletion_state = update.state.field(completionState, false);
        let open_autocomplete = autocompletion_state?.open;
        if (open_autocomplete == null) return

        let selected_option = open_autocomplete.options[open_autocomplete.selected];
        let text_to_apply = selected_option.completion.apply ?? selected_option.completion.label;
        if (typeof text_to_apply !== "string") return

        // Option.source is now the source, we find to find the corresponding ActiveResult (internal type)
        const active_result = update.view.state.field(completionState).active.find((a) => a.source == selected_option.source);
        if (active_result?.hasResult?.() !== true) return // not an ActiveResult instance

        const from = active_result.from,
            to = Math.min(active_result.to, update.state.doc.length);

        // Apply completion to state, which will yield us a `Transaction`.
        // The nice thing about this is that we can use the resulting state from the transaction,
        // without updating the actual state of the editor.
        // NOTE This could bite someone who isn't familiar with this, but there isn't an easy way to fix it without a lot of console spam:
        // .... THIS UPDATE WILL DO CONSOLE.LOG'S LIKE ANY UPDATE WOULD DO
        // .... Which means you sometimes get double logs from codemirror extensions...
        // .... Very disorienting 😵‍💫
        let result_transaction = update.state.update({
            changes: {
                from,
                to,
                insert: text_to_apply,
            },
        });

        // So we can use `get_selected_doc_from_state` on our virtual state
        let docs_string = get_selected_doc_from_state(result_transaction.state);
        if (docs_string != null) {
            if (last_query != docs_string) {
                last_query = docs_string;
                on_update_doc_query(docs_string);
            }
        }
    })
};

/** Are we matching something like `\lambd...`? */
const match_latex_symbol_complete = (/** @type {autocomplete.CompletionContext} */ ctx) => ctx.matchBefore(/\\[\d\w\!\(\)\+\-\/\:\=\^\_]*/);
/** Are we matching something like `Base.:writing_a_symbo...`? */
const match_operator_symbol_complete = (/** @type {autocomplete.CompletionContext} */ ctx) => ctx.matchBefore(/\.\:[^\s"'`()\[\]\{\}\.\,=]*/);

/** Are we matching inside a string at given pos?
 * @param {EditorState} state
 * @param {number} pos
 * @returns {boolean}
 **/
function match_string_complete(state, pos) {
    const tree = index_es_min_js.syntaxTree(state);
    const node = tree.resolve(pos);
    if (node == null || !STRING_NODE_NAMES.has(node.name)) {
        return false
    }
    return true
}

let override_text_to_apply_in_field_expression = (text) => {
    return !/^[@\p{L}\p{Sc}\d_][\p{L}\p{Nl}\p{Sc}\d_!]*"?$/u.test(text) ? (text === ":" ? `:(${text})` : `:${text}`) : null
};

const section_regular = {
    name: "Suggestions",
    header: () => document.createElement("div"),
    rank: 0,
};

const section_operators = {
    name: "Operators",
    rank: 1,
};

const field_rank_heuristic = (text, is_exported) => is_exported * 3 + (/^\p{Ll}/u.test(text) ? 2 : /^\p{Lu}/u.test(text) ? 1 : 0);

const julia_commit_characters = (/** @type {autocomplete.CompletionContext} */ ctx) => {
    return ["."]
};
const validFor = (/** @type {string} */ text) => {
    let expected_char = /[\p{L}\p{Nl}\p{Sc}\d_!]*$/u.test(text);

    return expected_char && !endswith_keyword_regex.test(text)
};

const not_explicit_and_too_boring = (/** @type {autocomplete.CompletionContext} */ ctx, allow_strings = false) => {
    if (ctx.explicit) return false
    if (ctx.matchBefore(/[ =)+-/,*:'"]$/)) return true
    if (ctx.tokenBefore(["IntegerLiteral", "FloatLiteral", "LineComment", "BlockComment", "Symbol"]) != null) return true
    if (!allow_strings) {
        if (ctx.tokenBefore([...STRING_NODE_NAMES]) != null) {
            // don't complete inside a string, unless the user is doing string interpolation.
            if (ctx.matchBefore(/\$[(\p{L}\p{Nl}\p{Sc}\d_!]$/u) == null) {
                return true
            }
        }
    }
    return false
};

/** Use the completion results from the Julia server to create CM completion objects. */
const julia_code_completions_to_cm =
    (/** @type {PlutoRequestAutocomplete} */ request_autocomplete) =>
    /** @returns {Promise<autocomplete.CompletionResult?>} */
    async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        if (match_latex_symbol_complete(ctx)) return null
        if (!ctx.explicit && writing_variable_name_or_keyword(ctx)) return null
        if (not_explicit_and_too_boring(ctx)) return null

        let to_complete_full = /** @type {String} */ (ctx.state.sliceDoc(0, ctx.pos));
        let to_complete = to_complete_full;

        // Another rough hack... If it detects a `.:`, we want to cut out the `:` so we get all results from julia,
        // but then codemirror will put the `:` back in filtering
        let is_symbol_completion = match_operator_symbol_complete(ctx);
        if (is_symbol_completion) {
            to_complete = to_complete.slice(0, is_symbol_completion.from + 1) + to_complete.slice(is_symbol_completion.from + 2);
        } else {
            // Generalized logic: send up to and including the last non-variable character
            // (not matching /[\p{L}\p{Nl}\p{Sc}\d_!]/u)
            const match = to_complete.match(/[\p{L}\p{Nl}\p{Sc}\d_!]*$/u);
            if (match && match[0].length < to_complete.length) {
                to_complete = to_complete.slice(0, to_complete.length - match[0].length);
            } else {
                to_complete = "";
            }
        }

        const globals = ctx.state.facet(GlobalDefinitionsFacet);
        const is_already_a_global = (text) => {
            const val = text != null && Object.keys(globals).includes(text);
            // console.log("is_already_a_global", text, val)
            return val
        };

        let found = await request_autocomplete({ query: to_complete, query_full: to_complete_full });

        // console.log("received autocomplete results", { query: to_complete, query_full: to_complete_full }, found)
        if (!found) return null
        let { start, stop, results, too_long } = found;

        if (is_symbol_completion) {
            // If this is a symbol completion thing, we need to add the `:` back in by moving the end a bit furher
            stop = stop + 1;
        }

        const to_complete_onto = to_complete.slice(0, start);
        const is_field_expression = to_complete_onto.endsWith(".");

        // skip autocomplete's filter if we are completing a ~ path (userexpand)
        const skip_filter = ctx.matchBefore(/\~[^\s\"]*/) != null;

        const result = {
            from: start,
            to: ctx.pos,

            // This tells codemirror to not query this function again as long as the string matches the regex.

            // If the number of results was too long, then typing more should re-query (to be able to find results that were cut off)
            validFor: too_long ? undefined : validFor,

            commitCharacters: julia_commit_characters(),
            filter: !skip_filter,

            options: [
                ...results
                    .filter(
                        ([text, _1, _2, is_from_notebook, completion_type]) =>
                            (ctx.explicit || completion_type != "path") && (ctx.explicit || completion_type != "method") && !is_already_a_global(text)
                    )
                    .map(([text, value_type, is_exported, is_from_notebook, completion_type, _ignored], i) => {
                        // (quick) fix for identifiers that need to be escaped
                        // Ideally this is done with Meta.isoperator on the julia side
                        let text_to_apply =
                            completion_type === "method" ? to_complete : is_field_expression ? override_text_to_apply_in_field_expression(text) ?? text : text;

                        value_type = value_type === "Function" && text.startsWith("@") ? "Macro" : value_type;

                        return {
                            label: text,
                            apply: text_to_apply,
                            type:
                                cl({
                                    c_notexported: !is_exported,
                                    [`c_${value_type}`]: true,
                                    [`completion_${completion_type}`]: true,
                                    c_from_notebook: is_from_notebook,
                                }) ?? undefined,
                            section: section_regular,
                            // detail: completion_type,
                            boost:
                                completion_type === "keyword_argument" ? 7 : is_field_expression ? field_rank_heuristic(text_to_apply, is_exported) : undefined,
                            // boost: 50 - i / results.length,
                            commitCharacters: completion_type === "keyword_argument" || value_type === "Macro" ? [] : undefined,
                        }
                    }),
                // This is a small thing that I really want:
                // You want to see what fancy symbols a module has? Pluto will show these at the very end of the list,
                // for Base there is no way you're going to find them! With this you can type `.:` and see all the fancy symbols.
                // TODO This whole block shouldn't use `override_text_to_apply_in_field_expression` but the same
                //      `Meta.isoperator` thing mentioned above
                ...results
                    .filter(([text]) => is_field_expression && override_text_to_apply_in_field_expression(text) != null)
                    .map(([text, value_type, is_exported], i) => {
                        let text_to_apply = override_text_to_apply_in_field_expression(text) ?? "";

                        return {
                            label: text_to_apply,
                            apply: text_to_apply,
                            type: (is_exported ? "" : "c_notexported ") + (value_type == null ? "" : "c_" + value_type),
                            // boost: -99 - i / results.length, // Display below all normal results
                            section: section_operators,
                            // Non-standard
                            is_not_exported: !is_exported,
                        }
                    }),
            ],
        };

        // console.log("cm completion result", result)

        return result
    };

const from_notebook_type = "c_from_notebook completion_module c_Any";

/**
 * Are we currently writing a variable name? In that case we don't want autocomplete.
 *
 * E.g. `const hel<TAB>` should not autocomplete.
 */
const writing_variable_name_or_keyword = (/** @type {autocomplete.CompletionContext} */ ctx) => {
    let just_finished_a_keyword = ctx.matchBefore(endswith_keyword_regex);
    if (just_finished_a_keyword) return true

    // Regex explaination:
    // 1. a keyword that could be followed by a variable name like `catch ex` where `ex` is a variable name that should not get completed
    // 2. a space
    // 3. a sequence of either:
    // 3a. a variable name character `@\p{L}\p{Nl}\p{Sc}\d_!`. Also allowed is a bracket or a comma, this is to handle multiple vars `const (a,b)`.
    // 3b. a `, ` comma-space, to treat `const a, b` but not `for a in
    // 4. a `$` to match the end of the line
    let after_keyword = ctx.matchBefore(/(catch|local|module|abstract type|struct|macro|const|for|function|let|do) ([@\p{L}\p{Nl}\p{Sc}\d_!,\(\)]|, )*$/u);
    if (after_keyword) return true

    let inside_do_argument_expression = ctx.matchBefore(/do [\(\), \p{L}\p{Nl}\p{Sc}\d_!]*$/u);
    if (inside_do_argument_expression) return true

    let node = index_es_min_js.syntaxTree(ctx.state).resolve(ctx.pos, -1);
    let npn = node?.parent?.name;
    if (node?.name === "Identifier" && npn === "StructDefinition") return true
    if (node?.name === "Identifier" && npn === "KeywordArguments") return true

    let node2 = npn === "OpenTuple" || npn === "TupleExpression" ? node?.parent : node;
    let n2pn = node2?.parent?.name;
    let inside_assigment_lhs = node?.name === "Identifier" && (n2pn === "Assignment" || n2pn === "KwArg") && node2?.nextSibling != null;

    if (inside_assigment_lhs) return true
    return false
};

const global_variables_completion =
    (/** @type {() => { [uuid: String]: String[]}} */ request_unsubmitted_global_definitions, cell_id) =>
    /** @returns {Promise<autocomplete.CompletionResult?>} */
    async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        if (ctx.matchBefore(/[(\p{L}\p{Nl}\p{Sc}\d_!]$/u) == null) return null
        if (match_latex_symbol_complete(ctx)) return null
        if (!ctx.explicit && writing_variable_name_or_keyword(ctx)) return null
        if (not_explicit_and_too_boring(ctx)) return null

        // see `is_wc_cat_id_start` in Julia's source for a complete list
        const there_is_a_dot_before = ctx.matchBefore(/\.[\p{L}\p{Nl}\p{Sc}\d_!]*$/u);
        if (there_is_a_dot_before) return null

        const globals = ctx.state.facet(GlobalDefinitionsFacet);
        const local_globals = request_unsubmitted_global_definitions();

        const possibles = _.union(
            // Globals that are not redefined locally
            Object.entries(globals)
                .filter(([_, cell_id]) => local_globals[cell_id] == null)
                .map(([name]) => name),
            // Globals that are redefined locally in other cells
            ...Object.values(_.omit(local_globals, cell_id))
        );

        return await make_it_julian(
            index_es_min_js.autocomplete.completeFromList(
                possibles.map((label) => {
                    return {
                        label,
                        apply: label,
                        type: from_notebook_type,
                        section: section_regular,
                        boost: 1,
                    }
                })
            )
        )(ctx)
    };

/** @returns {autocomplete.CompletionSource} */
const make_it_julian = (/** @type {autocomplete.CompletionSource} */ source) => (/** @type {autocomplete.CompletionContext} */ ctx) => {
    const c = source(ctx);
    return c == null
        ? null
        : {
              ...c,
              validFor,
              commitCharacters: julia_commit_characters(),
          }
};

// Get this list with
// import REPL; REPL.REPLCompletions.sorted_keywords ∪ REPL.REPLCompletions.sorted_keyvals |> repr |> clipboard
const sorted_keywords = [
    "abstract type",
    "baremodule",
    "begin",
    "break",
    "catch",
    "ccall",
    "const",
    "continue",
    "do",
    "else",
    "elseif",
    "end",
    "export",
    "finally",
    "for",
    "function",
    "global",
    "if",
    "import",
    "let",
    "local",
    "macro",
    "module",
    "mutable struct",
    "primitive type",
    "quote",
    "return",
    "struct",
    "try",
    "using",
    "while",
    "false",
    "true",
];

// Get this list with
// join(map(d -> split(d, " ")[end], REPL.REPLCompletions.sorted_keywords ∪ REPL.REPLCompletions.sorted_keyvals) |> unique |> sort, "|")
const endswith_keyword_regex =
    /^(.*\s)?(baremodule|begin|break|catch|ccall|const|continue|do|else|elseif|end|export|false|finally|for|function|global|if|import|let|local|macro|module|quote|return|struct|true|try|type|using|while)$/;

const keyword_completions = sorted_keywords.map((label) => ({
    label,
    apply: label,
    type: "completion_keyword",
    section: section_regular,
}));
const keyword_completions_generator = make_it_julian(index_es_min_js.autocomplete.completeFromList(keyword_completions));

const complete_keyword = async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    if (
        // require a space or bracket-open before the keyword,
        ctx.matchBefore(/[\s\(\[][a-z]*$/) == null &&
        // or a line start
        ctx.matchBefore(/^[a-z]*$/) == null
    )
        return null
    if (match_latex_symbol_complete(ctx)) return null
    if (!ctx.explicit && writing_variable_name_or_keyword(ctx)) return null
    if (not_explicit_and_too_boring(ctx)) return null
    return await keyword_completions_generator(ctx)
};

const complete_package_name = (/** @type {() => Promise<string[]>} */ request_packages) => {
    let found = null;

    const get_packages = async () => {
        if (found == null) {
            const data = await request_packages().catch((e) => {
                console.warn("Failed to fetch packages", e);
                return null
            });
            if (data == null) return null
            found = data.map((name, i) => ({
                label: name,
                apply: name,
                type: "c_package",
            }));
        }
        return found
    };

    return async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        // space before the package name to only find remote packages
        if (ctx.matchBefore(/[ ,][a-zA-Z0-9]+$/) == null) return null
        if (ctx.tokenBefore(["Identifier"]) == null) return null

        const tree = index_es_min_js.syntaxTree(ctx.state);
        const node = tree.resolve(ctx.pos, -1);
        if (!(node.matchContext(["UsingStatement", "ImportPath"]) || node.matchContext(["ImportStatement", "ImportPath"]))) return null

        const packages = await get_packages();
        return await make_it_julian(index_es_min_js.autocomplete.completeFromList(packages))(ctx)
    }
};

const local_variables_completion = async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    let scopestate = ctx.state.field(ScopeStateField);
    let identifier = ctx.tokenBefore(["Identifier"]);
    if (identifier == null) return null

    let { from, to } = identifier;

    const possibles = scopestate.locals
        .filter(({ validity }) => from > validity.from && to <= validity.to)
        .map(({ name }, i) => ({
            // See https://github.com/codemirror/codemirror.next/issues/788 about `type: null`
            label: name,
            apply: name,
            type: undefined,
            boost: 99 - i,
        }));

    return await make_it_julian(index_es_min_js.autocomplete.completeFromList(possibles))(ctx)
};
const special_latex_examples = ["\\sqrt", "\\pi", "\\approx"];
const special_emoji_examples = ["🐶", "🐱", "🐭", "🐰", "🐼", "🐨", "🐸", "🐔", "🐧"];

/** Apply completion to detail when completion is equal to detail
 * https://codemirror.net/docs/ref/#autocomplete.Completion.apply
 * Example:
 * For latex completions, if inside string only complete to label unless label is already fully typed.
 * \lamb<tab> -> λ
 * "\lamb<tab>" -> "\lambda"
 * "\lambda<tab>" -> "λ"
 * For emojis, we always complete to detail:
 * \:cat:<tab> -> 🐱
 * "\:ca" -> 🐱
 * @param {EditorView} view
 * @param {autocomplete.Completion} completion
 * @param {number} from
 * @param {number} to
 * */
const apply_completion = (view, completion, from, to) => {
    const currentComp = view.state.sliceDoc(from, to);

    let insert = completion.detail ?? completion.label;
    const is_emoji = completion.label.startsWith("\\:");
    if (!is_emoji && currentComp !== completion.label) {
        const is_inside_string = match_string_complete(view.state, to);
        if (is_inside_string) {
            insert = completion.label;
        }
    }

    view.dispatch({
        ...index_es_min_js.autocomplete.insertCompletionText(view.state, insert, from, to),
        annotations: index_es_min_js.autocomplete.pickedCompletion.of(completion),
    });
};

const special_symbols_completion = (/** @type {() => Promise<SpecialSymbols?>} */ request_special_symbols) => {
    let list = null;
    const get_list = () => {
        if (list == null) {
            list = request_special_symbols().then((data) => {
                if (data != null) {
                    const { latex, emoji } = data;
                    return [emoji, latex].flatMap((map) =>
                        Object.entries(map).map(([label, value]) => {
                            return {
                                label,
                                apply: apply_completion,
                                detail: value ?? undefined,
                                type: "c_special_symbol",
                                boost: label === "\\in" ? 3 : special_latex_examples.includes(label) ? 2 : special_emoji_examples.includes(value) ? 1 : 0,
                            }
                        })
                    )
                }
            });
        }
        return list
    };

    return async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        if (!match_latex_symbol_complete(ctx)) return null
        if (!ctx.explicit && writing_variable_name_or_keyword(ctx)) return null
        if (not_explicit_and_too_boring(ctx, true)) return null
        return await index_es_min_js.autocomplete.completeFromList((await get_list()) ?? [])(ctx)
    }
};

const superscript_subscript_completion = () => {
    const match_sup = new RegExp(
        `\\\\\\\^([${Object.keys(sup_charmap)
            .map((x) => (x.match(/[\w\d]/) ? x : `\\${x}`))
            .join("")}]{2,})$`
    );
    const match_sub = new RegExp(
        `\\\\\\\_([${Object.keys(sub_charmap)
            .map((x) => (x.match(/[\w\d]/) ? x : `\\${x}`))
            .join("")}]{2,})$`
    );

    return (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const sup_match_result = ctx.matchBefore(match_sup);
        const sub_match_result = ctx.matchBefore(match_sub);

        let match_result = sup_match_result ?? sub_match_result;
        let dict = sup_match_result != null ? sup_charmap : sub_charmap;

        if (match_result) {
            const { text, from, to } = match_result;
            const todo = text.slice(2);
            const result = [...todo].map((char) => dict[char] ?? "").join("");
            return {
                from,
                to,
                filter: false,
                options: [
                    {
                        label: text,
                        apply: apply_completion,
                        detail: result ?? undefined,
                        type: "c_special_symbol",
                        boost: -1,
                    },
                ],
            }
        }
        return null
    }
};

/**
 *
 * @typedef PlutoAutocompleteResult
 * @type {[
 * text: string,
 * value_type: string,
 * is_exported: boolean,
 * is_from_notebook: boolean,
 * completion_type: string,
 * special_symbol: string | null,
 * ]}
 *
 * @typedef PlutoAutocompleteResults
 * @type {{ start: number, stop: number, results: Array<PlutoAutocompleteResult>, too_long: boolean }}
 *
 * @typedef PlutoRequestAutocomplete
 * @type {(options: { query: string, query_full?: string }) => Promise<PlutoAutocompleteResults?>}
 *
 * @typedef SpecialSymbols
 * @type {{emoji: Record<string, string>, latex: Record<string, string>}}
 */

/**
 * @param {object} props
 * @param {PlutoRequestAutocomplete} props.request_autocomplete
 * @param {() => Promise<SpecialSymbols?>} props.request_special_symbols
 * @param {() => Promise<string[]>} props.request_packages
 * @param {(query: string) => void} props.on_update_doc_query
 * @param {() => { [uuid: string] : String[]}} props.request_unsubmitted_global_definitions
 * @param {string} props.cell_id
 */
let pluto_autocomplete = ({
    request_autocomplete,
    request_special_symbols,
    request_packages,
    on_update_doc_query,
    request_unsubmitted_global_definitions,
    cell_id,
}) => {
    let last_query = null;
    let last_result = null;
    /**
     * To make stuff a bit easier, we let all the generators fetch all the time and run their logic, but just do one request.
     * Previously I had checks to make sure when `unicode_hint_generator` matches it wouldn't fetch in `julia_code_completions_to_cm`..
     * but that became cumbersome with `expanduser` autocomplete.. also because THERE MIGHT be a case where
     * `~/` actually needs a different completion? Idk, I decided to put this "memoize last" thing here deal with it.
     * @type {PlutoRequestAutocomplete}
     **/
    let memoize_last_request_autocomplete = async (options) => {
        if (_.isEqual(options, last_query)) {
            let result = await last_result;
            if (result != null) return result
        }

        last_query = options;
        last_result = request_autocomplete(options);
        return await last_result
    };

    /** @type {Promise<SpecialSymbols | null>?} */
    let special_symbols_result = null;
    const get_special_symbols_debounced = () => {
        if (special_symbols_result == null) {
            special_symbols_result = request_special_symbols().catch((e) => {
                console.warn("Failed to fetch special symbols", e);
                return null
            });
        }
        return special_symbols_result
    };

    return [
        autocompletion({
            activateOnTyping: ENABLE_CM_AUTOCOMPLETE_ON_TYPE,
            override: [
                global_variables_completion(request_unsubmitted_global_definitions, cell_id),
                special_symbols_completion(get_special_symbols_debounced),
                superscript_subscript_completion(),
                julia_code_completions_to_cm(memoize_last_request_autocomplete),
                complete_keyword,
                complete_package_name(request_packages),
                // complete_anyword,
                local_variables_completion,
            ],
            defaultKeymap: false, // We add these manually later, so we can override them if necessary
            maxRenderedOptions: 512, // fons's magic number
            optionClass: (c) => c.type ?? "",
        }),

        update_docs_from_autocomplete_selection(on_update_doc_query),

        index_es_min_js.keymap.of(pluto_autocomplete_keymap),
        index_es_min_js.keymap.of(completionKeymap),
    ]
};

const loading_times_url = `https://julia-loading-times-test.netlify.app/pkg_load_times.csv`;
const package_list_url = `https://julia-loading-times-test.netlify.app/top_packages_sorted_with_deps.txt`;

/** @typedef {{ install: Number, precompile: Number, load: Number }} LoadingTime */

/**
 * @typedef PackageTimingData
 * @type {{
 *  times: Map<String,LoadingTime>,
 *  packages: Map<String,String[]>,
 * }}
 */

/** @type {{ current: Promise<PackageTimingData>? }} */
const data_promise_ref = { current: null };

const get_data = () => {
    if (data_promise_ref.current != null) {
        return data_promise_ref.current
    } else {
        const times_p = fetch(loading_times_url)
            .then((res) => res.text())
            .then((text) => {
                const lines = text.split("\n");
                lines[0].split(",");
                return new Map(
                    lines.slice(1).map((line) => {
                        let [pkg, ...times] = line.split(",");

                        return [pkg, { install: Number(times[0]), precompile: Number(times[1]), load: Number(times[2]) }]
                    })
                )
            });

        const packages_p = fetch(package_list_url)
            .then((res) => res.text())
            .then(
                (text) =>
                    new Map(
                        text.split("\n").map((line) => {
                            let [pkg, ...deps] = line.split(",");
                            return [pkg, deps]
                        })
                    )
            );

        data_promise_ref.current = Promise.all([times_p, packages_p]).then(([times, packages]) => ({ times, packages }));

        return data_promise_ref.current
    }
};

const usePackageTimingData = () => {
    const [data, set_data] = hooks_pin_v113_target_es2020.useState(/** @type {PackageTimingData?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        get_data().then(set_data);
    }, []);

    return data
};

const recursive_deps = (/** @type {PackageTimingData} */ data, /** @type {string} */ pkg, found = []) => {
    const deps = data.packages.get(pkg);
    if (deps == null) {
        return []
    } else {
        const newfound = _.union(found, deps);
        return [...deps, ..._.difference(deps, found).flatMap((dep) => recursive_deps(data, dep, newfound))]
    }
};

const time_estimate = (/** @type {PackageTimingData} */ data, /** @type {string[]} */ packages) => {
    let deps = packages.flatMap((pkg) => recursive_deps(data, pkg));
    let times = _.uniq([...packages, ...deps])
        .map((pkg) => data.times.get(pkg))
        .filter((x) => x != null);

    let sum = (xs) => xs.reduce((acc, x) => acc + (x == null || isNaN(x) ? 0 : x), 0);

    return {
        install: sum(times.map(_.property("install"))) * timing_weights.install,
        precompile: sum(times.map(_.property("precompile"))) * timing_weights.precompile,
        load: sum(times.map(_.property("load"))) * timing_weights.load,
    }
};

const timing_weights = {
    // Because the GitHub Action runner has superfast internet
    install: 2,
    // Because the GitHub Action runner has average compute speed
    load: 1,
    // Because precompilation happens in parallel
    precompile: 0.3,
};

//@ts-ignore

/**
 * @returns {[import("../imports/Preact.js").Ref<HTMLDialogElement?>, () => void, () => void, () => void]}
 */
const useDialog = () => {
    const dialog_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLDialogElement?} */ (null));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (dialog_ref.current != null && typeof HTMLDialogElement !== "function") dialogPolyfill.registerDialog(dialog_ref.current);
    }, [dialog_ref.current]);

    return hooks_pin_v113_target_es2020.useMemo(() => {
        const open = () => {
            if (!dialog_ref.current?.open) dialog_ref.current?.showModal();
        };
        const close = () => {
            if (dialog_ref.current?.open === true) dialog_ref.current?.close?.();
        };
        const toggle = () => (dialog_ref.current?.open === true ? dialog_ref.current?.close?.() : dialog_ref.current?.showModal?.());

        return [dialog_ref, open, close, toggle]
    }, [dialog_ref])
};

const RunLocalButton = ({ show, start_local }) => {
    //@ts-ignore
    window.open_edit_or_run_popup = () => {
        start_local();
    };

    return html`<div class="edit_or_run">
        <button
            onClick=${(e) => {
                e.stopPropagation();
                e.preventDefault();
                start_local();
            }}
        >
            <b>Edit</b> or <b>run</b> this notebook
        </button>
    </div>`
};

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  notebookfile: string?,
 *  start_binder: () => Promise<void>,
 *  offer_binder: boolean,
 * }} props
 * */
const BinderButton = ({ offer_binder, start_binder, notebookfile, notebook }) => {
    const [dialog_ref, openModal, closeModal, toggleModal] = useDialog();

    const [showCopyPopup, setShowCopyPopup] = hooks_pin_v113_target_es2020.useState(false);
    const notebookfile_ref = hooks_pin_v113_target_es2020.useRef("");
    notebookfile_ref.current = notebookfile ?? "";

    //@ts-ignore
    window.open_edit_or_run_popup = openModal;

    hooks_pin_v113_target_es2020.useEffect(() => {
        //@ts-ignore
        // allow user-written JS to start the binder
        window.start_binder = offer_binder ? start_binder : null;
        return () => {
            //@ts-ignore
            window.start_binder = null;
        }
    }, [start_binder, offer_binder]);

    const recommend_download = notebookfile_ref.current.startsWith("data:");
    const runtime_str = expected_runtime_str(notebook);

    return html`<div class="edit_or_run">
        <button
            onClick=${(e) => {
                toggleModal();
                e.stopPropagation();
                e.preventDefault();
            }}
        >
            <b>Edit</b> or <b>run</b> this notebook
        </button>
        <dialog ref=${dialog_ref} class="binder_help_text">
            <span onClick=${closeModal} class="close"></span>
            ${offer_binder
                ? html`
                      <p style="text-align: center;">
                          ${`To be able to edit code and run cells, you need to run the notebook yourself. `}
                          <b>Where would you like to run the notebook?</b>
                      </p>
                      ${runtime_str == null
                          ? null
                          : html` <div class="expected_runtime_box">${`This notebook takes about `}<span>${runtime_str}</span>${` to run.`}</div>`}
                      <h2 style="margin-top: 3em;">In the cloud <em>(experimental)</em></h2>
                      <div style="padding: 0 2rem;">
                          <button onClick=${start_binder}>
                              <img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />
                          </button>
                      </div>
                      <p style="opacity: .5; margin: 20px 10px;">
                          <a target="_blank" href="https://mybinder.org/">Binder</a> is a free, open source service that runs scientific notebooks in the cloud!
                          It will take a while, usually 2-7 minutes to get a session.
                      </p>
                      <h2 style="margin-top: 4em;">On your computer</h2>
                      <p style="opacity: .5;">(Recommended if you want to store your changes.)</p>
                  `
                : null}
            <ol style="padding: 0 2rem;">
                <li>
                    <div>
                        ${recommend_download
                            ? html`
                                  <div class="command">Download the notebook:</div>
                                  <div
                                      onClick=${(e) => {
                                          e.target.tagName === "A" || e.target.closest("div").firstElementChild.click();
                                      }}
                                      class="download_div"
                                  >
                                      <a href=${notebookfile_ref.current} target="_blank" download="notebook.jl">notebook.jl</a>
                                      <span class="download_icon"></span>
                                  </div>
                              `
                            : html`
                                  <div class="command">Copy the notebook URL:</div>
                                  <div class="copy_div">
                                      <input onClick=${(e) => e.target.select()} value=${notebookfile_ref.current} readonly />
                                      <span
                                          class=${`copy_icon ${showCopyPopup ? "success_copy" : ""}`}
                                          onClick=${async () => {
                                              await navigator.clipboard.writeText(notebookfile_ref.current);
                                              setShowCopyPopup(true);
                                              setTimeout(() => setShowCopyPopup(false), 3000);
                                          }}
                                      />
                                  </div>
                              `}
                    </div>
                </li>
                <li>
                    <div class="command">Run Pluto</div>
                    <p>
                        ${"(Also see: "}
                        <a target="_blank" href="https://plutojl.org/#install">How to install Julia and Pluto</a>)
                    </p>
                    <img src="https://user-images.githubusercontent.com/6933510/107865594-60864b00-6e68-11eb-9625-2d11fd608e7b.png" />
                </li>
                <li>
                    ${recommend_download
                        ? html`
                              <div class="command">Open the notebook file</div>
                              <p>Type the saved filename in the <em>open</em> box.</p>
                              <img src="https://user-images.githubusercontent.com/6933510/119374043-65556900-bcb9-11eb-9026-149c1ba2d05b.png" />
                          `
                        : html`
                              <div class="command">Paste URL in the <em>Open</em> box</div>
                              <video playsinline autoplay loop src="https://i.imgur.com/wf60p5c.mp4" />
                          `}
                </li>
            </ol>
        </dialog>
    </div>`
};

const expected_runtime = (/** @type {import("./Editor.js").NotebookData} */ notebook) => {
    return ((notebook.nbpkg?.install_time_ns ?? NaN) + _.sum(Object.values(notebook.cell_results).map((c) => c.runtime ?? 0))) / 1e9
};

const runtime_overhead = 15; // seconds
const runtime_multiplier = 1.5;

const expected_runtime_str = (/** @type {import("./Editor.js").NotebookData} */ notebook) => {
    const ex = expected_runtime(notebook);
    if (isNaN(ex)) {
        return null
    }

    const sec = _.round(runtime_overhead + ex * runtime_multiplier, -1);
    return pretty_long_time(sec)
};

const pretty_long_time = (/** @type {number} */ sec) => {
    const min = sec / 60;
    const sec_r = Math.ceil(sec);
    const min_r = Math.round(min);

    if (sec < 60) {
        return `${sec_r} second${sec_r > 1 ? "s" : ""}`
    } else {
        return `${min_r} minute${min_r > 1 ? "s" : ""}`
    }
};

/**
 * Get a `<link rel="pluto-external-source">` element from editor.html.
 * @param {String} id
 * @returns {HTMLLinkElement?}
 */
const get_included_external_source = (id) => document.head.querySelector(`link[rel='pluto-external-source'][id='${id}']`);

const arrow_up_circle_icon = get_included_external_source("arrow_up_circle_icon")?.href;
const document_text_icon = get_included_external_source("document_text_icon")?.href;
const help_circle_icon = get_included_external_source("help_circle_icon")?.href;
get_included_external_source("open_icon")?.href;

/**
 * @typedef PkgPopupDetails
 * @property {"nbpkg"} type
 * @property {HTMLElement} [source_element]
 * @property {Boolean} [big]
 * @property {string} [css_class]
 * @property {Boolean} [should_focus] Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
 * @property {string} package_name
 * @property {boolean} is_disable_pkg
 */

/**
 * @typedef MiscPopupDetails
 * @property {"info" | "warn"} type
 * @property {import("../imports/Preact.js").ReactElement} body
 * @property {HTMLElement?} [source_element]
 * @property {string} [css_class]
 * @property {Boolean} [big]
 * @property {Boolean} [should_focus] Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
 */

const Popup = ({ notebook, disable_input }) => {
    const [recent_event, set_recent_event] = hooks_pin_v113_target_es2020.useState(/** @type{(PkgPopupDetails | MiscPopupDetails)?} */ (null));
    const recent_event_ref = hooks_pin_v113_target_es2020.useRef(/** @type{(PkgPopupDetails | MiscPopupDetails)?} */ (null));
    recent_event_ref.current = recent_event;
    const recent_source_element_ref = hooks_pin_v113_target_es2020.useRef(/** @type{HTMLElement?} */ (null));
    const pos_ref = hooks_pin_v113_target_es2020.useRef("");

    const open = hooks_pin_v113_target_es2020.useCallback(
        (/** @type {CustomEvent} */ e) => {
            const el = e.detail.source_element;
            recent_source_element_ref.current = el;

            if (el == null) {
                pos_ref.current = `top: 20%; left: 50%; transform: translate(-50%, -50%); position: fixed;`;
            } else {
                const elb = el.getBoundingClientRect();
                const bodyb = document.body.getBoundingClientRect();

                pos_ref.current = `top: ${0.5 * (elb.top + elb.bottom) - bodyb.top}px; left: min(max(0px,100vw - 251px - 30px), ${elb.right - bodyb.left}px);`;
            }

            set_recent_event(e.detail);
        },
        [set_recent_event]
    );

    const close = hooks_pin_v113_target_es2020.useCallback(() => {
        set_recent_event(null);
    }, [set_recent_event]);

    useEventListener(window, "open pluto popup", open, [open]);
    useEventListener(window, "close pluto popup", close, [close]);
    useEventListener(
        window,
        "pointerdown",
        (e) => {
            if (recent_event_ref.current == null) return
            if (e.target == null) return
            if (e.target.closest("pluto-popup") != null) return
            if (recent_source_element_ref.current != null && recent_source_element_ref.current.contains(e.target)) return

            close();
        },
        [close]
    );
    useEventListener(
        window,
        "keydown",
        (e) => {
            if (e.key === "Escape") close();
        },
        [close]
    );

    // focus the popup when it opens
    const element_focused_before_popup = hooks_pin_v113_target_es2020.useRef(/** @type {any} */ (null));
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (recent_event != null) {
            if (recent_event.should_focus === true) {
                requestAnimationFrame(() => {
                    element_focused_before_popup.current = document.activeElement;
                    /** @type {HTMLElement?} */
                    const el = element_ref.current?.querySelector("a, input, button") ?? element_ref.current;
                    // console.debug("restoring focus to", el)
                    el?.focus?.();
                });
            } else {
                element_focused_before_popup.current = null;
            }
        }
    }, [recent_event != null]);

    const element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    // if the popup was focused on opening:
    // when the popup loses focus (and the focus did not move to the source element):
    // 1. close the popup
    // 2. return focus to the element that was focused before the popup opened
    useEventListener(
        element_ref.current,
        "focusout",
        (e) => {
            if (recent_event_ref.current != null && recent_event_ref.current.should_focus === true) {
                if (element_ref.current?.matches(":focus-within")) return
                if (element_ref.current?.contains(e.relatedTarget)) return

                if (
                    recent_source_element_ref.current != null &&
                    (recent_source_element_ref.current.contains(e.relatedTarget) || recent_source_element_ref.current.matches(":focus-within"))
                )
                    return
                close();
                e.preventDefault();
                element_focused_before_popup.current?.focus?.();
            }
        },
        [close]
    );

    const type = recent_event?.type;
    return html`<pluto-popup
            class=${cl({
                visible: recent_event != null,
                [type ?? ""]: type != null,
                big: recent_event?.big === true,
                [recent_event?.css_class ?? ""]: recent_event?.css_class != null,
            })}
            style="${pos_ref.current}"
            ref=${element_ref}
            tabindex=${
                "0" /* this makes the popup itself focusable (not just its buttons), just like a <dialog> element. It also makes the `.matches(":focus-within")` trick work. */
            }
        >
            ${type === "nbpkg"
                ? html`<${PkgPopup}
                      notebook=${notebook}
                      disable_input=${disable_input}
                      recent_event=${recent_event}
                      clear_recent_event=${() => set_recent_event(null)}
                  />`
                : type === "info" || type === "warn"
                ? html`<div>${recent_event?.body}</div>`
                : null}
        </pluto-popup>
        <div tabindex="0">
            <!-- We need this dummy tabindexable element here so that the element_focused_before_popup mechanism works on static exports. When tabbing out of the popup, focus would otherwise leave the page altogether because it's the last focusable element in DOM. -->
        </div>`
};

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * recent_event: PkgPopupDetails,
 * clear_recent_event: () => void,
 * disable_input: boolean,
 * }} props
 */
const PkgPopup = ({ notebook, recent_event, clear_recent_event, disable_input }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const [pkg_status, set_pkg_status] = hooks_pin_v113_target_es2020.useState(/** @type{import("./PkgStatusMark.js").PackageStatus?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        let still_valid = true;
        if (recent_event == null) {
            set_pkg_status(null);
        } else if (recent_event?.type === "nbpkg") {
(pluto_actions.get_avaible_versions({ package_name: recent_event.package_name, notebook_id: notebook.notebook_id }) ?? Promise.resolve([])).then(
                ({ versions, url }) => {
                    if (still_valid) {
                        set_pkg_status(
                            package_status({
                                nbpkg: notebook.nbpkg,
                                package_name: recent_event.package_name,
                                is_disable_pkg: recent_event.is_disable_pkg,
                                available_versions: versions,
                                package_url: url,
                            })
                        );
                    }
                }
            );
        }
        return () => {
            still_valid = false;
        }
    }, [recent_event, ...nbpkg_fingerprint_without_terminal(notebook.nbpkg)]);

    // hide popup when nbpkg is switched on/off
    const valid = recent_event.is_disable_pkg || (notebook.nbpkg?.enabled ?? true);
    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!valid) {
            clear_recent_event();
        }
    }, [valid]);

    const [showterminal, set_showterminal] = hooks_pin_v113_target_es2020.useState(false);

    const needs_first_instatiation = notebook.nbpkg?.restart_required_msg == null && !(notebook.nbpkg?.instantiated ?? true);
    const busy = recent_event != null && ((notebook.nbpkg?.busy_packages ?? []).includes(recent_event.package_name) || needs_first_instatiation);

    const debounced_busy = useDebouncedTruth(busy, 2);
    hooks_pin_v113_target_es2020.useEffect(() => {
        set_showterminal(debounced_busy);
    }, [debounced_busy]);

    const terminal_value = notebook.nbpkg?.terminal_outputs == null ? "Loading..." : notebook.nbpkg?.terminal_outputs[recent_event?.package_name] ?? "";

    const showupdate = pkg_status?.offer_update ?? false;

    const timingdata = usePackageTimingData();
    const estimate = timingdata == null || recent_event?.package_name == null ? null : time_estimate(timingdata, [recent_event?.package_name]);
    const total_time = estimate == null ? 0 : estimate.install + estimate.load + estimate.precompile;
    const total_second_time = estimate == null ? 0 : estimate.load;

    // <header>${recent_event?.package_name}</header>
    return html`<pkg-popup
        class=${cl({
            busy,
            showterminal,
            showupdate,
        })}
    >
        ${pkg_status?.hint ?? "Loading..."}
        ${(pkg_status?.status === "will_be_installed" || pkg_status?.status === "busy") && total_time > 10
            ? html`<div class="pkg-time-estimate">
                  Installation can take <strong>${pretty_long_time(total_time)}</strong>${`. `}<br />${`Afterwards, it loads in `}
                  <strong>${pretty_long_time(total_second_time)}</strong>.
              </div>`
            : null}
        <div class="pkg-buttons">
            ${recent_event?.is_disable_pkg || disable_input || notebook.nbpkg?.waiting_for_permission
                ? null
                : html`<a
                      class="pkg-update"
                      target="_blank"
                      title="Update packages"
                      style=${!!showupdate ? "" : "opacity: .4;"}
                      href="#"
                      onClick=${(e) => {
                          if (busy) {
                              alert("Pkg is currently busy with other packages... come back later!");
                          } else {
                              if (confirm("Would you like to check for updates and install them? A backup of the notebook file will be created.")) {
                                  console.warn("Pkg.updating!");
                                  pluto_actions.send("pkg_update", {}, { notebook_id: notebook.notebook_id });
                              }
                          }
                          e.preventDefault();
                      }}
                      ><img alt="⬆️" src=${arrow_up_circle_icon} width="17"
                  /></a>`}
            <a
                class="toggle-terminal"
                target="_blank"
                title="Show/hide Pkg terminal output"
                style=${!!terminal_value ? "" : "display: none;"}
                href="#"
                onClick=${(e) => {
                    set_showterminal(!showterminal);
                    e.preventDefault();
                }}
                ><img alt="📄" src=${document_text_icon} width="17"
            /></a>
            <a class="help" target="_blank" title="Go to help page" href="https://plutojl.org/pkg/"><img alt="❔" src=${help_circle_icon} width="17" /></a>
        </div>
        <${PkgTerminalView} value=${terminal_value ?? "Loading..."} />
    </pkg-popup>`
};

const nbpkg_fingerprint = (nbpkg) => (nbpkg == null ? [null] : Object.entries(nbpkg).flat());

const nbpkg_fingerprint_without_terminal = (nbpkg) =>
    nbpkg == null ? [null] : Object.entries(nbpkg).flatMap(([k, v]) => (k === "terminal_outputs" ? [] : [v]));

const can_update = (installed, available) => {
    if (installed === "stdlib" || !_.isArray(available)) {
        return false
    } else {
        // return true
        return _.last(available) !== installed
    }
};

/**
 * @typedef PackageStatus
 * @property {string} status
 * @property {import("../imports/Preact.js").ReactElement} hint
 * @property {string} hint_raw
 * @property {string[]?} available_versions
 * @property {string?} chosen_version
 * @property {string?} package_url
 * @property {boolean} busy
 * @property {boolean} offer_update
 */

/**
 * @param {{
 *  package_name: string,
 *  package_url?: string,
 *  is_disable_pkg: boolean,
 *  available_versions?: string[],
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 * @returns {PackageStatus}
 */
const package_status = ({ nbpkg, package_name, available_versions, is_disable_pkg, package_url }) => {
    let status = "error";
    let hint_raw = "error";
    let hint = html`error`;
    let offer_update = false;

    package_url = package_url ?? `https://juliahub.com/ui/Packages/General/${package_name}`;

    const chosen_version = nbpkg?.installed_versions[package_name] ?? null;
    const nbpkg_waiting_for_permission = nbpkg?.waiting_for_permission ?? false;
    const busy = !nbpkg_waiting_for_permission && ((nbpkg?.busy_packages ?? []).includes(package_name) || !(nbpkg?.instantiated ?? true));

    const package_name_pretty = html`<a class="package-name" href=${package_url}><b>${package_name}</b></a> `;

    if (is_disable_pkg) {
        const f_name = package_name;
        status = "disable_pkg";
        hint_raw = `${f_name} disables Pluto's built-in package manager.`;
        hint = html`<b>${f_name}</b> disables Pluto's built-in package manager.`;
    } else if (chosen_version != null || _.isEqual(available_versions, ["stdlib"])) {
        if (chosen_version == null || chosen_version === "stdlib") {
            status = "installed";
            hint_raw = `${package_name} is part of Julia's pre-installed 'standard library'.`;
            hint = html`${package_name_pretty} is part of Julia's pre-installed <em>standard library</em>.`;
        } else {
            if (nbpkg_waiting_for_permission) {
                status = "will_be_installed";
                hint_raw = `${package_name} (v${_.last(available_versions)}) will be installed when you run this notebook.`;
                hint = html`<header>${package_name_pretty} <pkg-version>v${_.last(available_versions)}</pkg-version></header>
                    will be installed when you run this notebook.`;
            } else if (busy) {
                status = "busy";
                hint_raw = `${package_name} (v${chosen_version}) is installing...`;
                hint = html`<header>${package_name_pretty} <pkg-version>v${chosen_version}</pkg-version></header>
                    is installing...`;
            } else {
                status = "installed";
                hint_raw = `${package_name} (v${chosen_version}) is installed in the notebook.`;
                hint = html`<header>
                        ${package_name_pretty}
                        <pkg-version>v${chosen_version}</pkg-version>
                    </header>
                    is installed in the notebook.`;
                offer_update = can_update(chosen_version, available_versions);
            }
        }
    } else {
        if (available_versions != null && _.isArray(available_versions)) {
            if (available_versions.length === 0) {
                status = "not_found";
                hint_raw = `The package "${package_name}" could not be found in the registry. Did you make a typo?`;
                hint = html`The package <em>"${package_name}"</em> could not be found in the registry.
                    <section><em>Did you make a typo?</em></section>`;
            } else {
                status = "will_be_installed";
                hint_raw = `${package_name} (v${_.last(available_versions)}) will be installed in the notebook when you run this cell.`;
                hint = html`<header>${package_name_pretty} <pkg-version>v${_.last(available_versions)}</pkg-version></header>
                    will be installed in the notebook when you run this cell.`;
            }
        }
    }

    return { status, hint, hint_raw, available_versions: available_versions ?? null, chosen_version, busy, offer_update, package_url }
};

/**
 * The little icon that appears inline next to a package import in code (e.g. `using PlutoUI ✅`)
 * @param {{
 *  package_name: string,
 *  pluto_actions: any,
 *  notebook_id: string,
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 */
const PkgStatusMark = ({ package_name, pluto_actions, notebook_id, nbpkg }) => {
    const [available_versions_msg, set_available_versions_msg] = hooks_pin_v113_target_es2020.useState(/** @type {{ versions?: string[], package_url?: string }?} */ (null));
    const [package_url, set_package_url] = hooks_pin_v113_target_es2020.useState(/** @type {string[]?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        let available_version_promise = pluto_actions.get_avaible_versions({ package_name, notebook_id }) ?? Promise.resolve([]);
        available_version_promise.then(set_available_versions_msg);
    }, [package_name]);

    const { status, hint_raw } = package_status({
        nbpkg: nbpkg,
        package_name: package_name,
        is_disable_pkg: false,
        available_versions: available_versions_msg?.versions,
        package_url: available_versions_msg?.package_url,
    });

    return html`
        <pkg-status-mark
            title=${hint_raw}
            className=${status === "busy"
                ? "busy"
                : status === "installed"
                ? "installed"
                : status === "not_found"
                ? "not_found"
                : status === "will_be_installed"
                ? "will_be_installed"
                : ""}
        >
            <button
                onClick=${(event) => {
                    open_pluto_popup({
                        type: "nbpkg",
                        source_element: event.currentTarget.parentElement,
                        package_name: package_name,
                        is_disable_pkg: false,
                        should_focus: true,
                    });
                }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `
};

const PkgActivateMark = ({ package_name }) => {
    const { hint_raw } = package_status({
        nbpkg: null,
        package_name: package_name,
        is_disable_pkg: true,
    });

    return html`
        <pkg-status-mark title=${hint_raw} class="disable_pkg">
            <button
                onClick=${(event) => {
                    open_pluto_popup({
                        type: "nbpkg",
                        source_element: event.currentTarget.parentElement,
                        package_name: package_name,
                        is_disable_pkg: true,
                        should_focus: true,
                    });
                }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `
};

/**
 * Use this Widget to render (P)react components as codemirror widgets.
 */
class ReactWidget extends index_es_min_js.WidgetType {
    /** @param {import("../../imports/Preact.js").ReactElement} element */
    constructor(element) {
        super();
        this.element = element;
    }

    eq(other) {
        return false
    }

    toDOM() {
        let span = document.createElement("span");
        preact_10_13_2_pin_v113_target_es2020.render(this.element, span);
        return span
    }

    updateDOM(dom) {
        preact_10_13_2_pin_v113_target_es2020.render(this.element, dom);
        return true
    }
}

/**
 * Like Lezers `iterate`, but instead of `{ from, to, getNode() }`
 * this will give `enter()` and `leave()` the `cursor` (which can be effeciently matches with lezer template)
 *
 * @param {{
 *  tree: any,
 *  enter: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  leave?: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  from?: number,
 *  to?: number,
 * }} options
 */
function iterate_with_cursor({ tree, enter, leave, from = 0, to = tree.length }) {
    let cursor = tree.cursor();
    while (true) {
        let mustLeave = false;
        if (cursor.from <= to && cursor.to >= from && (cursor.type.isAnonymous || enter(cursor) !== false)) {
            if (cursor.firstChild()) continue
            if (!cursor.type.isAnonymous) mustLeave = true;
        }
        while (true) {
            if (mustLeave && leave) leave(cursor);
            mustLeave = cursor.type.isAnonymous;
            if (cursor.nextSibling()) break
            if (!cursor.parent()) return
            mustLeave = true;
        }
    }
}

/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: import("../Editor.js").NotebookPkgData, pluto_actions: any, notebook_id: string }}
 */

// This list appears multiple times in our codebase. Be sure to match edits everywhere.
const pkg_disablers = [
    "Pkg.activate",
    "Pkg.API.activate",
    "Pkg.develop",
    "Pkg.API.develop",
    "Pkg.add",
    "Pkg.API.add",
    "TestEnv.activate",
    // https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
    "quickactivate",
    "@quickactivate",
];

/**
 * @param {object} a
 * @param {EditorState} a.state
 * @param {Number} a.from
 * @param {Number} a.to
 */
function find_import_statements({ state, from, to }) {
    const doc = state.doc;
    const tree = index_es_min_js.syntaxTree(state);

    let things_to_return = [];

    let currently_using_or_import = "import";
    let currently_selected_import = false;

    iterate_with_cursor({
        tree,
        from,
        to,
        enter: (node) => {
            let go_to_parent_afterwards = null;

            if (node.name === "QuoteExpression" || node.name === "FunctionDefinition") return false

            if (node.name === "import") currently_using_or_import = "import";
            if (node.name === "using") currently_using_or_import = "using";

            // console.group("exploring", node.name, doc.sliceString(node.from, node.to), node)

            if (node.name === "CallExpression" || node.name === "MacrocallExpression") {
                let callee = node.node.firstChild;
                if (callee) {
                    let callee_name = doc.sliceString(callee.from, callee.to);

                    if (pkg_disablers.includes(callee_name)) {
                        things_to_return.push({
                            type: "package_disabler",
                            name: callee_name,
                            from: node.from,
                            to: node.to,
                        });
                    }
                }
                return false
            }

            if (node.name === "ImportStatement") {
                currently_selected_import = false;
            }
            if (node.name === "SelectedImport") {
                currently_selected_import = true;
                node.firstChild();
                go_to_parent_afterwards = true;
            }

            if (node.name === "ImportPath") {
                const package_name = doc.sliceString(node.from, node.to).split(".")[0];
                if (package_name === "") return false
                const item = {
                    type: "package",
                    name: package_name,
                    from: node.from,
                    to: node.to,
                };

                things_to_return.push(item);

                // This is just for show... might delete it later
                if (currently_using_or_import === "using" && !currently_selected_import) things_to_return.push({ ...item, type: "implicit_using" });
            }

            if (go_to_parent_afterwards) {
                node.parent();
                return false
            }
        },
    });

    return things_to_return
}

/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg }) {
    let seen_packages = new Set();

    let widgets = view.visibleRanges
        .flatMap(({ from, to }) => {
            let things_to_mark = find_import_statements({
                state: view.state,
                from: from,
                to: to,
            });

            return things_to_mark.map((thing) => {
                if (thing.type === "package") {
                    let { name: package_name } = thing;
                    if (package_name !== "Base" && package_name !== "Core" && !seen_packages.has(package_name)) {
                        seen_packages.add(package_name);

                        let deco = index_es_min_js.Decoration.widget({
                            widget: new ReactWidget(html`
                                <${PkgStatusMark}
                                    key=${package_name}
                                    package_name=${package_name}
                                    pluto_actions=${pluto_actions}
                                    notebook_id=${notebook_id}
                                    nbpkg=${nbpkg}
                                />
                            `),
                            side: 1,
                        });
                        return deco.range(thing.to)
                    }
                } else if (thing.type === "package_disabler") {
                    let deco = index_es_min_js.Decoration.widget({
                        widget: new ReactWidget(html` <${PkgActivateMark} package_name=${thing.name} /> `),
                        side: 1,
                    });
                    return deco.range(thing.to)
                } else if (thing.type === "implicit_using") {
                    if (thing.name === "HypertextLiteral") {
                        let deco = index_es_min_js.Decoration.widget({
                            widget: new ReactWidget(html`<span style=${{ position: "relative" }}>
                                <div
                                    style=${{
                                        position: `absolute`,
                                        display: `inline`,
                                        left: 0,
                                        whiteSpace: `nowrap`,
                                        opacity: 0.3,
                                        pointerEvents: `none`,
                                    }}
                                >
                                    : @htl, @htl_str
                                </div>
                            </span>`),
                            side: 1,
                        });
                        return deco.range(thing.to)
                    }
                }
            })
        })
        .filter((x) => x != null);
    return index_es_min_js.Decoration.set(widgets, true)
}

/**
 * @type {Facet<import("../Editor.js").NotebookPkgData?, import("../Editor.js").NotebookPkgData?>}
 */
const NotebookpackagesFacet = index_es_min_js.Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
});

const pkgBubblePlugin = ({ pluto_actions, notebook_id_ref }) =>
    index_es_min_js.ViewPlugin.fromClass(
        class {
            update_decos(view) {
                const ds = pkg_decorations(view, { pluto_actions, notebook_id: notebook_id_ref.current, nbpkg: view.state.facet(NotebookpackagesFacet) });
                this.decorations = ds;
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.update_decos(view);
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.state.facet(NotebookpackagesFacet) !== update.startState.facet(NotebookpackagesFacet)
                ) {
                    this.update_decos(update.view);
                    return
                }
            }
        },
        {
            // @ts-ignore
            decorations: (v) => v.decorations,
        }
    );

const ARBITRARY_INDENT_LINE_WRAP_LIMIT = 12;

const get_start_tabs = (line) => /^\t*/.exec(line)?.[0] ?? "";

const get_decorations = (/** @type {import("../../imports/CodemirrorPlutoSetup.js").EditorState} */ state) => {
    let decorations = [];

    // TODO? Don't create new decorations when a line hasn't changed?
    for (let i of _.range(0, state.doc.lines)) {
        let line = state.doc.line(i + 1);
        const num_tabs = get_start_tabs(line.text).length;
        if (num_tabs === 0) continue

        const how_much_to_indent = Math.min(num_tabs, ARBITRARY_INDENT_LINE_WRAP_LIMIT);
        const offset = how_much_to_indent * state.tabSize;

        const linerwapper = index_es_min_js.Decoration.line({
            attributes: {
                style: `--indented: ${offset}ch;`,
                class: "awesome-wrapping-plugin-the-line",
            },
        });
        // Need to push before the tabs one else codemirror gets madddd
        decorations.push(linerwapper.range(line.from, line.from));

        if (how_much_to_indent > 0) {
            decorations.push(
                index_es_min_js.Decoration.mark({
                    class: "awesome-wrapping-plugin-the-tabs",
                }).range(line.from, line.from + how_much_to_indent)
            );
        }
        if (num_tabs > how_much_to_indent) {
            for (let i of _.range(how_much_to_indent, num_tabs)) {
                decorations.push(
                    index_es_min_js.Decoration.replace({
                        widget: new ReactWidget(html`<span style=${{ opacity: 0.2 }}>⇥ </span>`),
                        block: false,
                    }).range(line.from + i, line.from + i + 1)
                );
            }
        }
    }
    return index_es_min_js.Decoration.set(decorations)
};

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
const awesome_line_wrapping = index_es_min_js.StateField.define({
    create(state) {
        return get_decorations(state)
    },
    update(deco, tr) {
        if (!tr.docChanged) return deco
        return get_decorations(tr.state)
    },
    provide: (f) => index_es_min_js.EditorView.decorations.from(f),
});

/**
 * Cell movement plugin!
 *
 * Two goals:
 * - Make movement and operations on the edges of cells work with their neighbors
 * - Prevent holding a button down to continue operations on neighboring cells
 *
 * I lean a lot on `view.moveByChar` and `view.moveVertically` from codemirror.
 * They will give you the position of the cursor after moving, and comparing that
 * to the current selection will tell you if the cursor would have moved normally.
 * If it would have moved normally, we don't do anything. Else, it's our time
 *
 * We use that in the keysmaps and the prevention of holding a button down.
 *
 * TODO Move the cursor to the same column in the new cell when moving vertically
 * TODO Put delete and backspace and such here too, but is harder because they
 * .... need to also modify this/the neighbor cell.
 */

/**
 * @typedef FocusOnNeighborFunction
 * @type {(options: { cell_delta: number, line: number, character: number }) => void}
 */

/**
 * @param {object} options
 * @param {FocusOnNeighborFunction} options.focus_on_neighbor
 */
let cell_movement_keys = ({ focus_on_neighbor }) => {
    // All arrows do basically the same now:
    // - Check if the cursor would have moved normally
    // - If it would have moved normally, don't do anything so codemirror can move the cursor
    // - Else move the cursor to the neighbor cell
    // TODO for verticals:

    const CellArrowLeft = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main;
        if (!selection.empty) return false
        if (!view.moveByChar(selection, false).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: -1,
            line: Infinity,
            character: Infinity,
        });
        return true
    };
    const CellArrowRight = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main;
        if (!selection.empty) return false
        if (!view.moveByChar(selection, true).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: 1,
            line: 0,
            character: 0,
        });
        return true
    };
    const CellArrowUp = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main;
        if (!selection.empty) return false
        if (!view.moveVertically(selection, false).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: -1,
            line: Infinity,
            character: Infinity,
        });
        return true
    };
    const CellArrowDown = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main;
        if (!selection.empty) return false
        if (!view.moveVertically(selection, true).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: 1,
            line: 0,
            character: 0,
        });
        return true
    };

    const CellPageUp = () => {
        focus_on_neighbor({
            cell_delta: -1,
            line: 0,
            character: 0,
        });

        return true
    };

    const CellPageDown = () => {
        focus_on_neighbor({
            cell_delta: 1,
            line: 0,
            character: 0,
        });
        return true
    };

    return index_es_min_js.keymap.of([
        { key: "PageUp", run: CellPageUp },
        { key: "PageDown", run: CellPageDown },
        { key: "ArrowLeft", run: CellArrowLeft },
        { key: "ArrowUp", run: CellArrowUp },
        { key: "ArrowRight", run: CellArrowRight },
        { key: "ArrowDown", run: CellArrowDown },
    ])
};

// Don't-accidentally-remove-cells-plugin
// Because we need some extra info about the key, namely if it is on repeat or not,
// we can't use a keymap (keymaps don't give us the event with `repeat` property),
// so we use a custom keydown event handler.
let prevent_holding_a_key_from_doing_things_across_cells = index_es_min_js.EditorView.domEventHandlers({
    keydown: (event, view) => {
        // TODO We could also require a re-press after a force focus, because
        // .... currently if you delete another cell, but keep holding down the backspace (or delete),
        // .... you'll still be deleting characters (because view.state.doc.length will be > 0)

        // Screw multicursor support on these things
        let selection = view.state.selection.main;
        // Also only cursors and not selections
        if (!selection.empty) return false
        // Kinda the whole thing of this plugin, no?
        if (!event.repeat) return false

        if (event.key === "Backspace") {
            if (view.state.doc.length === 0) {
                // Only if this would be a cell-deleting backspace, we jump in
                return true
            }
        }
        if (event.key === "Delete") {
            if (view.state.doc.length === 0) {
                // Only if this would be a cell-deleting backspace, we jump in
                return true
            }
        }

        // Because of the "hacky" way this works, we need to check if autocompletion is open...
        // else we'll block the ability to press ArrowDown for autocomplete....

        let autocompletion_open = index_es_min_js.autocomplete.completionStatus(view.state) === "active";

        // If we have a cursor instead of a multicharacter selection:
        if (event.key === "ArrowUp" && !autocompletion_open) {
            if (!view.moveVertically(view.state.selection.main, false).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowDown" && !autocompletion_open) {
            if (!view.moveVertically(view.state.selection.main, true).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowLeft" && event.repeat) {
            if (!view.moveByChar(selection, false).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowRight") {
            if (!view.moveByChar(selection, true).eq(selection)) return false
            return true
        }
    },
});

/**
 * @param {object} options
 * @param {FocusOnNeighborFunction} options.focus_on_neighbor
 */
let cell_movement_plugin = ({ focus_on_neighbor }) => cell_movement_keys({ focus_on_neighbor });

let pluto_paste_plugin = ({ pluto_actions, cell_id }) => {
    return index_es_min_js.EditorView.domEventHandlers({
        paste: (event, view) => {
            if (!view.hasFocus) {
                // Tell codemirror it doesn't have to handle this when it doesn't have focus
                console.log("CodeMirror, why are you registring this paste? You aren't focused!");
                return true
            }

            // Prevent this event from reaching the Editor-level paste handler
            event.stopPropagation();

            const topaste = event.clipboardData.getData("text/plain");
            const deserializer = detect_deserializer(topaste);
            if (deserializer == null) {
                return false
            }

            // If we have the whole cell selected, the user doesn't want their current code to survive...
            // So we paste the cells, but then remove the original cell! (Ideally I want to keep that cell and fill it with the first deserialized one)
            // (This also applies to pasting in an empty cell)
            if (view.state.selection.main.from === 0 && view.state.selection.main.to === view.state.doc.length) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                pluto_actions.confirm_delete_multiple("This Should Never Be Visible", [cell_id]);
                return true
            }

            // End of cell, add new cells below
            if (view.state.selection.main.to === view.state.doc.length) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                return true
            }

            // Start of cell, ideally we'd add new cells above, but we don't have that yet
            if (view.state.selection.main.from === 0) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                return true
            }

            return false
        },
    })
};

/**
 * ADAPTED MATCH BRACKETS PLUGIN FROM CODEMIRROR
 * Original: https://github.com/codemirror/matchbrackets/blob/99bf6b7e6891c09987269e370dc45ab1d588b875/src/matchbrackets.ts
 *
 * I changed it to ignore the closedBy and openBy properties provided by lezer, because these
 * are all wrong for julia... Also, this supports returning multiple matches, like `if ... elseif ... end`, etc.
 * On top of that I added `match_block` to match the block brackets, like `begin ... end` and all of those.
 * Also it doesn't do non-matching now, there is just matching or nothing.
 */

function match_try_node(node) {
    let try_node = node.parent.firstChild;
    let possibly_end = node.parent.lastChild;
    let did_match = possibly_end.name === "end";
    if (!did_match) return null

    let catch_node = node.parent.getChild("CatchClause")?.firstChild;
    let else_node = node.parent.getChild("TryElseClause")?.firstChild;
    let finally_node = node.parent.getChild("FinallyClause")?.firstChild;

    return [
        { from: try_node.from, to: try_node.to },
        catch_node && { from: catch_node.from, to: catch_node.to },
        else_node && { from: else_node.from, to: else_node.to },
        finally_node && { from: finally_node.from, to: finally_node.to },
        { from: possibly_end.from, to: possibly_end.to },
    ].filter((x) => x != null)
}

function match_block(node) {
    if (node.name === "end") {
        if (node.parent.name === "IfStatement") {
            // Try moving to the "if" part because
            // the rest of the code is looking for that
            node = node.parent?.firstChild?.firstChild;
        } else {
            node = node.parent.firstChild;
        }
    }

    if (node == null) {
        return []
    }

    // if (node.name === "StructDefinition") node = node.firstChild
    if (node.name === "mutable" || node.name === "struct") {
        if (node.name === "struct") node = node.parent.firstChild;

        let struct_node = node.parent.getChild("struct");
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match || !struct_node) return null

        return [
            { from: node.from, to: struct_node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }
    if (node.name === "struct") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "quote") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "begin") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "do") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "for") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "let") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "macro") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "function") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "while") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "type") node = node.parent.firstChild;
    if (node.name === "abstract" || node.name === "primitive") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        let struct_node = node.parent.getChild("type");
        if (!did_match || !struct_node) return null

        return [
            { from: node.from, to: struct_node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    if (node.name === "if" || node.name === "else" || node.name === "elseif") {
        if (node.name === "if") node = node.parent;
        let iselse = false;
        if (node.name === "else") {
            node = node.parent;
            iselse = true;
        }
        if (node.name === "elseif") node = node.parent.parent;

        let try_node = node.parent.firstChild;
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        if (iselse && try_node.name === "try") {
            return match_try_node(node) // try catch else finally end
        }

        let decorations = [];
        decorations.push({ from: try_node.from, to: try_node.to });
        for (let elseif_clause_node of node.parent.getChildren("ElseifClause")) {
            let elseif_node = elseif_clause_node.firstChild;
            decorations.push({ from: elseif_node.from, to: elseif_node.to });
        }
        for (let else_clause_node of node.parent.getChildren("ElseClause")) {
            let else_node = else_clause_node.firstChild;
            decorations.push({ from: else_node.from, to: else_node.to });
        }
        decorations.push({ from: possibly_end.from, to: possibly_end.to });

        return decorations
    }

    if (node.name === "try" || node.name === "catch" || node.name === "finally" || node.name === "else") {
        if (node.name === "catch") node = node.parent;
        if (node.name === "finally") node = node.parent;
        if (node.name === "else") node = node.parent;

        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return match_try_node(node)
    }

    if (node.name === "module" || node.name === "baremodule") {
        let possibly_end = node.parent.lastChild;
        let did_match = possibly_end.name === "end";
        if (!did_match) return null

        return [
            { from: node.from, to: node.to },
            { from: possibly_end.from, to: possibly_end.to },
        ]
    }

    return null
}

const baseTheme = index_es_min_js.EditorView.baseTheme({
    ".cm-matchingBracket": { backgroundColor: "#328c8252" },
    ".cm-nonmatchingBracket": { backgroundColor: "#bb555544" },
});
const DefaultScanDist = 10000,
    DefaultBrackets = "()[]{}";
const bracketMatchingConfig = index_es_min_js.Facet.define({
    combine(configs) {
        return index_es_min_js.combineConfig(configs, {
            afterCursor: true,
            brackets: DefaultBrackets,
            maxScanDistance: DefaultScanDist,
        })
    },
});
const matchingMark = index_es_min_js.Decoration.mark({ class: "cm-matchingBracket" });
    index_es_min_js.Decoration.mark({ class: "cm-nonmatchingBracket" });
const bracketMatchingState = index_es_min_js.StateField.define({
    create() {
        return index_es_min_js.Decoration.none
    },
    update(deco, tr) {
        if (!tr.docChanged && !tr.selection) return deco
        let decorations = [];
        let config = tr.state.facet(bracketMatchingConfig);
        for (let range of tr.state.selection.ranges) {
            if (!range.empty) continue
            let match =
                matchBrackets(tr.state, range.head, -1, config) ||
                (range.head > 0 && matchBrackets(tr.state, range.head - 1, 1, config)) ||
                (config.afterCursor &&
                    (matchBrackets(tr.state, range.head, 1, config) ||
                        (range.head < tr.state.doc.length && matchBrackets(tr.state, range.head + 1, -1, config))));
            if (!match) continue
            let mark = matchingMark;
            for (let pos of match) {
                decorations.push(mark.range(pos.from, pos.to));
            }
        }
        return index_es_min_js.Decoration.set(decorations, true)
    },
    provide: (f) => index_es_min_js.EditorView.decorations.from(f),
});
const bracketMatchingUnique = [bracketMatchingState, baseTheme];
/// Create an extension that enables bracket matching. Whenever the
/// cursor is next to a bracket, that bracket and the one it matches
/// are highlighted. Or, when no matching bracket is found, another
/// highlighting style is used to indicate this.
function bracketMatching(config = {}) {
    return [bracketMatchingConfig.of(config), bracketMatchingUnique]
}
/// Find the matching bracket for the token at `pos`, scanning
/// direction `dir`. Only the `brackets` and `maxScanDistance`
/// properties are used from `config`, if given. Returns null if no
/// bracket was found at `pos`, or a match result otherwise.
function matchBrackets(state, pos, dir, config = {}) {
    let maxScanDistance = config.maxScanDistance || DefaultScanDist,
        brackets = config.brackets || DefaultBrackets;
    let tree = index_es_min_js.syntaxTree(state),
        node = tree.resolveInner(pos, dir);

    let result = match_block(node);
    return result || matchPlainBrackets(state, pos, dir, tree, bracket_node_name_normalizer(node.name), maxScanDistance, brackets)
}

function matchPlainBrackets(state, pos, dir, tree, tokenType, maxScanDistance, brackets) {
    let startCh = dir < 0 ? state.sliceDoc(pos - 1, pos) : state.sliceDoc(pos, pos + 1);
    let bracket = brackets.indexOf(startCh);
    if (bracket < 0 || (bracket % 2 == 0) != dir > 0) return null
    let startToken = { from: dir < 0 ? pos - 1 : pos, to: dir > 0 ? pos + 1 : pos };
    let iter = state.doc.iterRange(pos, dir > 0 ? state.doc.length : 0),
        depth = 0;
    for (let distance = 0; !iter.next().done && distance <= maxScanDistance; ) {
        let text = iter.value;
        if (dir < 0) distance += text.length;
        let basePos = pos + distance * dir;
        for (let pos = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos != end; pos += dir) {
            let found = brackets.indexOf(text[pos]);
            if (found < 0 || bracket_node_name_normalizer(tree.resolve(basePos + pos, 1).name) != tokenType) continue
            if ((found % 2 == 0) == dir > 0) {
                depth++;
            } else if (depth == 1) {
                // Closing
                if (found >> 1 == bracket >> 1) {
                    return [startToken, { from: basePos + pos, to: basePos + pos + 1 }]
                } else {
                    return null
                }
            } else {
                depth--;
            }
        }
        if (dir > 0) distance += text.length;
    }
    return iter.done ? [startToken] : null
}

/**
 * Little modification to the original matchPlainBrackets function: in our Julia language, the node that opens a bracket is called "(". In e.g. markdown it's called LinkMark or something (the same name for opening and closing). We don't have this so we make them equal.
 */
const bracket_node_name_normalizer = (/** @type {String} */ node_name) => {
    switch (node_name) {
        case "(":
        case ")":
            return "()"
        case "[":
        case "]":
            return "[]"
        case "{":
        case "}":
            return "{}"
        default:
            return node_name
    }
};

const highlighted_line = index_es_min_js.Decoration.line({
    attributes: { class: "cm-highlighted-line" },
});

const highlighted_range = index_es_min_js.Decoration.mark({
    attributes: { class: "cm-highlighted-range" },
});

/**
 * @param {EditorView} view
 */
function create_line_decorations(view) {
    let line_number = view.state.facet(HighlightLineFacet);
    if (line_number == null || line_number == undefined || line_number < 0 || line_number > view.state.doc.lines) {
        return index_es_min_js.Decoration.set([])
    }

    let line = view.state.doc.line(line_number);
    return index_es_min_js.Decoration.set([highlighted_line.range(line.from, line.from)])
}

/**
 * @param {EditorView} view
 */
function create_range_decorations(view) {
    let range = view.state.facet(HighlightRangeFacet);
    if (range == null) {
        return index_es_min_js.Decoration.set([])
    }
    let { from, to } = range;
    if (from < 0 || from == to) {
        return index_es_min_js.Decoration.set([])
    }

    // Check if range is within document bounds
    const docLength = view.state.doc.length;
    if (from > docLength || to > docLength) {
        return index_es_min_js.Decoration.set([])
    }

    return index_es_min_js.Decoration.set([highlighted_range.range(from, to)])
}

/**
 * @type Facet<number?, number?>
 */
const HighlightLineFacet = index_es_min_js.Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
});

/**
 * @type Facet<{from: number, to: number}?, {from: number, to: number}?>
 */
const HighlightRangeFacet = index_es_min_js.Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
});

const highlightLinePlugin = () =>
    index_es_min_js.ViewPlugin.fromClass(
        class {
            updateDecos(view) {
                this.decorations = create_line_decorations(view);
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.decorations = index_es_min_js.Decoration.set([]);
                this.updateDecos(view);
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (update.docChanged || update.state.facet(HighlightLineFacet) !== update.startState.facet(HighlightLineFacet)) {
                    this.updateDecos(update.view);
                }
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );

const highlightRangePlugin = () =>
    index_es_min_js.ViewPlugin.fromClass(
        class {
            updateDecos(view) {
                this.decorations = create_range_decorations(view);
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.decorations = index_es_min_js.Decoration.set([]);
                this.updateDecos(view);
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (update.docChanged || update.state.facet(HighlightRangeFacet) !== update.startState.facet(HighlightRangeFacet)) {
                    this.updateDecos(update.view);
                }
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );

// This is "just" https://github.com/codemirror/comment/blob/da336b8660dedab23e06ced2b430f2ac56ef202d/src/comment.ts
// (@codemirror/comment)
// But with a change that helps mixed parser environments:
// If the comment-style (`#`, `//`, `/* */`, etc) at the begin and end of the selection is the same,
// we don't use the comment-style per line, but use the begin/end style for every line.


/// Comment or uncomment the current selection. Will use line comments
/// if available, otherwise falling back to block comments.
const toggleComment = (target) => {
    let config = getConfig(target.state);
    return config.line ? toggleLineComment(target) : config.block ? toggleBlockComment(target) : false
};
function command(f, option) {
    return ({ state, dispatch }) => {
        if (state.readOnly) return false
        let tr = f(option, state.selection.ranges, state);
        if (!tr) return false
        dispatch(state.update(tr));
        return true
    }
}
/// Comment or uncomment the current selection using line comments.
/// The line comment syntax is taken from the
/// [`commentTokens`](#comment.CommentTokens) [language
/// data](#state.EditorState.languageDataAt).
const toggleLineComment = command(changeLineComment, 0 /* Toggle */);
/// Comment or uncomment the current selection using block comments.
/// The block comment syntax is taken from the
/// [`commentTokens`](#comment.CommentTokens) [language
/// data](#state.EditorState.languageDataAt).
const toggleBlockComment = command(changeBlockComment, 0 /* Toggle */);
/// Default key bindings for this package.
///
///  - Ctrl-/ (Cmd-/ on macOS): [`toggleComment`](#comment.toggleComment).
///  - Shift-Alt-a: [`toggleBlockComment`](#comment.toggleBlockComment).
const commentKeymap = [
    { key: "Mod-/", run: toggleComment },
    { key: "Alt-A", run: toggleBlockComment },
];
function getConfig(state, pos = state.selection.main.head) {
    let data = state.languageDataAt("commentTokens", pos);
    return data.length ? data[0] : {}
}
const SearchMargin = 50;
/// Determines if the given range is block-commented in the given
/// state.
function findBlockComment(state, { open, close }, from, to) {
    let textBefore = state.sliceDoc(from - SearchMargin, from);
    let textAfter = state.sliceDoc(to, to + SearchMargin);
    let spaceBefore = /\s*$/.exec(textBefore)[0].length,
        spaceAfter = /^\s*/.exec(textAfter)[0].length;
    let beforeOff = textBefore.length - spaceBefore;
    if (textBefore.slice(beforeOff - open.length, beforeOff) == open && textAfter.slice(spaceAfter, spaceAfter + close.length) == close) {
        return { open: { pos: from - spaceBefore, margin: spaceBefore && 1 }, close: { pos: to + spaceAfter, margin: spaceAfter && 1 } }
    }
    let startText, endText;
    if (to - from <= 2 * SearchMargin) {
        startText = endText = state.sliceDoc(from, to);
    } else {
        startText = state.sliceDoc(from, from + SearchMargin);
        endText = state.sliceDoc(to - SearchMargin, to);
    }
    let startSpace = /^\s*/.exec(startText)[0].length,
        endSpace = /\s*$/.exec(endText)[0].length;
    let endOff = endText.length - endSpace - close.length;
    if (startText.slice(startSpace, startSpace + open.length) == open && endText.slice(endOff, endOff + close.length) == close) {
        return {
            open: { pos: from + startSpace + open.length, margin: /\s/.test(startText.charAt(startSpace + open.length)) ? 1 : 0 },
            close: { pos: to - endSpace - close.length, margin: /\s/.test(endText.charAt(endOff - 1)) ? 1 : 0 },
        }
    }
    return null
}
// Performs toggle, comment and uncomment of block comments in
// languages that support them.
function changeBlockComment(option, ranges, state) {
    let tokens = ranges.map((r) => getConfig(state, r.from).block);
    if (!tokens.every((c) => c)) return null
    let comments = ranges.map((r, i) => findBlockComment(state, tokens[i], r.from, r.to));
    if (option != 2 /* Uncomment */ && !comments.every((c) => c)) {
        let index = 0;
        return state.changeByRange((range) => {
            let { open, close } = tokens[index++];
            if (comments[index]) return { range }
            let shift = open.length + 1;
            return {
                changes: [
                    { from: range.from, insert: open + " " },
                    { from: range.to, insert: " " + close },
                ],
                range: index_es_min_js.EditorSelection.range(range.anchor + shift, range.head + shift),
            }
        })
    } else if (option != 1 /* Comment */ && comments.some((c) => c)) {
        let changes = [];
        for (let i = 0, comment; i < comments.length; i++)
            if ((comment = comments[i])) {
                let token = tokens[i],
                    { open, close } = comment;
                changes.push(
                    { from: open.pos - token.open.length, to: open.pos + open.margin },
                    { from: close.pos - close.margin, to: close.pos + token.close.length }
                );
            }
        return { changes }
    }
    return null
}
// Performs toggle, comment and uncomment of line comments.
function changeLineComment(option, ranges, state) {
    let lines = [];
    let prevLine = -1;
    for (let { from, to } of ranges) {
        // DRAL EDIIIIIITS
        // If the comment tokens at the begin and end are the same,
        // I assume we want these for the whole range!
        let comment_token_from = getConfig(state, from).line;
        let comment_token_to = getConfig(state, to).line;
        let overwrite_token = comment_token_from === comment_token_to ? comment_token_from : null;

        let startI = lines.length,
            minIndent = 1e9;
        for (let pos = from; pos <= to; ) {
            let line = state.doc.lineAt(pos);
            if (line.from > prevLine && (from == to || to > line.from)) {
                prevLine = line.from;
                // DRAL EDIIIIIIIITS
                let token = overwrite_token ?? getConfig(state, pos).line;
                if (!token) continue
                let indent = /^\s*/.exec(line.text)[0].length;
                let empty = indent == line.length;
                let comment = line.text.slice(indent, indent + token.length) == token ? indent : -1;
                if (indent < line.text.length && indent < minIndent) minIndent = indent;
                lines.push({ line, comment, token, indent, empty, single: false });
            }
            pos = line.to + 1;
        }
        if (minIndent < 1e9) for (let i = startI; i < lines.length; i++) if (lines[i].indent < lines[i].line.text.length) lines[i].indent = minIndent;
        if (lines.length == startI + 1) lines[startI].single = true;
    }
    if (option != 2 /* Uncomment */ && lines.some((l) => l.comment < 0 && (!l.empty || l.single))) {
        let changes = [];
        for (let { line, token, indent, empty, single } of lines) if (single || !empty) changes.push({ from: line.from + indent, insert: token + " " });
        let changeSet = state.changes(changes);
        return { changes: changeSet, selection: state.selection.map(changeSet, 1) }
    } else if (option != 1 /* Comment */ && lines.some((l) => l.comment >= 0)) {
        let changes = [];
        for (let { line, comment, token } of lines)
            if (comment >= 0) {
                let from = line.from + comment,
                    to = from + token.length;
                if (line.text[to - line.from] == " ") to++;
                changes.push({ from, to });
            }
        return { changes }
    }
    return null
}

let array_at = (array, pos) => {
    return array.slice(pos, pos + 1)[0]
};

let mod_d_command = {
    key: "Mod-d",
    /** @param {EditorView} view */
    run: ({ state, dispatch }) => {
        if (state.selection.main.empty) {
            let nodes_that_i_like = ["Identifier", "FieldName"];

            // Expand to closest Identifier
            let cursor_left = index_es_min_js.syntaxTree(state).cursorAt(state.selection.main.from, -1);
            let cursor_right = index_es_min_js.syntaxTree(state).cursorAt(state.selection.main.from, 1);

            for (let node_i_like of nodes_that_i_like) {
                let matching_node = cursor_left.name === node_i_like ? cursor_left : cursor_right.name === node_i_like ? cursor_right : null;
                if (matching_node) {
                    dispatch({
                        selection: { anchor: matching_node.from, head: matching_node.to },
                    });
                    return true
                }
            }

            // If there is no cool syntax thing (say we are in a string), then just select the word.
            let line = state.doc.lineAt(state.selection.main.from);
            let position_relative_to_line = state.selection.main.from - line.from;
            let before_cursor = line.text.slice(0, position_relative_to_line);
            let after_cursor = line.text.slice(position_relative_to_line);

            let word_before_cursor = before_cursor.match(/(\w+)$/)?.[0] ?? "";
            let word_after_cursor = after_cursor.match(/^(\w+)/)?.[0] ?? "";

            dispatch({
                selection: { anchor: state.selection.main.from - word_before_cursor.length, head: state.selection.main.from + word_after_cursor.length },
            });
        } else {
            index_es_min_js.selectNextOccurrence({ state, dispatch });
        }
        return false
    },
    /** @param {EditorView} view */
    shift: ({ state, dispatch }) => {
        if (state.selection.ranges.length === 1) return false

        // So funny thing, the index "before" (might wrap around) the mainIndex is the one you just selected
        // @ts-ignore
        let just_selected = state.selection.ranges.at(state.selection.mainIndex - 1);

        let new_ranges = state.selection.ranges.filter((x) => x !== just_selected);
        let new_main_index = new_ranges.indexOf(state.selection.main);

        let previous_selected = array_at(new_ranges, state.selection.mainIndex - 1);

        dispatch({
            selection: index_es_min_js.EditorSelection.create(new_ranges, new_main_index),
            effects: previous_selected == null ? [] : index_es_min_js.EditorView.scrollIntoView(previous_selected.from),
        });
        return true
    },
    preventDefault: true,
};

//@ts-ignore

const base64_arraybuffer = async (/** @type {BufferSource} */ data) => {
    /** @type {string} */
    const base64url = await new Promise((r) => {
        const reader = new FileReader();
        // @ts-ignore
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(new Blob([data]));
    });

    return base64url.substring(base64url.indexOf(',')+1)
};

/** Encode a buffer using the `base64url` encoding, which uses URL-safe special characters, see https://en.wikipedia.org/wiki/Base64#Variants_summary_table */
const base64url_arraybuffer = async (/** @type {BufferSource} */ data) => {
    // This is roughly 0.5 as fast as `base64_arraybuffer`. See https://gist.github.com/fonsp/d2b84265012942dc40d0082b1fd405ba for benchmark and even slower alternatives.
    let original = await base64_arraybuffer(data);
    return base64_to_base64url(original)
};

/** Turn a base64-encoded string into a base64url-encoded string containing the same data. Do not apply on a `data://` URL. */
const base64_to_base64url = (/** @type {string} */ original) => {
    return original.replaceAll(/[\+\/\=]/g, (s) => {
        const c = s.charCodeAt(0);
        return c === 43 ? "-" : c === 47 ? "_" : ""
    })
};

/** Turn a base64url-encoded string into a base64-encoded string containing the same data. Do not apply on a `data://` URL. */
const base64url_to_base64 = (/** @type {string} */ original) => {
    const result_before_padding = original.replaceAll(/[-_]/g, (s) => {
        const c = s.charCodeAt(0);
        return c === 45 ? "+" : c === 95 ? "/" : ""
    });
    return result_before_padding + "=".repeat((4 - (result_before_padding.length % 4)) % 4)
};

const t1 = "AAA/AAA+ZMg=";
const t2 = "AAA_AAA-ZMg";

console.assert(base64_to_base64url(t1) === t2);
console.assert(base64url_to_base64(t2) === t1);

base64_arraybuffer(new Uint8Array([0, 0, 63, 0, 0, 62, 100, 200])).then((r) => console.assert(r === t1, r));
base64url_arraybuffer(new Uint8Array([0, 0, 63, 0, 0, 62, 100, 200])).then((r) => console.assert(r === t2, r));

const plutohash_arraybuffer = async (/** @type {BufferSource} */ data) => {
    const hash = sha256_mjs.sha256.create();
    hash.update(data);
    const hashed_buffer = hash.arrayBuffer();
    // const hashed_buffer = await window.crypto.subtle.digest("SHA-256", data)
    return await base64url_arraybuffer(hashed_buffer)
};

const plutohash_str = async (/** @type {string} */ s) => {
    const data = new TextEncoder().encode(s);
    return await plutohash_arraybuffer(data)
};

// hash_str("Hannes").then((r) => console.assert(r === "OI48wVWerxEEnz5lIj6CPPRB8NOwwba+LkFYTDp4aUU=", r))
plutohash_str("Hannes").then((r) => console.assert(r === "OI48wVWerxEEnz5lIj6CPPRB8NOwwba-LkFYTDp4aUU", r));

const debounced_promises = (async_function) => {
    let currently_running = false;
    let rerun_when_done = false;

    return async () => {
        if (currently_running) {
            rerun_when_done = true;
        } else {
            currently_running = true;
            rerun_when_done = true;
            while (rerun_when_done) {
                rerun_when_done = false;
                await async_function();
            }
            currently_running = false;
        }
    }
};

/** @returns {Promise<string>} */
const blob_url_to_data_url = async (/** @type {string} */ blob_url) => {
    const blob = await (await fetch(blob_url)).blob();

    return await new Promise((r) => {
        const reader = new FileReader();
        // @ts-ignore
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(blob);
    })
};

const assert_response_ok$1 = (/** @type {Response} */ r) => (r.ok ? r : Promise.reject(r));

const actions_to_keep = ["get_published_object", "get_launch_params", "get_notebook"];

const where_referenced = (/** @type {import("../components/Editor.js").CellDependencyGraph} */ graph, /** @type {Set<string> | string[]} */ vars) => {
    const all_cells = Object.keys(graph);
    return all_cells.filter((cell_id) => _.some([...vars], (v) => Object.keys(graph[cell_id].upstream_cells_map).includes(v)))
};

const where_assigned = (/** @type {import("../components/Editor.js").CellDependencyGraph} */ graph, /** @type {Set<string> | string[]} */ vars) => {
    const all_cells = Object.keys(graph);
    return all_cells.filter((cell_id) => _.some([...vars], (v) => Object.keys(graph[cell_id].downstream_cells_map).includes(v)))
};

const downstream_recursive = (/** @type {import("../components/Editor.js").CellDependencyGraph} */ graph, starts, { recursive = true } = {}) => {
    /** @type {Set<string>} */
    const deps = new Set();
    const ends = [...starts];
    while (ends.length > 0) {
        const node = ends.splice(0, 1)[0];
        _.flatten(Object.values(graph[node].downstream_cells_map)).forEach((next_cellid) => {
            if (!deps.has(next_cellid)) {
                if (recursive) ends.push(next_cellid);
                deps.add(next_cellid);
            }
        });
    }
    return deps
};

const upstream_recursive = (/** @type {import("../components/Editor.js").CellDependencyGraph} */ graph, starts, { recursive = true } = {}) => {
    /** @type {Set<string>} */
    const deps = new Set();
    const ends = [...starts];
    while (ends.length > 0) {
        const node = ends.splice(0, 1)[0];
        _.flatten(Object.values(graph[node].upstream_cells_map)).forEach((next_cellid) => {
            if (!deps.has(next_cellid)) {
                if (recursive) ends.push(next_cellid);
                deps.add(next_cellid);
            }
        });
    }
    return deps
};

const disjoint = (a, b) => !_.some([...a], (x) => b.has(x));

const is_noop_action = (action) => action?.__is_noop_action === true;

const create_noop_action = (name) => {
    const fn = (...args) => {
        console.info("Ignoring action", name, { args });
    };

    fn.__is_noop_action = true;
    return fn
};

const nothing_actions = ({ actions }) =>
    Object.fromEntries(
        Object.entries(actions).map(([k, v]) => [
            k,
            actions_to_keep.includes(k)
                ? // the original action
                  v
                : // a no-op action
                  create_noop_action(k),
        ])
    );

const slider_server_actions = ({ setStatePromise, launch_params, actions, get_original_state, get_current_state, apply_notebook_patches }) => {
    setStatePromise(
        immer((state) => {
            state.slider_server.connecting = true;
        })
    );

    const notebookfile_hash = fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity }))
        .then(assert_response_ok$1)
        .then((r) => r.arrayBuffer())
        .then(plutohash_arraybuffer);

    notebookfile_hash.then((x) => console.log("Notebook file hash:", x));

    const bond_connections = notebookfile_hash
        .then((hash) => fetch(trailingslash(launch_params.slider_server_url) + "bondconnections/" + hash))
        .then(assert_response_ok$1)
        .then((r) => r.arrayBuffer())
        .then((b) => unpack(new Uint8Array(b)));

    bond_connections.then((x) => {
        console.log("Bond connections:", x);
        setStatePromise(
            immer((state) => {
                state.slider_server.connecting = false;
                state.slider_server.interactive = Object.keys(x).length > 0;
            })
        );
    });

    bond_connections.catch((x) => {
        setStatePromise(
            immer((state) => {
                state.slider_server.connecting = false;
                state.slider_server.interactive = false;
            })
        );
    });

    const mybonds = {};
    const bonds_to_set = {
        current: new Set(),
    };
    const request_bond_response = debounced_promises(async () => {
        const base = trailingslash(launch_params.slider_server_url);
        const hash = await notebookfile_hash;
        const graph = await bond_connections;

        const explicit_bond_names = bonds_to_set.current;
        bonds_to_set.current = new Set();

        ///
        // PART 1: Compute dependencies
        ///
        const dep_graph = get_current_state().cell_dependencies;
        /** Cells that define an explicit bond */
        const starts = where_assigned(dep_graph, explicit_bond_names);

        const first_layer = where_referenced(dep_graph, explicit_bond_names);
        const next_layers = [...downstream_recursive(dep_graph, first_layer)];
        const cells_depending_on_explicits = _.uniq([...first_layer, ...next_layers]);

        const to_send = new Set(explicit_bond_names);
        explicit_bond_names.forEach((varname) => (graph[varname] ?? []).forEach((x) => to_send.add(x)));

        // Take only the bonds we need, and sort the based on variable name
        const mybonds_filtered = Object.fromEntries(
            _.sortBy(
                Object.entries(mybonds).filter(([k, v]) => to_send.has(k)),
                ([k, v]) => k
            )
        );

        const need_to_send_explicits = (() => {
            const _to_send_starts = where_assigned(dep_graph, to_send);
            const _depends_on_to_send = downstream_recursive(dep_graph, _to_send_starts);
            return !disjoint(_to_send_starts, _depends_on_to_send)
        })();

        ///
        // PART: Update visual cell running status
        ///

        const update_cells_running = async (running) =>
            await setStatePromise(
                immer((state) => {
                    cells_depending_on_explicits.forEach((cell_id) => (state.notebook.cell_results[cell_id]["queued"] = running));
                    starts.forEach((cell_id) => (state.notebook.cell_results[cell_id]["running"] = running));
                })
            );

        await update_cells_running(true);

        ///
        // PART: Make the request to PSS
        ///

        if (explicit_bond_names.size > 0) {
            console.debug("Requesting bonds", { explicit_bond_names, to_send, mybonds_filtered, need_to_send_explicits });

            const packed = pack(mybonds_filtered);
            const packed_explicits = pack(Array.from(explicit_bond_names));

            let unpacked = null;
            try {
                const url = base + "staterequest/" + hash + "/";

                // https://github.com/fonsp/Pluto.jl/pull/3158
                let add_explicits = async (url) => {
                    let u = new URL(url, window.location.href);
                    // We can skip this if all bonds are explicit:
                    if (need_to_send_explicits)
                        if (!_.isEqual(explicit_bond_names, to_send)) u.searchParams.set("explicit", await base64url_arraybuffer(packed_explicits));
                    return u
                };

                const force_post = get_current_state().metadata["sliderserver_force_post"] ?? false;
                const use_get = !force_post && url.length + (packed.length * 4 + packed_explicits.length * 4) / 3 + 20 + 12 < 8000;

                const response = use_get
                    ? await fetch(await add_explicits(url + (await base64url_arraybuffer(packed))), {
                          method: "GET",
                      }).then(assert_response_ok$1)
                    : await fetch(await add_explicits(url), {
                          method: "POST",
                          body: packed,
                      }).then(assert_response_ok$1);

                unpacked = unpack(new Uint8Array(await response.arrayBuffer()));
                console.debug("Received state", unpacked);
                const { patches } = unpacked;

                await apply_notebook_patches(
                    patches,
                    // We can just apply the patches as-is, but for complete correctness we have to take into account that these patches are not generated:
                    // NOT: diff(current_state_of_this_browser, what_it_should_be)
                    // but
                    // YES: diff(original_statefile_state, what_it_should_be)
                    //
                    // And because of previous bond interactions, our current state will have drifted from the original_statefile_state.
                    //
                    // Luckily immer lets us deal with this perfectly by letting us provide a custom "old" state.
                    // For the old state, we will use:
                    //   the current state of this browser (we dont want to change too much)
                    //   but all cells that will be affected by this run:
                    //      the statefile state
                    //
                    // Crazy!!
                    immer((state) => {
                        const original = get_original_state();

                        cells_depending_on_explicits.forEach((id) => {
                            state.cell_results[id] = original.cell_results[id];
                        });
                    })(get_current_state())
                );
            } catch (e) {
                console.error(unpacked, e);
            } finally {
                // reset cell running state regardless of request outcome
                await update_cells_running(false);
            }
        }
    });

    return {
        ...nothing_actions({ actions }),
        set_bond: async (symbol, value) => {
            setStatePromise(
                immer((state) => {
                    state.notebook.bonds[symbol] = { value: value };
                })
            );
            if (mybonds[symbol] == null || !_.isEqual(mybonds[symbol].value, value)) {
                mybonds[symbol] = { value: _.cloneDeep(value) };
                bonds_to_set.current.add(symbol);
                await request_bond_response();
            }
        },
    }
};

const format_code = (s) =>
    s == null
        ? ""
        : `<julia-code-block>
${s}
</julia-code-block>`;

const format_cell_output = (/** @type {import("./Editor.js").CellResultData?} */ cell_result, /** @type {number} */ truncate_limit) => {
    const text = cell_output_to_plaintext(cell_result, truncate_limit);

    return text == null
        ? ""
        : `<pluto-ai-context-cell-output errored="${cell_result?.errored ?? "false"}">
${text === "" || text == null ? "nothing" : text}
</pluto-ai-context-cell-output>`
};

const packages_context = (/** @type {import("./Editor.js").NotebookData} */ notebook) => {
    const has_nbpkg = notebook.nbpkg?.enabled === true;
    const installed = Object.keys(notebook.nbpkg?.installed_versions ?? {});

    return !has_nbpkg
        ? ""
        : `
<pluto-ai-context-packages>
The following packages are currently installed in this notebook: ${installed.join(", ")}.
</pluto-ai-context-packages>`
};

const AIContext = ({ cell_id, current_code }) => {
    const pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const [copied, setCopied] = hooks_pin_v113_target_es2020.useState(false);

    const notebook = /** @type{import("./Editor.js").NotebookData} */ (pluto_actions.get_notebook());

    const default_question = notebook.cell_results[cell_id]?.errored === true ? "Why does this cell error?" : "";
    const [userQuestion, setUserQuestion] = hooks_pin_v113_target_es2020.useState(default_question);

    const recursive = true;

    const prompt_args = {
        userQuestion,
        recursive,
        notebook,
        cell_id,
        current_code,
    };
    let prompt = generate_prompt(prompt_args);
    let prompt_tokens = count_openai_tokens(prompt);
    if (prompt_tokens > 3000) {
        console.log("Prompt is too long, truncating...", prompt, prompt_tokens);
        prompt = generate_prompt({
            ...prompt_args,
            recursive: false,
            truncate_limit_current_cell: 1000,
        });
        prompt_tokens = count_openai_tokens(prompt);
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    };

    const formRef = hooks_pin_v113_target_es2020.useRef(null);
    useEventListener(formRef, "submit", (e) => {
        e.preventDefault();
        copyToClipboard();
        console.log("submitted");
    });

    return html`
        <form class="ai-context-container" ref=${formRef}>
            <h2>AI Prompt Generator <em style="font-size: 0.8em; opacity: .7;">(beta)</em></h2>
            <p class="ai-context-intro">You can copy this text into an AI chat to give it context from your notebook.</p>
            <input
                type="text"
                name="pluto-ai-context-question"
                class="ai-context-question-input"
                placeholder="Type your question here..."
                autocomplete="off"
                value=${userQuestion}
                onInput=${(e) => setUserQuestion(e.target.value)}
            />
            <div class="ai-context-prompt-container">
                <button
                    class=${cl({
                        "copy-button": true,
                        "copied": copied,
                    })}
                    type="submit"
                    title="Copy to clipboard"
                >
                    ${copied ? "Copied!" : "Copy"}
                </button>
                <div
                    class=${cl({
                        "ai-context-prompt": true,
                        "ai-context-prompt-with-question": userQuestion.length > 0,
                    })}
                >
                    <pre>${prompt.trim()}</pre>
                </div>
            </div>
        </form>
    `
};

/**
 * @param {{
 *     userQuestion: string,
 *     recursive: boolean,
 *     notebook: import("./Editor.js").NotebookData,
 *     cell_id: string,
 *     current_code: string,
 *     truncate_limit_current_cell?: number,
 * }} props
 * @returns {string}
 */
const generate_prompt = ({ userQuestion, recursive, notebook, cell_id, current_code, truncate_limit_current_cell = 800 }) => {
    const current_cell = `
<pluto-ai-context-current-cell>
The current cell has the following code:

${format_code(current_code)}

${format_cell_output(notebook.cell_results[cell_id], truncate_limit_current_cell)}
</pluto-ai-context-current-cell>
`;

    const graph = notebook.cell_dependencies;

    // Get the list of upstream cells, in the order that they appear in the notebook.
    const upstream_cellids = upstream_recursive(graph, [cell_id], { recursive });
    const upstream_cells = notebook.cell_order.filter((cid) => upstream_cellids.has(cid));

    // Get the variables that are used in the current cell, which are defined in other cells.
    const upstream_direct = notebook.cell_dependencies[cell_id]?.upstream_cells_map ?? {};
    const variables_used_from_upstream = Object.entries(upstream_direct)
        .filter(([_var, upstream_cell_ids]) => upstream_cell_ids.length > 0)
        .map(([variable]) => variable);

    const variable_context = `
<pluto-ai-context-variables>
The current cell uses the following variables from other cells: ${variables_used_from_upstream.join(", ")}.

These variables are defined in the following cells:

${upstream_cells.map((cid) => format_code(notebook.cell_inputs[cid].code)).join("\n\n")}
</pluto-ai-context-variables>
`;

    const prompt = `${userQuestion}

<pluto-ai-context>
To help me answer my question, here is some auto-generated context. The code is from a Pluto Julia notebook. We are concerned with one specific cell in the notebook, called "the current cell". And you will get additional context.

When suggesting new code, give each cell its own code block, and keep global variables names as they are.

${current_cell}

${upstream_cells.length > 0 ? variable_context : ""}

${packages_context(notebook)}
</pluto-ai-context>
`;

    return prompt
};

const cell_output_to_plaintext = (/** @type {import("./Editor.js").CellResultData?} */ cell_result, /** @type {number} */ truncate_limit) => {
    if (cell_result == null) return null

    const cell_output = cell_result.output;
    if (cell_output.mime === "text/plain") {
        return cell_output.body
    }
    if (cell_output.mime === "application/vnd.pluto.stacktrace+object") {
        return cell_output.body.plain_error
    }
    if (cell_output.mime.includes("image")) return "<!-- Image -->"

    if (cell_output.mime === "text/html") {
        try {
            return JSON.stringify(cell_result, (key, value) => {
                if (typeof value === "string" && value.length > truncate_limit) {
                    return (
                        value.substring(0, truncate_limit / 2) +
                        `... <!-- ${value.length - truncate_limit / 2 - 20} CHARACTERS TRUNCATED --> ... ` +
                        value.substring(value.length - 20)
                    )
                }
                return value
            })
        } catch (e) {
            return "<!-- HTML content that couldn't be stringified -->"
        }
    }

    return JSON.stringify(cell_output)
};

/** Rough heuristic for counting tokens in a string. */
const count_openai_tokens = (text) => {
    const num_seps = text.match(/[^\p{L}]+/gmu)?.length ?? 0;
    const val1 = num_seps * 2.3;

    const val2 = text.length * 0.29;

    // Average
    return (val1 + val2) / 2
};

const ENABLE_CM_MIXED_PARSER = window.localStorage.getItem("ENABLE_CM_MIXED_PARSER") === "true";
const ENABLE_CM_SPELLCHECK = window.localStorage.getItem("ENABLE_CM_SPELLCHECK") === "true";
const ENABLE_CM_AUTOCOMPLETE_ON_TYPE =
    (window.localStorage.getItem("ENABLE_CM_AUTOCOMPLETE_ON_TYPE") ?? (/Mac/.test(navigator.platform) ? "true" : "false")) === "true";

if (ENABLE_CM_MIXED_PARSER) {
    console.log(`YOU ENABLED THE CODEMIRROR MIXED LANGUAGE PARSER
Thanks! Awesome!
Please let us know if you find any bugs...
If enough people do this, we can make it the default parser.
`);
}

// Added this so we can have people test the mixed parser, because I LIKE IT SO MUCH - DRAL
// @ts-ignore
window.PLUTO_TOGGLE_CM_MIXED_PARSER = (val = !ENABLE_CM_MIXED_PARSER) => {
    window.localStorage.setItem("ENABLE_CM_MIXED_PARSER", String(val));
    window.location.reload();
};

// @ts-ignore
window.PLUTO_TOGGLE_CM_SPELLCHECK = (val = !ENABLE_CM_SPELLCHECK) => {
    window.localStorage.setItem("ENABLE_CM_SPELLCHECK", String(val));
    window.location.reload();
};

// @ts-ignore
window.PLUTO_TOGGLE_CM_AUTOCOMPLETE_ON_TYPE = (val = !ENABLE_CM_AUTOCOMPLETE_ON_TYPE) => {
    window.localStorage.setItem("ENABLE_CM_AUTOCOMPLETE_ON_TYPE", String(val));
    window.location.reload();
};

const common_style_tags = [
    { tag: index_es_min_js.tags.comment, color: "var(--cm-color-comment)", fontStyle: "italic", filter: "none" },
    { tag: index_es_min_js.tags.variableName, color: "var(--cm-color-variable)", fontWeight: 700 },
    { tag: index_es_min_js.tags.propertyName, color: "var(--cm-color-symbol)", fontWeight: 700 },
    { tag: index_es_min_js.tags.macroName, color: "var(--cm-color-macro)", fontWeight: 700 },
    { tag: index_es_min_js.tags.typeName, filter: "var(--cm-filter-type)", fontWeight: "lighter" },
    { tag: index_es_min_js.tags.atom, color: "var(--cm-color-symbol)" },
    { tag: index_es_min_js.tags.string, color: "var(--cm-color-string)" },
    { tag: index_es_min_js.tags.special(index_es_min_js.tags.string), color: "var(--cm-color-command)" },
    { tag: index_es_min_js.tags.character, color: "var(--cm-color-literal)" },
    { tag: index_es_min_js.tags.literal, color: "var(--cm-color-literal)" },
    { tag: index_es_min_js.tags.keyword, color: "var(--cm-color-keyword)" },
    // TODO: normal operators
    { tag: index_es_min_js.tags.definitionOperator, color: "var(--cm-color-keyword)" },
    { tag: index_es_min_js.tags.logicOperator, color: "var(--cm-color-keyword)" },
    { tag: index_es_min_js.tags.controlOperator, color: "var(--cm-color-keyword)" },
    { tag: index_es_min_js.tags.bracket, color: "var(--cm-color-bracket)" },
    // TODO: tags.self, tags.null
];

const pluto_syntax_colors_julia = index_es_min_js.HighlightStyle.define(common_style_tags, {
    all: { color: `var(--cm-color-editor-text)` },
    scope: index_es_min_js.julia().language,
});

const pluto_syntax_colors_javascript = index_es_min_js.HighlightStyle.define(common_style_tags, {
    all: { color: `var(--cm-color-editor-text)`, filter: `contrast(0.5)` },
    scope: index_es_min_js.javascriptLanguage,
});

const pluto_syntax_colors_python = index_es_min_js.HighlightStyle.define(common_style_tags, {
    all: { color: `var(--cm-color-editor-text)`, filter: `contrast(0.5)` },
    scope: index_es_min_js.pythonLanguage,
});

const pluto_syntax_colors_css = index_es_min_js.HighlightStyle.define(
    [
        { tag: index_es_min_js.tags.comment, color: "var(--cm-color-comment)", fontStyle: "italic" },
        { tag: index_es_min_js.tags.variableName, color: "var(--cm-color-css-accent)", fontWeight: 700 },
        { tag: index_es_min_js.tags.propertyName, color: "var(--cm-color-css-accent)", fontWeight: 700 },
        { tag: index_es_min_js.tags.tagName, color: "var(--cm-color-css)", fontWeight: 700 },
        //{ tag: tags.className,          color: "var(--cm-css-why-doesnt-codemirror-highlight-all-the-text-aaa)" },
        //{ tag: tags.constant(tags.className), color: "var(--cm-css-why-doesnt-codemirror-highlight-all-the-text-aaa)" },
        { tag: index_es_min_js.tags.definitionOperator, color: "var(--cm-color-css)" },
        { tag: index_es_min_js.tags.keyword, color: "var(--cm-color-css)" },
        { tag: index_es_min_js.tags.modifier, color: "var(--cm-color-css-accent)" },
        { tag: index_es_min_js.tags.literal, color: "var(--cm-color-css)" },
        // { tag: tags.unit,              color: "var(--cm-color-css-accent)" },
        { tag: index_es_min_js.tags.punctuation, opacity: 0.5 },
    ],
    {
        scope: index_es_min_js.cssLanguage,
        all: { color: "var(--cm-color-css)" },
    }
);

const pluto_syntax_colors_html = index_es_min_js.HighlightStyle.define(
    [
        { tag: index_es_min_js.tags.comment, color: "var(--cm-color-comment)", fontStyle: "italic" },
        { tag: index_es_min_js.tags.content, color: "var(--cm-color-html)", fontWeight: 400 },
        { tag: index_es_min_js.tags.tagName, color: "var(--cm-color-html-accent)", fontWeight: 600 },
        { tag: index_es_min_js.tags.documentMeta, color: "var(--cm-color-html-accent)" },
        { tag: index_es_min_js.tags.attributeName, color: "var(--cm-color-html-accent)", fontWeight: 600 },
        { tag: index_es_min_js.tags.attributeValue, color: "var(--cm-color-html-accent)" },
        { tag: index_es_min_js.tags.angleBracket, color: "var(--cm-color-html-accent)", fontWeight: 600, opacity: 0.7 },
    ],
    {
        all: { color: "var(--cm-color-html)" },
        scope: index_es_min_js.htmlLanguage,
    }
);

// https://github.com/lezer-parser/markdown/blob/d4de2b03180ced4610bad9cef0ad3a805c43b63a/src/markdown.ts#L1890
const pluto_syntax_colors_markdown = index_es_min_js.HighlightStyle.define(
    [
        { tag: index_es_min_js.tags.comment, color: "var(--cm-color-comment)", fontStyle: "italic" },
        { tag: index_es_min_js.tags.content, color: "var(--cm-color-md)" },
        { tag: index_es_min_js.tags.heading, color: "var(--cm-color-md)", fontWeight: 700 },
        // TODO? tags.list
        { tag: index_es_min_js.tags.quote, color: "var(--cm-color-md)" },
        { tag: index_es_min_js.tags.emphasis, fontStyle: "italic" },
        { tag: index_es_min_js.tags.strong, fontWeight: "bolder" },
        { tag: index_es_min_js.tags.link, textDecoration: "underline" },
        { tag: index_es_min_js.tags.url, color: "var(--cm-color-md)", textDecoration: "none" },
        { tag: index_es_min_js.tags.monospace, color: "var(--cm-color-md-accent)" },

        // Marks: `-` for lists, `#` for headers, etc.
        { tag: index_es_min_js.tags.processingInstruction, color: "var(--cm-color-md-accent) !important", opacity: "0.5" },
    ],
    {
        all: { color: "var(--cm-color-md)" },
        scope: index_es_min_js.markdownLanguage,
    }
);

const getValue6 = (/** @type {EditorView} */ cm) => cm.state.doc.toString();
const setValue6 = (/** @type {EditorView} */ cm, value) =>
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
    });
const replaceRange6 = (/** @type {EditorView} */ cm, text, from, to) =>
    cm.dispatch({
        changes: { from, to, insert: text },
    });

// Compartments: https://codemirror.net/6/examples/config/
let useCompartment = (/** @type {import("../imports/Preact.js").Ref<EditorView?>} */ codemirror_ref, value) => {
    const compartment = hooks_pin_v113_target_es2020.useRef(new index_es_min_js.Compartment());
    const initial_value = hooks_pin_v113_target_es2020.useRef(compartment.current.of(value));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        codemirror_ref.current?.dispatch?.({
            effects: compartment.current.reconfigure(value),
        });
    }, [value]);

    return initial_value.current
};

const LastRemoteCodeSetTimeFacet = index_es_min_js.Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
});

let line_and_ch_to_cm6_position = (/** @type {import("../imports/CodemirrorPlutoSetup.js").Text} */ doc, { line, ch }) => {
    let line_object = doc.line(_.clamp(line + 1, 1, doc.lines));
    let ch_clamped = _.clamp(ch, 0, line_object.length);
    return line_object.from + ch_clamped
};

/**
 * @param {{
 *  local_code: string,
 *  remote_code: string,
 *  scroll_into_view_after_creation: boolean,
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 *  global_definition_locations: { [variable_name: string]: string },
 *  [key: string]: any,
 * }} props
 */
const CellInput = ({
    local_code,
    remote_code,
    disable_input,
    focus_after_creation,
    cm_forced_focus,
    set_cm_forced_focus,
    show_input,
    skip_static_fake = false,
    on_submit,
    on_delete,
    on_add_after,
    on_change,
    on_update_doc_query,
    on_focus_neighbor,
    on_line_heights,
    nbpkg,
    cell_id,
    notebook_id,
    any_logs,
    show_logs,
    set_show_logs,
    set_cell_disabled,
    cm_highlighted_line,
    cm_highlighted_range,
    metadata,
    global_definition_locations,
    cm_diagnostics,
}) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const { disabled: running_disabled, skip_as_script } = metadata;
    let [error, set_error] = hooks_pin_v113_target_es2020.useState(null);
    if (error) {
        const to_throw = error;
        set_error(null);
        throw to_throw
    }

    const notebook_id_ref = hooks_pin_v113_target_es2020.useRef(notebook_id);
    notebook_id_ref.current = notebook_id;

    const newcm_ref = hooks_pin_v113_target_es2020.useRef(/** @type {EditorView?} */ (null));
    const dom_node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    const remote_code_ref = hooks_pin_v113_target_es2020.useRef(/** @type {string?} */ (null));

    let nbpkg_compartment = useCompartment(newcm_ref, NotebookpackagesFacet.of(nbpkg));
    let global_definitions_compartment = useCompartment(newcm_ref, GlobalDefinitionsFacet.of(global_definition_locations));
    let highlighted_line_compartment = useCompartment(newcm_ref, HighlightLineFacet.of(cm_highlighted_line));
    let highlighted_range_compartment = useCompartment(newcm_ref, HighlightRangeFacet.of(cm_highlighted_range));
    let editable_compartment = useCompartment(newcm_ref, index_es_min_js.EditorState.readOnly.of(disable_input));
    let last_remote_code_set_time_compartment = useCompartment(
        newcm_ref,
        hooks_pin_v113_target_es2020.useMemo(() => LastRemoteCodeSetTimeFacet.of(Date.now()), [remote_code])
    );

    let on_change_compartment = useCompartment(
        newcm_ref,
        // Functions are hard to compare, so I useMemo manually
        hooks_pin_v113_target_es2020.useMemo(() => {
            return index_es_min_js.EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    on_change(update.state.doc.toString());
                }
            })
        }, [on_change])
    );

    const [show_static_fake_state, set_show_static_fake] = hooks_pin_v113_target_es2020.useState(!skip_static_fake);

    const show_static_fake_excuses_ref = hooks_pin_v113_target_es2020.useRef(false);
    show_static_fake_excuses_ref.current ||= navigator.userAgent.includes("Firefox") || focus_after_creation || cm_forced_focus != null || skip_static_fake;

    const show_static_fake = show_static_fake_excuses_ref.current ? false : show_static_fake_state;

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!show_static_fake) return
        let node = dom_node_ref.current;
        if (node == null) return
        let observer;

        const show = () => {
            set_show_static_fake(false);
            observer.disconnect();
            window.removeEventListener("beforeprint", show);
        };

        observer = new IntersectionObserver((e) => {
            if (e.some((e) => e.isIntersecting)) {
                show();
            }
        });

        observer.observe(node);
        window.addEventListener("beforeprint", show);
        return () => {
            observer.disconnect();
            window.removeEventListener("beforeprint", show);
        }
    }, []);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (show_static_fake) return
        if (dom_node_ref.current == null) return

        const keyMapSubmit = (/** @type {EditorView} */ cm) => {
            index_es_min_js.autocomplete.closeCompletion(cm);
            on_submit();
            return true
        };
        let run = async (fn) => await fn();
        const keyMapRun = (/** @type {EditorView} */ cm) => {
            index_es_min_js.autocomplete.closeCompletion(cm);
            run(async () => {
                // we await to prevent an out-of-sync issue
                await on_add_after();

                const new_value = cm.state.doc.toString();
                if (new_value !== remote_code_ref.current) {
                    on_submit();
                }
            });
            return true
        };

        let select_autocomplete_command = index_es_min_js.autocomplete.completionKeymap.find((keybinding) => keybinding.key === "Enter");
        let keyMapTab = (/** @type {EditorView} */ cm) => {
            // I think this only gets called when we are not in an autocomplete situation, otherwise `tab_completion_command` is called. I think it only happens when you have a selection.

            if (cm.state.readOnly) {
                return false
            }
            // This will return true if the autocomplete select popup is open
            if (select_autocomplete_command?.run?.(cm)) {
                return true
            }

            const anySelect = cm.state.selection.ranges.some((r) => !r.empty);
            if (anySelect) {
                return index_es_min_js.indentMore(cm)
            } else {
                cm.dispatch(
                    cm.state.changeByRange((selection) => ({
                        range: index_es_min_js.EditorSelection.cursor(selection.from + 1),
                        changes: { from: selection.from, to: selection.to, insert: "\t" },
                    }))
                );
                return true
            }
        };
        const keyMapMD = () => {
            const cm = /** @type{EditorView} */ (newcm_ref.current);
            const value = getValue6(cm);
            const trimmed = value.trim();
            const offset = value.length - value.trimStart().length;
            console.table({ value, trimmed, offset });
            if (trimmed.startsWith('md"') && trimmed.endsWith('"')) {
                // Markdown cell, change to code
                let start, end;
                if (trimmed.startsWith('md"""') && trimmed.endsWith('"""')) {
                    // Block markdown
                    start = 5;
                    end = trimmed.length - 3;
                } else {
                    // Inline markdown
                    start = 3;
                    end = trimmed.length - 1;
                }
                if (start >= end || trimmed.substring(start, end).trim() == "") {
                    // Corner case: block is empty after removing markdown
                    setValue6(cm, "");
                } else {
                    while (/\s/.test(trimmed[start])) {
                        ++start;
                    }
                    while (/\s/.test(trimmed[end - 1])) {
                        --end;
                    }

                    // Keep the selection from [start, end) while maintaining cursor position
                    replaceRange6(cm, "", end + offset, cm.state.doc.length);
                    // cm.replaceRange("", cm.posFromIndex(end + offset), { line: cm.lineCount() })
                    replaceRange6(cm, "", 0, start + offset);
                    // cm.replaceRange("", { line: 0, ch: 0 }, cm.posFromIndex(start + offset))
                }
            } else {
                // Replacing ranges will maintain both the focus, the selections and the cursor
                let prefix = `md"""\n`;
                let suffix = `\n"""`;
                // TODO Multicursor?
                let selection = cm.state.selection.main;
                cm.dispatch({
                    changes: [
                        { from: 0, to: 0, insert: prefix },
                        {
                            from: cm.state.doc.length,
                            to: cm.state.doc.length,
                            insert: suffix,
                        },
                    ],
                    selection:
                        selection.from === 0
                            ? {
                                  anchor: selection.from + prefix.length,
                                  head: selection.to + prefix.length,
                              }
                            : undefined,
                });
            }

            return true
        };
        const keyMapDelete = (/** @type {EditorView} */ cm) => {
            if (cm.state.facet(index_es_min_js.EditorState.readOnly)) {
                return false
            }
            if (cm.state.doc.length === 0) {
                on_focus_neighbor(cell_id, 1);
                on_delete();
                return true
            }
            return false
        };

        const keyMapBackspace = (/** @type {EditorView} */ cm) => {
            if (cm.state.facet(index_es_min_js.EditorState.readOnly)) {
                return false
            }

            // Previously this was a very elaborate timed implementation......
            // But I found out that keyboard events have a `.repeated` property which is perfect for what we want...
            // So now this is just the cell deleting logic (and the repeated stuff is in a separate plugin)
            if (cm.state.doc.length === 0) {
                // `Infinity, Infinity` means: last line, last character
                on_focus_neighbor(cell_id, -1, Infinity, Infinity);
                on_delete();
                return true
            }
            return false
        };

        const keyMapMoveLine = (/** @type {EditorView} */ cm, direction) => {
            if (cm.state.facet(index_es_min_js.EditorState.readOnly)) {
                return false
            }

            const selection = cm.state.selection.main;
            const all_is_selected = selection.anchor === 0 && selection.head === cm.state.doc.length;

            if (all_is_selected || cm.state.doc.lines === 1) {
                pluto_actions.move_remote_cells([cell_id], pluto_actions.get_notebook().cell_order.indexOf(cell_id) + (direction === -1 ? -1 : 2));

                // workaround for https://github.com/preactjs/preact/issues/4235
                // but the scrollIntoView behaviour is nice, also when the preact issue is fixed.
                requestIdleCallback(() => {
                    cm.dispatch({
                        // TODO: remove me after fix
                        selection: {
                            anchor: 0,
                            head: cm.state.doc.length,
                        },

                        // TODO: keep me after fix
                        scrollIntoView: true,
                    });
                    // TODO: remove me after fix
                    cm.focus();
                });
                return true
            } else {
                return direction === 1 ? index_es_min_js.moveLineDown(cm) : index_es_min_js.moveLineUp(cm)
            }
        };
        const keyMapFold = (/** @type {EditorView} */ cm, new_value) => {
            set_cm_forced_focus(true);
            pluto_actions.fold_remote_cells([cell_id], new_value);
            return true
        };

        const plutoKeyMaps = [
            { key: "Shift-Enter", run: keyMapSubmit },
            { key: "Ctrl-Enter", mac: "Cmd-Enter", run: keyMapRun },
            { key: "Ctrl-Enter", run: keyMapRun },
            { key: "Tab", run: keyMapTab, shift: index_es_min_js.indentLess },
            { key: "Ctrl-m", mac: "Cmd-m", run: keyMapMD },
            { key: "Ctrl-m", run: keyMapMD },
            // Codemirror6 doesn't like capslock
            { key: "Ctrl-M", run: keyMapMD },
            // TODO Move Delete and backspace to cell movement plugin
            { key: "Delete", run: keyMapDelete },
            { key: "Ctrl-Delete", run: keyMapDelete },
            { key: "Backspace", run: keyMapBackspace },
            { key: "Ctrl-Backspace", run: keyMapBackspace },
            { key: "Alt-ArrowUp", run: (x) => keyMapMoveLine(x, -1) },
            { key: "Alt-ArrowDown", run: (x) => keyMapMoveLine(x, 1) },
            { key: "Ctrl-Shift-[", mac: "Cmd-Alt-[", run: (x) => keyMapFold(x, true) },
            { key: "Ctrl-Shift-]", mac: "Cmd-Alt-]", run: (x) => keyMapFold(x, false) },
            mod_d_command,
        ];

        let DOCS_UPDATER_VERBOSE = false;
        const docs_updater = index_es_min_js.EditorView.updateListener.of((update) => {
            if (!update.view.hasFocus) {
                return
            }

            if (update.docChanged || update.selectionSet) {
                let state = update.state;
                try {
                    let result = get_selected_doc_from_state(state, DOCS_UPDATER_VERBOSE);
                    if (result != null) {
                        on_update_doc_query(result);
                    }
                } finally {
                }
            }
        });

        const unsubmitted_globals_updater = index_es_min_js.EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const before = [...update.startState.field(ScopeStateField).definitions.keys()];
                const after = [...update.state.field(ScopeStateField).definitions.keys()];

                if (!_.isEqual(before, after)) {
                    pluto_actions.set_unsubmitted_global_definitions(cell_id, after);
                }
            }
        });

        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const newcm = (newcm_ref.current = new index_es_min_js.EditorView({
            state: index_es_min_js.EditorState.create({
                doc: local_code,
                extensions: [
                    index_es_min_js.EditorView.theme({}, { dark: usesDarkTheme }),
                    // Compartments coming from react state/props
                    nbpkg_compartment,
                    highlighted_line_compartment,
                    highlighted_range_compartment,
                    global_definitions_compartment,
                    editable_compartment,
                    last_remote_code_set_time_compartment,
                    highlightLinePlugin(),
                    highlightRangePlugin(),

                    // This is waaaay in front of the keys it is supposed to override,
                    // Which is necessary because it needs to run before *any* keymap,
                    // as the first keymap will activate the keymap extension which will attach the
                    // keymap handlers at that point, which is likely before this extension.
                    // TODO Use https://codemirror.net/6/docs/ref/#state.Prec when added to pluto-codemirror-setup
                    prevent_holding_a_key_from_doing_things_across_cells,

                    pkgBubblePlugin({ pluto_actions, notebook_id_ref }),
                    ScopeStateField,
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_julia),
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_html),
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_markdown),
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_javascript),
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_python),
                    index_es_min_js.syntaxHighlighting(pluto_syntax_colors_css),
                    index_es_min_js.lineNumbers(),
                    index_es_min_js.highlightSpecialChars(),
                    index_es_min_js.history(),
                    index_es_min_js.drawSelection(),
                    index_es_min_js.EditorState.allowMultipleSelections.of(true),
                    // Multiple cursors with `alt` instead of the default `ctrl` (which we use for go to definition)
                    index_es_min_js.EditorView.clickAddsSelectionRange.of((event) => event.altKey && !event.shiftKey),
                    index_es_min_js.indentOnInput(),
                    // Experimental: Also add closing brackets for tripple string
                    // TODO also add closing string when typing a string macro
                    index_es_min_js.EditorState.languageData.of((state, pos, side) => {
                        return [{ closeBrackets: { brackets: ["(", "[", "{"] } }]
                    }),
                    index_es_min_js.closeBrackets(),
                    index_es_min_js.rectangularSelection({
                        eventFilter: (e) => e.altKey && e.shiftKey && e.button == 0,
                    }),
                    index_es_min_js.highlightSelectionMatches({ minSelectionLength: 2, wholeWords: true }),
                    bracketMatching(),
                    docs_updater,
                    unsubmitted_globals_updater,
                    tab_help_plugin,
                    // Remove selection on blur
                    index_es_min_js.EditorView.domEventHandlers({
                        blur: (event, view) => {
                            // it turns out that this condition is true *exactly* if and only if the blur event was triggered by blurring the window
                            let caused_by_window_blur = document.activeElement === view.contentDOM;

                            if (!caused_by_window_blur) {
                                // then it's caused by focusing something other than this cell in the editor.
                                // in this case, we want to collapse the selection into a single point, for aesthetic reasons.
                                setTimeout(() => {
                                    view.dispatch({
                                        selection: {
                                            anchor: view.state.selection.main.head,
                                        },
                                        scrollIntoView: false,
                                    });
                                    // and blur the DOM again (because the previous transaction might have re-focused it)
                                    view.contentDOM.blur();
                                }, 0);

                                set_cm_forced_focus(null);
                            }
                        },
                    }),
                    pluto_paste_plugin({
                        pluto_actions,
                        cell_id,
                    }),
                    // Update live docs when in a cell that starts with `?`
                    index_es_min_js.EditorView.updateListener.of((update) => {
                        if (!update.docChanged) return
                        if (update.state.doc.length > 0 && update.state.sliceDoc(0, 1) === "?") {
                            open_bottom_right_panel("docs");
                        }
                    }),
                    index_es_min_js.EditorState.tabSize.of(4),
                    index_es_min_js.indentUnit.of("\t"),
                    ...(ENABLE_CM_MIXED_PARSER
                        ? [
                              julia_mixed(),
                              index_es_min_js.markdown({
                                  defaultCodeLanguage: julia_mixed(),
                              }),
                              index_es_min_js.html(), //Provides tag closing!,
                              index_es_min_js.javascript(),
                              index_es_min_js.python(),
                              sqlLang,
                          ]
                        : [
                              //
                              index_es_min_js.julia(),
                          ]),
                    go_to_definition_plugin,
                    AiSuggestionPlugin(),
                    pluto_autocomplete({
                        request_autocomplete: async ({ query, query_full }) => {
                            let response = await timeout_promise(
                                pluto_actions.send("complete", { query, query_full }, { notebook_id: notebook_id_ref.current }),
                                5000
                            ).catch(console.warn);
                            if (!response) return null

                            let { message } = response;

                            return {
                                start: utf8index_to_ut16index(query_full ?? query, message.start),
                                stop: utf8index_to_ut16index(query_full ?? query, message.stop),
                                results: message.results,
                                too_long: message.too_long,
                            }
                        },
                        request_packages: () => pluto_actions.send("all_registered_package_names").then(({ message }) => message.results),
                        request_special_symbols: () => pluto_actions.send("complete_symbols").then(({ message }) => message),
                        on_update_doc_query: on_update_doc_query,
                        request_unsubmitted_global_definitions: () => pluto_actions.get_unsubmitted_global_definitions(),
                        cell_id,
                    }),

                    // I put plutoKeyMaps separately because I want make sure we have
                    // higher priority 😈
                    index_es_min_js.keymap.of(plutoKeyMaps),
                    index_es_min_js.keymap.of(commentKeymap),
                    // Before default keymaps (because we override some of them)
                    // but after the autocomplete plugin, because we don't want to move cell when scrolling through autocomplete
                    cell_movement_plugin({
                        focus_on_neighbor: ({ cell_delta, line, character }) => on_focus_neighbor(cell_id, cell_delta, line, character),
                    }),
                    index_es_min_js.keymap.of([...index_es_min_js.closeBracketsKeymap, ...index_es_min_js.defaultKeymap, ...index_es_min_js.historyKeymap, ...index_es_min_js.foldKeymap]),
                    index_es_min_js.placeholder("Enter cell code..."),

                    index_es_min_js.EditorView.contentAttributes.of({ spellcheck: String(ENABLE_CM_SPELLCHECK) }),

                    index_es_min_js.EditorView.lineWrapping,
                    awesome_line_wrapping,

                    // Reset diagnostics on change
                    index_es_min_js.EditorView.updateListener.of((update) => {
                        if (!update.docChanged) return
                        update.view.dispatch(index_es_min_js.setDiagnostics(update.state, []));
                    }),

                    on_change_compartment,

                    // This is my weird-ass extension that checks the AST and shows you where
                    // there're missing nodes.. I'm not sure if it's a good idea to have it
                    // show_missing_syntax_plugin(),

                    // Enable this plugin if you want to see the lezer tree,
                    // and possible lezer errors and maybe more debug info in the console:
                    // debug_syntax_plugin,
                    // Handle errors hopefully?
                    index_es_min_js.EditorView.exceptionSink.of((exception) => {
                        set_error(exception);
                        console.error("EditorView exception!", exception);
                        // alert(
                        //     `We ran into an issue! We have lost your cursor 😞😓😿\n If this appears again, please press F12, then click the "Console" tab,  eport an issue at https://github.com/fonsp/Pluto.jl/issues`
                        // )
                    }),
                ],
            }),
            parent: dom_node_ref.current,
        }));

        // For use from useDropHandler
        // @ts-ignore
        newcm.dom.CodeMirror = {
            getValue: () => getValue6(newcm),
            setValue: (x) => setValue6(newcm, x),
        };

        if (focus_after_creation) {
            setTimeout(() => {
                let view = newcm_ref.current;
                if (view == null) return
                view.dom.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
                view.dispatch({
                    selection: {
                        anchor: view.state.doc.length,
                        head: view.state.doc.length,
                    },
                    effects: [LastFocusWasForcedEffect.of(true)],
                });
                view.focus();
            });
        }

        // @ts-ignore
        const lines_wrapper_dom_node = dom_node_ref.current.querySelector("div.cm-content");
        if (lines_wrapper_dom_node) {
            const lines_wrapper_resize_observer = new ResizeObserver(() => {
                const line_nodes = lines_wrapper_dom_node.children;
                const tops = _.map(line_nodes, (c) => /** @type{HTMLElement} */ (c).offsetTop);
                const diffs = tops.slice(1).map((y, i) => y - tops[i]);
                const heights = [...diffs, 15];
                on_line_heights(heights);
            });

            lines_wrapper_resize_observer.observe(lines_wrapper_dom_node);
            return () => {
                lines_wrapper_resize_observer.unobserve(lines_wrapper_dom_node);
            }
        }
    }, [show_static_fake]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (newcm_ref.current == null) return
        const cm = newcm_ref.current;
        const diagnostics = cm_diagnostics;

        cm.dispatch(index_es_min_js.setDiagnostics(cm.state, diagnostics));
    }, [cm_diagnostics]);

    // Effect to apply "remote_code" to the cell when it changes...
    // ideally this won't be necessary as we'll have actual multiplayer,
    // or something to tell the user that the cell is out of sync.
    hooks_pin_v113_target_es2020.useEffect(() => {
        if (newcm_ref.current == null) return // Not sure when and why this gave an error, but now it doesn't

        const current_value = getValue6(newcm_ref.current) ?? "";
        if (remote_code_ref.current == null && remote_code === "" && current_value !== "") {
            // this cell is being initialized with empty code, but it already has local code set.
            // this happens when pasting or dropping cells
            return
        }
        remote_code_ref.current = remote_code;
        if (current_value !== remote_code) {
            setValue6(newcm_ref.current, remote_code);
        }
    }, [remote_code]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        const cm = newcm_ref.current;
        if (cm == null) return
        if (cm_forced_focus == null) {
            cm.dispatch({
                selection: {
                    anchor: cm.state.selection.main.head,
                    head: cm.state.selection.main.head,
                },
            });
        } else if (cm_forced_focus === true) ; else {
            let new_selection = {
                anchor: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[0]),
                head: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[1]),
            };

            if (cm_forced_focus[2]?.definition_of) {
                let scopestate = cm.state.field(ScopeStateField);
                let definition = scopestate?.definitions.get(cm_forced_focus[2]?.definition_of);
                if (definition) {
                    new_selection = {
                        anchor: definition.from,
                        head: definition.to,
                    };
                }
            }

            let dom = /** @type {HTMLElement} */ (cm.dom);
            dom.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                // UNCOMMENT THIS AND SEE, this feels amazing but I feel like people will not like it
                // block: "center",
            });

            cm.focus();
            cm.dispatch({
                scrollIntoView: true,
                selection: new_selection,
                effects: [
                    index_es_min_js.EditorView.scrollIntoView(index_es_min_js.EditorSelection.range(new_selection.anchor, new_selection.head), {
                        yMargin: 80,
                    }),
                    LastFocusWasForcedEffect.of(true),
                ],
            });
        }
    }, [cm_forced_focus]);

    return html`
        <pluto-input ref=${dom_node_ref} class="CodeMirror" translate=${false}>
            ${show_static_fake ? (show_input ? html`<${StaticCodeMirrorFaker} value=${remote_code} />` : null) : null}
            <${InputContextMenu}
                on_delete=${on_delete}
                cell_id=${cell_id}
                run_cell=${on_submit}
                skip_as_script=${skip_as_script}
                running_disabled=${running_disabled}
                any_logs=${any_logs}
                show_logs=${show_logs}
                set_show_logs=${set_show_logs}
                set_cell_disabled=${set_cell_disabled}
                get_current_code=${() => {
                    let cm = newcm_ref.current;
                    return cm == null ? "" : getValue6(cm)
                }}
            />
            ${PreviewHiddenCode}
        </pluto-input>
    `
};

const PreviewHiddenCode = html`<div class="preview_hidden_code_info">👀 Reading hidden code</div>`;

const InputContextMenu = ({
    on_delete,
    cell_id,
    run_cell,
    skip_as_script,
    running_disabled,
    any_logs,
    show_logs,
    set_show_logs,
    set_cell_disabled,
    get_current_code,
}) => {
    const timeout = hooks_pin_v113_target_es2020.useRef(null);
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const [open, setOpenState] = hooks_pin_v113_target_es2020.useState(false);
    const button_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLButtonElement?} */ (null));
    const list_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLButtonElement?} */ (null));

    const prevously_focused_element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {Element?} */ (null));
    const setOpen = (val) => {
        if (val) {
            prevously_focused_element_ref.current = document.activeElement;
        }
        setOpenState(val);
    };
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (open) {
            list_ref.current?.querySelector("button")?.focus();
        } else {
            let e = prevously_focused_element_ref.current;
            if (e instanceof HTMLElement) e.focus();
        }
    }, [open]);

    const mouseenter = () => {
        if (timeout.current) clearTimeout(timeout.current);
    };
    const toggle_skip_as_script = async (e) => {
        const new_val = !skip_as_script;
        e.preventDefault();
        // e.stopPropagation()
        await pluto_actions.update_notebook((notebook) => {
            notebook.cell_inputs[cell_id].metadata["skip_as_script"] = new_val;
        });
    };
    const toggle_running_disabled = async (e) => {
        const new_val = !running_disabled;
        await set_cell_disabled(new_val);
    };
    const toggle_logs = () => set_show_logs(!show_logs);

    const is_copy_output_supported = () => {
        let notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook());
        let cell_result = notebook?.cell_results?.[cell_id];
        if (cell_result == null) return false

        return (
            (!cell_result.errored && cell_result.output.mime === "text/plain" && cell_result.output.body != null) ||
            (cell_result.errored && cell_result.output.mime === "application/vnd.pluto.stacktrace+object")
        )
    };

    const strip_ansi_codes = (s) =>
        typeof s === "string" ? s.replace(/\x1b\[[0-9;]*m/g, "") : s;

    const copy_output = () => {
        let notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook());
        let cell_result = notebook?.cell_results?.[cell_id];
        if (cell_result == null) return

        let cell_output =
            cell_result.output.mime === "text/plain"
                ? cell_result.output.body
                : // @ts-ignore
                  cell_result.output.body.plain_error;

        if (cell_output != null)
            navigator.clipboard.writeText(strip_ansi_codes(cell_output)).catch(() => {
                alert(`Error copying cell output`);
            });
    };

    const ask_ai = () => {
        open_pluto_popup({
            type: "info",
            big: true,
            css_class: "ai-context",
            should_focus: true,
            // source_element: button_ref.current,
            body: html`<${AIContext} cell_id=${cell_id} current_code=${get_current_code()} />`,
        });
    };

    useEventListener(
        window,
        "keydown",
        (/** @type {KeyboardEvent} */ e) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        },
        []
    );

    return html`
        <button
            onClick=${(e) => {
                setOpen(!open);
            }}
            class=${cl({
                input_context_menu: true,
                open,
            })}
            title="Actions"
            ref=${button_ref}
        >
            <span class="icon"></span>
        </button>
        <div
            class=${cl({
                input_context_menu: true,
                open,
            })}
            ref=${list_ref}
            onfocusout=${(e) => {
                const li_focused = list_ref.current?.matches(":focus-within") || list_ref.current?.contains(e.relatedTarget);

                if (
                    !li_focused ||
                    // or the focus is on the list itself
                    e.relatedTarget === list_ref.current
                )
                    setOpen(false);
            }}
        >
            ${open
                ? html`<ul onMouseenter=${mouseenter}>
                      <${InputContextMenuItem} tag="delete" contents="Delete cell" title="Delete cell" onClick=${on_delete} setOpen=${setOpen} />

                      <${InputContextMenuItem}
                          title=${running_disabled ? "Enable and run the cell" : "Disable this cell, and all cells that depend on it"}
                          tag=${running_disabled ? "enable_cell" : "disable_cell"}
                          contents=${running_disabled ? html`<b>Enable cell</b>` : html`Disable cell`}
                          onClick=${toggle_running_disabled}
                          setOpen=${setOpen}
                      />
                      ${any_logs
                          ? html`<${InputContextMenuItem}
                                title=${show_logs ? "Show cell logs" : "Hide cell logs"}
                                tag=${show_logs ? "hide_logs" : "show_logs"}
                                contents=${show_logs ? "Hide logs" : "Show logs"}
                                onClick=${toggle_logs}
                                setOpen=${setOpen}
                            />`
                          : null}
                      ${is_copy_output_supported()
                          ? html`<${InputContextMenuItem}
                                tag="copy_output"
                                contents="Copy output"
                                title="Copy the output of this cell to the clipboard."
                                onClick=${copy_output}
                                setOpen=${setOpen}
                            />`
                          : null}

                      <${InputContextMenuItem}
                          title=${skip_as_script
                              ? "This cell is currently stored in the notebook file as a Julia comment. Click here to disable."
                              : "Store this code in the notebook file as a Julia comment. This way, it will not run when the notebook runs as a script outside of Pluto."}
                          tag=${skip_as_script ? "run_as_script" : "skip_as_script"}
                          contents=${skip_as_script ? html`<b>Enable in file</b>` : html`Disable in file`}
                          onClick=${toggle_skip_as_script}
                          setOpen=${setOpen}
                      />

                      ${pluto_actions.get_session_options?.()?.server?.enable_ai_editor_features !== false
                          ? html`<${InputContextMenuItem} tag="ask_ai" contents="Ask AI" title="Ask AI about this cell" onClick=${ask_ai} setOpen=${setOpen} />`
                          : null}
                  </ul>`
                : html``}
        </div>
    `
};

const InputContextMenuItem = ({ contents, title, onClick, setOpen, tag }) =>
    html`<li>
        <button
            tabindex="0"
            title=${title}
            onClick=${(e) => {
                setOpen(false);
                onClick(e);
            }}
            class=${tag}
        >
            <span class=${`${tag} ctx_icon`} />${contents}
        </button>
    </li>`;

const StaticCodeMirrorFaker = ({ value }) => {
    const lines = value.split("\n").map((line, i) => {
        const start_tabs = get_start_tabs(line);

        const tabbed_line =
            start_tabs.length == 0
                ? line
                : html`<span class="awesome-wrapping-plugin-the-tabs"><span class="ͼo">${start_tabs}</span></span
                      >${line.substring(start_tabs.length)}`;

        return html`<div class="awesome-wrapping-plugin-the-line cm-line" style="--indented: ${4 * start_tabs.length}ch;">
            ${line.length === 0 ? html`<br />` : tabbed_line}
        </div>`
    });

    return html`
        <div class="cm-editor ͼ1 ͼ2 ͼ4 ͼ4z cm-ssr-fake">
            <div tabindex="-1" class="cm-scroller">
                <div class="cm-gutters" aria-hidden="true">
                    <div class="cm-gutter cm-lineNumbers"></div>
                </div>
                <div
                    spellcheck="false"
                    autocorrect="off"
                    autocapitalize="off"
                    translate="no"
                    contenteditable="false"
                    style="tab-size: 4;"
                    class="cm-content cm-lineWrapping"
                    role="textbox"
                    aria-multiline="true"
                    aria-autocomplete="list"
                >
                    ${lines}
                </div>
            </div>
        </div>
    `
};

/**
 * Suggest AI-generated code as the new input of a cell.
 * @param {HTMLElement?} start_node Any node that is a child of a cell. AI suggestion will happen in the parent cell.
 * @param {{code: string, reject?: boolean}} detail `reject` means reject the AI suggestion.
 * @returns {Promise<void>}
 */
const start_ai_suggestion = (start_node, detail) =>
    new Promise(async (resolve, reject) => {
        const get_cm = () => start_node?.closest("pluto-cell")?.querySelector("pluto-input > .cm-editor .cm-content");
        const cm = get_cm();

        if (cm) {
            const get_live_cm = () => {
                const cm = get_cm();
                if (cm?.hasAttribute("data-currently-live")) {
                    return cm
                }
                return null
            };

            let live_cm = get_live_cm();
            if (!live_cm) {
                cm.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
            while (!live_cm) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                live_cm = get_live_cm();
            }
            live_cm.dispatchEvent(new CustomEvent("ai-suggestion", { detail }));
            resolve();
        } else {
            reject(new Error("Could not find an editor that belongs to this element"));
        }
    });

const AiSuggestionPlugin = () => {
    const compartment = new index_es_min_js.Compartment();

    const start_ai_suggestion = (/** @type {EditorView} */ view, suggested_code) => {
        const state = view.state;
        return view.dispatch({
            effects: [
                AISuggestionTimeEffect.of(Date.now()),
                compartment.reconfigure([
                    //
                    index_es_min_js.merge.unifiedMergeView({
                        original: state.doc,
                        gutter: false,
                        allowInlineDiffs: true,
                    }),
                    AllAccepted,
                    DisableMergeWhenAllAccepted(compartment),
                    DontDiffNewChanges,
                    DontDiffNewChangesInverter,
                ]),
            ],
            changes: {
                from: 0,
                to: state.doc.length,
                insert: suggested_code,
            },
        })
    };

    const disabled_extension = [];
    const reject_ai_suggestion = (/** @type {EditorView} */ view) => {
        const state = view.state;
        // @ts-ignore
        const is_active = compartment.get(state)?.length !== disabled_extension.length;
        if (!is_active) return

        const { chunks } = index_es_min_js.merge.getChunks(state) ?? {};
        if (!chunks) return
        if (chunks.length === 0) return

        const original_doc = index_es_min_js.merge.getOriginalDoc(state);
        view.dispatch({
            changes: chunks.map((chunk) => ({
                from: chunk.fromB,
                to: Math.min(state.doc.length, chunk.toB),
                insert: original_doc.slice(chunk.fromA, chunk.toA),
            })),
            effects: [compartment.reconfigure([])],
        });
    };

    const ai_event_listener = index_es_min_js.EditorView.domEventHandlers({
        "ai-suggestion": (event, view) => {
            const { code, reject, on_ } = event.detail;
            if (reject) {
                reject_ai_suggestion(view);
            } else {
                start_ai_suggestion(view, code);
            }
            return true
        },
    });

    return [AISuggestionTime, ai_event_listener, hello_im_available, compartment.of(disabled_extension)]
};

const hello_im_available = index_es_min_js.ViewPlugin.define((view) => {
    view.contentDOM.setAttribute("data-currently-live", "true");
    return {}
});

const AllAccepted = index_es_min_js.StateField.define({
    create: () => false,
    update: (all_accepted, tr) => {
        if (!tr.docChanged) ;
        return index_es_min_js.merge.getOriginalDoc(tr.state).eq(tr.newDoc)
    },
});

/**
 * @type {any}
 */
const AISuggestionTimeEffect = index_es_min_js.StateEffect.define();
const AISuggestionTime = index_es_min_js.StateField.define({
    create: () => 0,
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(AISuggestionTimeEffect)) return effect.value
        }
        return value
    },
});

const DisableMergeWhenAllAccepted = (/** @type {Compartment} */ compartment) =>
    index_es_min_js.EditorState.transactionExtender.of((tr) => {
        const code_was_submitted_after_ai_suggestion = tr.startState.field(AISuggestionTime) < tr.startState.facet(LastRemoteCodeSetTimeFacet);

        if (code_was_submitted_after_ai_suggestion || tr.startState.field(AllAccepted)) {
            console.log("auto-disabling merge");
            return {
                effects: [compartment.reconfigure([])],
            }
        }
        return null
    });

const EditWasMadeByDontDiffNewChanges = index_es_min_js.Annotation.define();

/**
 * An extension to add to the unified merge view. With this extension, when you make edits that are outside one of the existing chunks, no new chunk will be created.
 */
const DontDiffNewChanges = index_es_min_js.EditorState.transactionExtender.of((tr) => {
    if (!tr.docChanged) return null
    if (!tr.isUserEvent) return null

    const original_doc = index_es_min_js.merge.getOriginalDoc(tr.startState);
    const gc = index_es_min_js.merge.getChunks(tr.startState);
    if (!gc) return null

    const { chunks } = gc;
    if (chunks.length === 0) return null

    // Go from a position in the editable doc to the position in the original doc.
    const map_pos_to_original = (pos) => {
        let out = pos;
        for (const chunk of chunks) {
            if (chunk.fromB <= pos) {
                out = Math.max(chunk.fromA, pos + chunk.toA - chunk.toB);
            }
        }
        return out
    };

    const changes = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        for (let chunk of chunks) {
            // If the change is completely contained in a chunk, don't modify the original – just let the user edit the chunk.
            if (chunk.fromB <= fromA && toA <= chunk.toB && fromA < chunk.toB) return
        }

        // Otherwise, this is the matching change in the original doc.
        changes.push({
            from: map_pos_to_original(fromA),
            to: map_pos_to_original(toA),
            insert: inserted,
        });
    });
    if (changes.length === 0) return null

    const changes_mapped_to_original_doc = index_es_min_js.EditorState.create({ doc: original_doc }).changes(changes);
    return {
        effects: index_es_min_js.merge.originalDocChangeEffect(tr.startState, changes_mapped_to_original_doc),
        annotations: EditWasMadeByDontDiffNewChanges.of(changes_mapped_to_original_doc.invert(original_doc)),
    }
});

/** Ensure that the effects from DontDiffNewChanges are undone when you Ctrl+Z. */
const DontDiffNewChangesInverter = index_es_min_js.invertedEffects.of((tr) => {
    const an = tr.annotation(EditWasMadeByDontDiffNewChanges);
    return an ? [index_es_min_js.merge.originalDocChangeEffect(tr.state, an)] : []
});

const ai_server_url = "https://pluto-simple-llm-features.deno.dev/";
const endpoint_url = `${ai_server_url}fix-syntax-error-v1`;

const pluto_premium_llm_key = localStorage.getItem("pluto_premium_llm_key");

// Server availability state management
let serverAvailabilityPromise = null;

const checkServerAvailability = async () => {
    if (serverAvailabilityPromise === null) {
        serverAvailabilityPromise = Promise.all([
            // Check our AI endpoint
            fetch(endpoint_url, {
                method: "GET",
            })
                .then((response) => response.ok)
                .catch(() => {
                    console.warn("AI features disabled: Unable to access Pluto AI server. This may be due to network restrictions.");
                    return false
                }),
            // Check if ChatGPT domain is accessible. If not, then the uni has blocked the domain (probably) and we want to disable AI features.
            fetch("https://chat.openai.com/favicon.ico", {
                method: "HEAD",
                mode: "no-cors",
            })
                .then(() => true)
                .catch(() => {
                    console.warn("AI features disabled: Unable to access ChatGPT domain. This may be due to network restrictions.");
                    return false
                }),
        ]).then(([endpointAvailable, chatGPTAvailable]) => endpointAvailable && chatGPTAvailable);
    }
    return serverAvailabilityPromise
};

const AIPermissionPrompt = ({ onAccept, onDecline }) => {
    const [dontAskAgain, setDontAskAgain] = hooks_pin_v113_target_es2020.useState(false);

    const handleAccept = () => {
        if (dontAskAgain) {
            localStorage.setItem("pluto_ai_permission_syntax_v1", "granted");
        }
        onAccept();
    };

    const handleDecline = () => {
        onDecline();
    };

    return html`
        <div class="ai-permission-prompt">
            <h3>Use AI to fix syntax errors?</h3>
            <p>Pluto will send code from this cell to a commercial LLM service to fix syntax errors. Updated code will not run without confirmation.</p>
            <p>Submitted code can be used (anonymously) by Pluto developers to improve the AI service.</p>
            <label class="ask-next-time">
                <input type="checkbox" checked=${dontAskAgain} onChange=${(e) => setDontAskAgain(e.target.checked)} />
                Don't ask again
            </label>
            <div class="button-group" role="group">
                <button onClick=${handleDecline} class="decline" title="Decline AI syntax fix and close">No</button>
                <button onClick=${handleAccept} class="accept" title="Accept AI syntax fix and close">Yes</button>
            </div>
        </div>
    `
};

const FixWithAIButton = ({ cell_id, diagnostics, last_run_timestamp }) => {
    const pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    if (pluto_actions.get_session_options?.()?.server?.enable_ai_editor_features === false) return null

    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    const [buttonState, setButtonState] = hooks_pin_v113_target_es2020.useState("initial"); // "initial" | "loading" | "success"
    const [showButton, setShowButton] = hooks_pin_v113_target_es2020.useState(false);

    // Reset whenever a prop changes
    hooks_pin_v113_target_es2020.useEffect(() => {
        setButtonState("initial");
    }, [cell_id, diagnostics, last_run_timestamp]);

    // Check server availability when component mounts
    hooks_pin_v113_target_es2020.useEffect(() => {
        checkServerAvailability().then((available) => {
            setShowButton(available);
        });
    }, []);

    // Don't render anything if server is not available
    if (!showButton) {
        return null
    }

    const handleFixWithAI = async () => {
        // Check if we have permission stored
        const storedPermission = localStorage.getItem("pluto_ai_permission_syntax_v1");

        if (storedPermission !== "granted") {
            // Show permission prompt
            open_pluto_popup({
                type: "info",
                source_element: node_ref.current,
                body: html`<${AIPermissionPrompt}
                    onAccept=${async () => {
                        window.dispatchEvent(new CustomEvent("close pluto popup"));
                        await performFix();
                    }}
                    onDecline=${() => {
                        window.dispatchEvent(new CustomEvent("close pluto popup"));
                    }}
                />`,
            });
            return
        }

        await performFix();
    };

    const original_code_ref = hooks_pin_v113_target_es2020.useRef("");

    const performFix = async () => {
        try {
            setButtonState("loading");

            // Get the current cell's code
            const notebook = pluto_actions.get_notebook();
            const code = notebook?.cell_inputs[cell_id]?.code;
            original_code_ref.current = code;

            if (!code) {
                throw new Error("Could not find cell code")
            }

            // Combine all diagnostic messages into a single error message
            const error_message = diagnostics.map((d) => d.message).join("\n");

            const response = await fetch(endpoint_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(pluto_premium_llm_key ? { "X-Pluto-Premium-LLM-Key": pluto_premium_llm_key } : {}),
                },
                body: JSON.stringify({
                    code,
                    error_message,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fix syntax error")
            }

            const { fixed_code } = await response.json();

            console.debug("fixed_code", fixed_code);

            // Update the cell's local code without running it
            if (fixed_code.trim() == "missing") throw new Error("Failed to fix syntax error")
            await start_ai_suggestion(node_ref.current, { code: fixed_code });
            setButtonState("success");
        } catch (error) {
            console.error("Error fixing syntax:", error);
            setButtonState("initial");
            // Show error to user in UI
            open_pluto_popup({
                type: "warn",
                source_element: node_ref.current,
                body: html`<p>Failed to fix syntax error: ${error.message}</p>`,
            });
        }
    };

    const handleRejectAI = async () => {
        await start_ai_suggestion(node_ref.current, { code: original_code_ref.current, reject: true });
        setButtonState("initial");
    };

    const handleRunCell = async () => {
        await pluto_actions.set_and_run_multiple([cell_id]);
    };

    return html`<div
        class=${cl({
            "fix-with-ai": true,
            [`fix-with-ai-${buttonState}`]: true,
        })}
    >
        <button
            ref=${node_ref}
            onClick=${buttonState === "success" ? handleRunCell : handleFixWithAI}
            title=${buttonState === "success" ? "Run the fixed cell" : "Attempt to fix this syntax error using an LLM service"}
            aria-busy=${buttonState === "loading"}
            aria-live="polite"
            disabled=${buttonState === "loading"}
        >
            ${buttonState === "success" ? "Accept & Run" : buttonState === "loading" ? "Loading..." : "Fix syntax with AI"}
        </button>
        ${buttonState === "success"
            ? html`<button onClick=${handleRejectAI} class="reject-ai-fix" title="Reject the AI fix and revert to original code">Reject</button>`
            : null}
    </div>`
};

const nbsp = "\u00A0";

const extract_cell_id = (/** @type {string} */ file) => {
    if (file.includes("#@#==#")) return null
    const sep = "#==#";
    const sep_index = file.indexOf(sep);
    if (sep_index != -1) {
        return file.substring(sep_index + sep.length, sep_index + sep.length + 36)
    } else {
        return null
    }
};

const focus_line = (cell_id, line) =>
    window.dispatchEvent(
        new CustomEvent("cell_focus", {
            detail: {
                cell_id: cell_id,
                line: line,
            },
        })
    );

const DocLink = ({ frame }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    if (extract_cell_id(frame.file)) return null
    if (frame.parent_module == null) return null
    if (ignore_funccall(frame)) return null

    const funcname = frame.func;
    if (funcname === "") return null

    const nb = pluto_actions.get_notebook();
    const pkg_name = frame.source_package;
    const builtin = ["Main", "Core", "Base"].includes(pkg_name);
    const installed = nb?.nbpkg?.installed_versions?.[frame.source_package] != null;
    if (!builtin && nb?.nbpkg != null && !installed) return null

    return html` ${nbsp}<span
            ><a
                href="#"
                class="doclink"
                onClick=${(e) => {
                    e.preventDefault();
                    open_bottom_right_panel("docs");
                    pluto_actions.set_doc_query(`${frame.parent_module}.${funcname}`);
                }}
                >docs</a
            ></span
        >`
};

const noline = (line) => line == null || line < 1;

const StackFrameFilename = ({ frame, cell_id }) => {
    if (ignore_location(frame)) return null

    const frame_cell_id = extract_cell_id(frame.file);
    const line = frame.line;
    if (frame_cell_id != null) {
        return html`<a
            internal-file=${frame.file}
            href=${`#${frame_cell_id}`}
            onclick=${(e) => {
                focus_line(frame_cell_id, noline(line) ? null : line - 1);
                e.preventDefault();
            }}
        >
            ${frame_cell_id == cell_id ? "This\xa0cell" : "Other\xa0cell"}${noline(line) ? null : html`:${nbsp}<em>line${nbsp}${line}</em>`}
        </a>`
    } else {
        const sp = frame.source_package;
        const origin = ["Main", "Core", "Base"].includes(sp) ? "julia" : sp;

        const file_line = html`<em>${frame.file.replace(/#@#==#.*/, "")}${noline(frame.line) ? null : `:${frame.line}`}</em>`;

        const text = sp != null ? html`<strong>${origin}</strong>${nbsp}→${nbsp}${file_line}` : file_line;

        const href = frame?.url?.startsWith?.("https") ? frame.url : null;
        return html`<a title=${frame.path} class="remote-url" href=${href}>${text}</a>`
    }
};

const at = html`<span> from${nbsp}</span>`;

const ignore_funccall = (frame) => frame.call === "top-level scope";
const ignore_location = (frame) => frame.file === "none";

const funcname_args = (call) => {
    const anon_match = call.indexOf(")(");
    if (anon_match != -1) {
        return [call.substring(0, anon_match + 1), call.substring(anon_match + 1)]
    } else {
        const bracket_index = call.indexOf("(");
        if (bracket_index != -1) {
            return [call.substring(0, bracket_index), call.substring(bracket_index)]
        } else {
            return [call, ""]
        }
    }
};

const Funccall = ({ frame }) => {
    let [expanded_state, set_expanded] = hooks_pin_v113_target_es2020.useState(false);
    hooks_pin_v113_target_es2020.useEffect(() => {
        set_expanded(false);
    }, [frame]);

    const silly_to_hide = (frame.call_short.match(/…/g) ?? "").length <= 1 && frame.call.length < frame.call_short.length + 7;

    const expanded = expanded_state || (frame.call === frame.call_short && frame.func === funcname_args(frame.call)[0]) || silly_to_hide;

    if (ignore_funccall(frame)) return null

    const call = expanded ? frame.call : frame.call_short;

    const call_funcname_args = funcname_args(call);
    const funcname = expanded ? call_funcname_args[0] : frame.func;

    // if function name is #12 or #15#16 then it is an anonymous function

    const funcname_display = funcname.match(/^#\d+(#\d+)?$/)
        ? html`<abbr title="A (mini-)function that is defined without the 'function' keyword, but using -> or 'do'.">anonymous function</abbr>`
        : funcname;

    let inner = html`<strong>${funcname_display}</strong><${HighlightCallArgumentNames} code=${call_funcname_args[1]} />`;

    const id = hooks_pin_v113_target_es2020.useMemo(() => Math.random().toString(36).substring(7), [frame]);

    return html`<mark id=${id}>${inner}</mark> ${!expanded
            ? html`<a
                  aria-expanded=${expanded}
                  aria-controls=${id}
                  title="Display the complete type information of this function call"
                  role="button"
                  href="#"
                  onClick=${(e) => {
                      e.preventDefault();
                      set_expanded(true);
                  }}
                  >...show types...</a
              >`
            : null}`
};

const LinePreview = ({ frame, num_context_lines = 2 }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    let cell_id = extract_cell_id(frame.file);
    if (cell_id) {
        let code = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())?.cell_inputs[cell_id]?.code;

        if (code) {
            const lines = code.split("\n");
            return html`<a
                onclick=${(e) => {
                    focus_line(cell_id, frame.line - 1);
                    e.preventDefault();
                }}
                href=${`#${cell_id}`}
                class="frame-line-preview"
                ><div>
                    <pre>
${lines.map((line, i) =>
                            frame.line - 1 - num_context_lines <= i && i <= frame.line - 1 + num_context_lines
                                ? html`<${JuliaHighlightedLine} code=${line} i=${i} frameLine=${i === frame.line - 1} />`
                                : null
                        )}</pre
                    >
                </div></a
            >`
        }
    }
};

const JuliaHighlightedLine = ({ code, frameLine, i }) => {
    const code_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLPreElement?} */ (null));
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (code_ref.current) {
            code_ref.current.innerText = code;
            delete code_ref.current.dataset.highlighted;
            highlight(code_ref.current, "julia");
        }
    }, [code_ref.current, code]);

    return html`<code
        ref=${code_ref}
        style=${`--before-content: "${i + 1}";`}
        class=${cl({
            "language-julia": true,
            "frame-line": frameLine,
        })}
    ></code>`
};

const HighlightCallArgumentNames = ({ code }) => {
    const code_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLPreElement?} */ (null));
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (code_ref.current) {
            const html = code.replaceAll(/([^():{},; ]*)::/g, "<span class='argument_name'>$1</span>::");

            code_ref.current.innerHTML = html;
        }
    }, [code_ref.current, code]);

    return html`<s-span ref=${code_ref} class="language-julia"></s-span>`
};

const insert_commas_and_and = (/** @type {any[]} */ xs) => xs.flatMap((x, i) => (i === xs.length - 1 ? [x] : i === xs.length - 2 ? [x, " and "] : [x, ", "]));

const ParseError = ({ cell_id, diagnostics, last_run_timestamp }) => {
    hooks_pin_v113_target_es2020.useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("cell_diagnostics", {
                detail: {
                    cell_id,
                    diagnostics,
                },
            })
        );
        return () => window.dispatchEvent(new CustomEvent("cell_diagnostics", { detail: { cell_id, diagnostics: [] } }))
    }, [diagnostics]);

    return html`
        <jlerror class="syntax-error">
            <header>
                <p>Syntax error</p>
                <${FixWithAIButton} cell_id=${cell_id} diagnostics=${diagnostics} last_run_timestamp=${last_run_timestamp} />
            </header>
            <section>
                <div class="stacktrace-header">
                    <secret-h1>Syntax errors</secret-h1>
                </div>
                <ol>
                    ${diagnostics.map(
                        ({ message, from, to, line }) =>
                            html`<li
                                class="from_this_notebook from_this_cell important"
                                onmouseenter=${() =>
                                    cell_is_unedited(cell_id)
                                        ? window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from, to } }))
                                        : null}
                                onmouseleave=${() =>
                                    window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from: null, to: null } }))}
                            >
                                <div class="classical-frame">
                                    ${message}
                                    <div class="frame-source">${at}<${StackFrameFilename} frame=${{ file: "#==#" + cell_id, line }} cell_id=${cell_id} /></div>
                                </div>
                            </li>`
                    )}
                </ol>
            </section>
        </jlerror>
    `
};

const cell_is_unedited = (cell_id) => document.querySelector(`pluto-cell[id="${cell_id}"].code_differs`) == null;

const frame_is_important_heuristic = (frame, frame_index, limited_stacktrace, frame_cell_id) => {
    if (frame_cell_id != null) return true

    const [funcname, params] = funcname_args(frame.call);

    if (["_collect", "collect_similar", "iterate", "error", "macro expansion"].includes(funcname)) {
        return false
    }

    if (funcname.includes("throw")) return false

    // too sciency
    if (frame.inlined) return false

    // makes no sense anyways
    if (frame.line < 1) return false

    if (params == null) {
        // no type signature... must be some function call that got optimized away or something special
        // probably not directly relevant
        return false
    }

    if ((funcname.match(/#/g) ?? "").length >= 2) {
        // anonymous function: #plot#142
        return false
    }

    return true
};

const AnsiUpLine = (/** @type {{value: string}} */ { value }) => {
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    const did_ansi_up = hooks_pin_v113_target_es2020.useRef(false);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!node_ref.current) return
        node_ref.current.innerHTML = ansi_to_html(value);
        did_ansi_up.current = true;
    }, [node_ref.current, value]);

    // placeholder while waiting for AnsiUp to render, to prevent layout flash
    const without_ansi_chars = value.replace(/\u001b\[[0-9;]*m/g, "");

    return value === "" ? html`<p><br /></p>` : html`<p ref=${node_ref}>${did_ansi_up.current ? null : without_ansi_chars}</p>`
};

const ErrorMessage = ({ msg, stacktrace, plain_error, cell_id }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    const default_rewriter = {
        pattern: /.?/,
        display: (/** @type{string} */ x) => _.dropRightWhile(x.split("\n"), (s) => s === "").map((line) => html`<${AnsiUpLine} value=${line} />`),
    };
    const rewriters = [
        {
            pattern: /syntax: extra token after end of expression/,
            display: (/** @type{string} */ x) => {
                const begin_hint = html`<a
                    href="#"
                    onClick=${(e) => {
                        e.preventDefault();
                        pluto_actions.wrap_remote_cell(cell_id, "begin");
                    }}
                    >Wrap all code in a <em>begin ... end</em> block.</a
                >`;
                if (x.includes("\n\nBoundaries: ")) {
                    const boundaries = JSON.parse(x.split("\n\nBoundaries: ")[1]).map((x) => x - 1); // Julia to JS index
                    const split_hint = html`<p>
                        <a
                            href="#"
                            onClick=${(e) => {
                                e.preventDefault();
                                pluto_actions.split_remote_cell(cell_id, boundaries, true);
                            }}
                            >Split this cell into ${boundaries.length} cells</a
                        >, or
                    </p>`;
                    return html`<p>Multiple expressions in one cell.</p>
                        <p>How would you like to fix it?</p>
                        <ul>
                            <li>${split_hint}</li>
                            <li>${begin_hint}</li>
                        </ul>`
                } else {
                    return html`<p>Multiple expressions in one cell.</p>
                        <p>${begin_hint}</p>`
                }
            },
            show_stacktrace: () => false,
        },
        {
            pattern: /LoadError: cannot assign a value to variable workspace#\d+\..+ from module workspace#\d+/,
            display: () =>
                html`<p>Tried to reevaluate an <code>include</code> call, this is not supported. You might need to restart this notebook from the main menu.</p>
                    <p>
                        For a workaround, use the alternative version of <code>include</code> described here:
                        <a target="_blank" href="https://github.com/fonsp/Pluto.jl/issues/115#issuecomment-661722426">GH issue 115</a>
                    </p>
                    <p>In the future, <code>include</code> will be deprecated, and this will be the default.</p>`,
        },
        {
            pattern: /MethodError: no method matching .*\nClosest candidates are:/,
            display: (/** @type{string} */ x) => x.split("\n").map((line) => html`<p style="white-space: nowrap;">${line}</p>`),
        },
        {
            pattern: /Cyclic references among (.*)\./,
            display: (/** @type{string} */ x) =>
                x.split("\n").map((line) => {
                    const match = line.match(/Cyclic references among (.*)\./);

                    if (match) {
                        let syms_string = match[1];
                        let syms = syms_string.split(/, | and /);

                        let symbol_links = syms.map((what) => html`<a href="#${encodeURI(what)}">${what}</a>`);

                        return html`<p>Cyclic references among${" "}${insert_commas_and_and(symbol_links)}.</p>`
                    } else {
                        return html`<p>${line}</p>`
                    }
                }),
        },
        {
            pattern: /Multiple definitions for (.*)/,
            display: (/** @type{string} */ x) =>
                x.split("\n").map((line) => {
                    const match = line.match(/Multiple definitions for (.*)/);

                    if (match) {
                        // replace: remove final dot
                        let syms_string = match[1].replace(/\.$/, "");
                        let syms = syms_string.split(/, | and /);

                        let symbol_links = syms.map((what) => {
                            const onclick = (ev) => {
                                const where = document.querySelector(`pluto-cell:not([id='${cell_id}']) span[id='${encodeURI(what)}']`);
                                ev.preventDefault();
                                where?.scrollIntoView();
                            };
                            return html`<a href="#" onclick=${onclick}>${what}</a>`
                        });

                        return html`<p>Multiple definitions for${" "}${insert_commas_and_and(symbol_links)}.</p>`
                    } else {
                        return html`<p>${line}</p>`
                    }
                }),
        },
        {
            pattern: /^syntax: (.*)$/,
            display: default_rewriter.display,
            show_stacktrace: () => false,
        },
        {
            pattern: /^\s*$/,
            display: () => default_rewriter.display("Error"),
        },
        {
            pattern: /^UndefVarError: (.*) not defined/,
            display: (/** @type{string} */ x) => {
                const notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook());
                const erred_upstreams = get_erred_upstreams(notebook, cell_id);

                // Verify that the UndefVarError is indeed about a variable from an upstream cell.
                const match = x.match(/UndefVarError: (.*) not defined/);
                let sym = (match?.[1] ?? "").replaceAll("`", "");
                const undefvar_is_from_upstream = Object.values(notebook?.cell_dependencies ?? {}).some((map) =>
                    Object.keys(map.downstream_cells_map).includes(sym)
                );

                if (Object.keys(erred_upstreams).length === 0 || !undefvar_is_from_upstream) {
                    return html`<p>${x}</p>`
                }

                const symbol_links = Object.keys(erred_upstreams).map((key) => {
                    const onclick = (ev) => {
                        ev.preventDefault();
                        const where = document.querySelector(`pluto-cell[id='${erred_upstreams[key]}']`);
                        where?.scrollIntoView();
                    };
                    return html`<a href="#" onclick=${onclick}>${key}</a>`
                });

                // const plural = symbol_links.length > 1
                return html`<p><em>Another cell defining ${insert_commas_and_and(symbol_links)} contains errors.</em></p>`
            },
            show_stacktrace: () => {
                const erred_upstreams = get_erred_upstreams(pluto_actions.get_notebook(), cell_id);
                return Object.keys(erred_upstreams).length === 0
            },
        },
        {
            pattern: /^ArgumentError: Package (.*) not found in current path/,
            display: (/** @type{string} */ x) => {
                if (pluto_actions.get_notebook().nbpkg?.enabled === false) return default_rewriter.display(x)

                const match = x.match(/^ArgumentError: Package (.*) not found in current path/);
                const package_name = (match?.[1] ?? "").replaceAll("`", "");

                const pkg_terminal_value = pluto_actions.get_notebook()?.nbpkg?.terminal_outputs?.[package_name];

                return html`<p>The package <strong>${package_name}.jl</strong> could not load because it failed to initialize.</p>
                    <p>That's not nice! Things you could try:</p>
                    <ul>
                        <li>Restart the notebook.</li>
                        <li>Try a different Julia version.</li>
                        <li>Contact the developers of ${package_name}.jl about this error.</li>
                    </ul>
                    ${pkg_terminal_value == null
                        ? null
                        : html` <p>You might find useful information in the package installation log:</p>
                              <${PkgTerminalView} value=${pkg_terminal_value} />`} `
            },
            show_stacktrace: () => false,
        },
        default_rewriter,
    ];

    const matched_rewriter = rewriters.find(({ pattern }) => pattern.test(msg)) ?? default_rewriter;

    const [show_more, set_show_more] = hooks_pin_v113_target_es2020.useState(false);
    hooks_pin_v113_target_es2020.useEffect(() => {
        set_show_more(false);
    }, [msg, stacktrace, cell_id]);

    const first_stack_from_here = stacktrace.findIndex((frame) => extract_cell_id(frame.file) != null);

    const limited = !show_more && first_stack_from_here != -1 && first_stack_from_here < stacktrace.length - 1;

    const limited_stacktrace = (limited ? stacktrace.slice(0, first_stack_from_here + 1) : stacktrace).filter(
        (frame) => !(ignore_location(frame) && ignore_funccall(frame))
    );

    const first_package = get_first_package(limited_stacktrace);

    const [stacktrace_waiting_to_view, set_stacktrace_waiting_to_view] = hooks_pin_v113_target_es2020.useState(true);
    hooks_pin_v113_target_es2020.useEffect(() => {
        set_stacktrace_waiting_to_view(true);
    }, [msg, stacktrace, cell_id]);

    return html`<jlerror>
        <div class="error-header">
            <secret-h1>Error message${first_package == null ? null : ` from ${first_package}`}</secret-h1>
            <!-- <p>This message was included with the error:</p> -->
        </div>

        <header>${matched_rewriter.display(msg)}</header>
        ${stacktrace.length == 0 || !(matched_rewriter.show_stacktrace?.() ?? true)
            ? null
            : stacktrace_waiting_to_view
            ? html`<section class="stacktrace-waiting-to-view">
                  <button onClick=${() => set_stacktrace_waiting_to_view(false)}>Show stack trace...</button>
              </section>`
            : html`<section>
                  <div class="stacktrace-header">
                      <secret-h1>Stack trace</secret-h1>
                      <p>Here is what happened, the most recent locations are first:</p>
                  </div>

                  <ol>
                      ${limited_stacktrace.map((frame, frame_index) => {
                          const frame_cell_id = extract_cell_id(frame.file);
                          const from_this_notebook = frame_cell_id != null;
                          const from_this_cell = cell_id === frame_cell_id;
                          const important = frame_is_important_heuristic(frame, frame_index, limited_stacktrace, frame_cell_id);

                          return html`<li class=${cl({ from_this_notebook, from_this_cell, important })}>
                              <div class="classical-frame">
                                  <${Funccall} frame=${frame} />
                                  <div class="frame-source">
                                      ${at}<${StackFrameFilename} frame=${frame} cell_id=${cell_id} />
                                      <${DocLink} frame=${frame} />
                                  </div>
                              </div>
                              ${from_this_notebook ? html`<${LinePreview} frame=${frame} num_context_lines=${from_this_cell ? 1 : 2} />` : null}
                          </li>`
                      })}
                      ${limited
                          ? html`<li class="important">
                                <a
                                    href="#"
                                    onClick=${(e) => {
                                        set_show_more(true);
                                        e.preventDefault();
                                    }}
                                    >Show more...</a
                                >
                            </li>`
                          : null}
                  </ol>
              </section>`}
        ${pluto_actions.get_session_options?.()?.server?.dismiss_motivational_quotes !== true ? html`<${Motivation} stacktrace=${stacktrace} />` : null}
    </jlerror>`
};

const get_first_package = (limited_stacktrace) => {
    for (let [i, frame] of limited_stacktrace.entries()) {
        const frame_cell_id = extract_cell_id(frame.file);
        if (frame_cell_id) return undefined

        const important = frame_is_important_heuristic(frame, i, limited_stacktrace, frame_cell_id);
        if (!important) continue

        if (frame.source_package) return frame.source_package
    }
};

const motivational_word_probability = 0.1;
const motivational_words = [
    //
    "Don't panic!",
    "Keep calm, you got this!",
    "You got this!",
    "Goofy computer!",
    "This one is on the computer!",
    "beep boop CRASH 🤖",
    "computer bad, you GREAT!",
    "Probably not your fault!",
    "Try asking on Julia Discourse!",
    "uhmmmmmm??!",
    "Maybe time for a break? ☕️",
    "Everything is going to be okay!",
    "Computers are hard!",
    "C'est la vie !",
    "¯\\_(ツ)_/¯",
    "Oh no! 🙀",
    "oopsie 💣",
    "Be patient :)",
];

const Motivation = ({ stacktrace }) => {
    const msg = hooks_pin_v113_target_es2020.useMemo(() => {
        return Math.random() < motivational_word_probability ? motivational_words[Math.floor(Math.random() * motivational_words.length)] : null
    }, [stacktrace]);

    return msg == null ? null : html`<div class="dont-panic">${msg}</div>`
};

const get_erred_upstreams = (
    /** @type {import("./Editor.js").NotebookData?} */ notebook,
    /** @type {string} */ cell_id,
    /** @type {string[]} */ visited_edges = []
) => {
    let erred_upstreams = {};
    if (notebook != null && notebook?.cell_results?.[cell_id]?.errored) {
        const referenced_variables = Object.keys(notebook.cell_dependencies[cell_id]?.upstream_cells_map);

        referenced_variables.forEach((key) => {
            if (!visited_edges.includes(key)) {
                visited_edges.push(key);
                const cells_that_define_this_variable = notebook.cell_dependencies[cell_id]?.upstream_cells_map[key];

                cells_that_define_this_variable.forEach((upstream_cell_id) => {
                    let upstream_errored_cells = get_erred_upstreams(notebook, upstream_cell_id, visited_edges) ?? {};

                    erred_upstreams = { ...erred_upstreams, ...upstream_errored_cells };
                    // if upstream got no errors and current cell is errored
                    // then current cell is responsible for errors
                    if (Object.keys(upstream_errored_cells).length === 0 && notebook.cell_results[upstream_cell_id].errored && upstream_cell_id !== cell_id) {
                        erred_upstreams[key] = upstream_cell_id;
                    }
                });
            }
        });
    }
    return erred_upstreams
};

// this is different from OutputBody because:
// it does not wrap in <div>. We want to do that in OutputBody for reasons that I forgot (feel free to try and remove it), but we dont want it here
// i think this is because i wrote those css classes with the assumption that pluto cell output is wrapped in a div, and tree viewer contents are not
// whatever
//
// We use a `<pre>${body}` instead of `<pre><code>${body}`, also for some CSS reasons that I forgot
//
// TODO: remove this, use OutputBody instead (maybe add a `wrap_in_div` option), and fix the CSS classes so that i all looks nice again
const SimpleOutputBody = ({ mime, body, cell_id, persist_js_state, sanitize_html = true }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<${PlutoImage} mime=${mime} body=${body} />`
        case "text/plain":
            // Check if the content contains ANSI escape codes
            return html`<${ANSITextOutput} body=${body} />`
        case "application/vnd.pluto.tree+object":
            return html`<${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`
        default:
            return OutputBody({ mime, body, cell_id, persist_js_state, sanitize_html, last_run_timestamp: null })
    }
};

const More = ({ on_click_more, disable }) => {
    const [loading, set_loading] = hooks_pin_v113_target_es2020.useState(false);
    const element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    useKeyboardClickable(element_ref);

    return html`<pluto-tree-more
        ref=${element_ref}
        tabindex=${disable ? "-1" : "0"}
        role="button"
        aria-disabled=${disable ? "true" : "false"}
        disable=${disable}
        class=${loading ? "loading" : disable ? "disabled" : ""}
        onclick=${(e) => {
            if (!loading && !disable) {
                if (on_click_more() !== false) {
                    set_loading(true);
                }
            }
        }}
        >more</pluto-tree-more
    >`
};

const useKeyboardClickable = (element_ref) => {
    useEventListener(
        element_ref,
        "keydown",
        (e) => {
            if (e.key === " ") {
                e.preventDefault();
            }
            if (e.key === "Enter") {
                e.preventDefault();
                element_ref.current.click();
            }
        },
        []
    );

    useEventListener(
        element_ref,
        "keyup",
        (e) => {
            if (e.key === " ") {
                e.preventDefault();
                element_ref.current.click();
            }
        },
        []
    );
};

const prefix = ({ prefix, prefix_short }) => {
    const element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    useKeyboardClickable(element_ref);
    return html`<pluto-tree-prefix role="button" tabindex="0" ref=${element_ref}
        ><span class="long">${prefix}</span><span class="short">${prefix_short}</span></pluto-tree-prefix
    >`
};

const actions_show_more = ({ pluto_actions, cell_id, node_ref, objectid, dim }) => {
    const actions = pluto_actions ?? node_ref.current.closest("pluto-cell")._internal_pluto_actions;
    return actions.reshow_cell(cell_id ?? node_ref.current.closest("pluto-cell").id, objectid, dim)
};

const TreeView = ({ mime, body, cell_id, persist_js_state, sanitize_html = true }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    const onclick = (e) => {
        // TODO: this could be reactified but no rush
        let self = node_ref.current;
        if (!self) return
        let clicked = e.target.closest("pluto-tree-prefix") != null ? e.target.closest("pluto-tree-prefix").parentElement : e.target;
        if (clicked !== self && !self.classList.contains("collapsed")) {
            return
        }
        const parent_tree = self.parentElement?.closest("pluto-tree");
        if (parent_tree != null && parent_tree.classList.contains("collapsed")) {
            return // and bubble upwards
        }

        self.classList.toggle("collapsed");
    };
    const on_click_more = () => {
        if (node_ref.current == null || node_ref.current.closest("pluto-tree.collapsed") != null) {
            return false
        }
        return actions_show_more({
            pluto_actions,
            cell_id,
            node_ref,
            objectid: body.objectid,
            dim: 1,
        })
    };
    const more_is_noop_action = is_noop_action(pluto_actions?.reshow_cell);

    const mimepair_output = (pair) =>
        html`<${SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
    const more = html`<p-r><${More} disable=${more_is_noop_action || cell_id === "cell_id_not_known"} on_click_more=${on_click_more} /></p-r>`;

    let inner = null;
    switch (body.type) {
        case "Pair":
            const r = body.key_value;
            return html`<pluto-tree-pair class=${body.type}
                ><p-r><p-k>${mimepair_output(r[0])}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r></pluto-tree-pair
            >`
        case "circular":
            return html`<em>circular reference</em>`
        case "Array":
        case "Set":
        case "Tuple":
            inner = html`<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) =>
                        r === "more" ? more : html`<p-r>${body.type === "Set" ? "" : html`<p-k>${r[0]}</p-k>`}<p-v>${mimepair_output(r[1])}</p-v></p-r>`
                    )}</pluto-tree-items
                >`;
            break
        case "Dict":
            inner = html`<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) =>
                        r === "more" ? more : html`<p-r><p-k>${mimepair_output(r[0])}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`
                    )}</pluto-tree-items
                >`;
            break
        case "NamedTuple":
            inner = html`<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) =>
                        r === "more" ? more : html`<p-r><p-k>${r[0]}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`
                    )}</pluto-tree-items
                >`;
            break
        case "struct":
            inner = html`<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) => html`<p-r><p-k>${r[0]}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`)}</pluto-tree-items
                >`;
            break
    }

    return html`<pluto-tree class="collapsed ${body.type}" onclick=${onclick} ref=${node_ref}>${inner}</pluto-tree>`
};

const EmptyCols = ({ colspan = 999 }) => html`<thead>
    <tr class="empty">
        <td colspan=${colspan}>
            <div>⌀ <small>(This table has no columns)</small></div>
        </td>
    </tr>
</thead>`;

const EmptyRows = ({ colspan = 999 }) => html`<tr class="empty">
    <td colspan=${colspan}>
        <div>
            <div>⌀</div>
            <small>(This table has no rows)</small>
        </div>
    </td>
</tr>`;

const TableView = ({ mime, body, cell_id, persist_js_state, sanitize_html }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const node_ref = hooks_pin_v113_target_es2020.useRef(null);

    const mimepair_output = (pair) =>
        html`<${SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
    const more = (dim) => html`<${More}
        on_click_more=${() =>
            actions_show_more({
                pluto_actions,
                cell_id,
                node_ref,
                objectid: body.objectid,
                dim,
            })}
    />`;
    // More than the columns, not big enough to break Firefox (https://bugzilla.mozilla.org/show_bug.cgi?id=675417)
    const maxcolspan = 3 + (body?.schema?.names?.length ?? 1);
    const thead =
        (body?.schema?.names?.length ?? 0) === 0
            ? html`<${EmptyCols} colspan=${maxcolspan} />`
            : html`<thead>
                  <tr class="schema-names">
                      ${["", ...body.schema.names].map((x) => html`<th>${x === "more" ? more(2) : x}</th>`)}
                  </tr>
                  <tr class="schema-types">
                      ${["", ...body.schema.types].map((x) => html`<th>${x === "more" ? null : x}</th>`)}
                  </tr>
              </thead>`;

    const tbody = html`<tbody>
        ${(body.rows?.length ?? 0) !== 0
            ? body.rows.map(
                  (row) =>
                      html`<tr>
                          ${row === "more"
                              ? html`<td class="pluto-tree-more-td" colspan=${maxcolspan}>${more(1)}</td>`
                              : html`<th>${row[0]}</th>
                                    ${row[1].map((x) => html`<td><div>${x === "more" ? null : mimepair_output(x)}</div></td>`)}`}
                      </tr>`
              )
            : html`<${EmptyRows} colspan=${maxcolspan} />`}
    </tbody>`;

    return html`<table class="pluto-table" ref=${node_ref}>
        ${thead}${tbody}
    </table>`
};

let DivElement = ({ cell_id, style, classname, children, persist_js_state = false, sanitize_html = true }) => {
    const mimepair_output = (pair) =>
        html`<${SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;

    return html`<div style=${style} class=${classname}>${children.map(mimepair_output)}</div>`
};

// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"
// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"


/**
 * Copied from the observable stdlib source, but we need it to be faster than Generator.input because Generator.input is async by nature, so will lag behind that one tick that is breaking the code.
 * https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js#L13
 * @param {Element} input
 * @returns {any}
 */
function get_input_value(input) {
    if (input instanceof HTMLInputElement) {
        switch (input.type) {
            case "range":
            case "number":
                return input.valueAsNumber
            case "date":
                // "time" uses .value, which is a string. This matches observable.
                return input.valueAsDate
            case "checkbox":
                return input.checked
            case "file":
                return input.multiple ? input.files : input.files?.[0]
            default:
                return input.value
        }
    } else if (input instanceof HTMLSelectElement && input.multiple) {
        return Array.from(input.selectedOptions, (o) => o.value)
    } else {
        //@ts-ignore
        return input.value
    }
}

/**
 * Copied from the observable stdlib source (https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js) without modifications.
 * @param {Element} input
 * @returns {string}
 */
function eventof(input) {
    //@ts-ignore
    switch (input.type) {
        case "button":
        case "submit":
        case "checkbox":
            return "click"
        case "file":
            return "change"
        default:
            return "input"
    }
}

/**
 * Copied from the observable stdlib source (https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js) but using our own `get_input_value` for consistency.
 * @param {Element} input
 * @returns
 */
function input_generator(input) {
    return observablehq_for_myself.Generators.observe(function (change) {
        var event = eventof(input),
            value = get_input_value(input);
        function inputted() {
            change(get_input_value(input));
        }
        input.addEventListener(event, inputted);
        if (value !== undefined) change(value);
        return function () {
            input.removeEventListener(event, inputted);
        }
    })
}

/**
 * @param {Element} input
 * @param {any} new_value
 */
const set_input_value = (input, new_value) => {
    if (input instanceof HTMLInputElement && input.type === "file") {
        return
    }
    if (new_value == null) {
        //@ts-ignore
        input.value = new_value;
        return
    }
    if (input instanceof HTMLInputElement) {
        switch (input.type) {
            case "range":
            case "number": {
                if (input.valueAsNumber !== new_value) {
                    input.valueAsNumber = new_value;
                }
                return
            }
            case "date": {
                if (input.valueAsDate == null || Number(input.valueAsDate) !== Number(new_value)) {
                    input.valueAsDate = new_value;
                }
                return
            }
            case "checkbox": {
                if (input.checked !== new_value) {
                    input.checked = new_value;
                }
                return
            }
            case "file": {
                // Can't set files :(
                return
            }
        }
    } else if (input instanceof HTMLSelectElement && input.multiple) {
        for (let option of Array.from(input.options)) {
            option.selected = new_value.includes(option.value);
        }
        return
    }
    //@ts-ignore
    if (input.value !== new_value) {
        //@ts-ignore
        input.value = new_value;
    }
};

/**
 * @param {NodeListOf<Element>} bond_nodes
 * @param {import("../components/Editor.js").BondValuesDict} bond_values
 */
const set_bound_elements_to_their_value = (bond_nodes, bond_values) => {
    bond_nodes.forEach((bond_node) => {
        let bond_name = bond_node.getAttribute("def");
        if (bond_name != null && bond_node.firstElementChild != null && bond_values[bond_name] != null) {
            let val = bond_values[bond_name].value;
            try {
                set_input_value(bond_node.firstElementChild, val);
            } catch (error) {
                console.error(`Error while setting input value`, bond_node.firstElementChild, `to value`, val, `: `, error);
            }
        }
    });
};

/**
 * @param {NodeListOf<Element>} bond_nodes
 * @param {Promise<void>} invalidation
 */
const add_bonds_disabled_message_handler = (bond_nodes, invalidation) => {
    bond_nodes.forEach((bond_node) => {
        const listener = (e) => {
            if (e.target.closest(".bonds_disabled:where(.offer_binder, .offer_local)")) {
                open_pluto_popup({
                    type: "info",
                    source_element: e.target,
                    body: html`${`You are viewing a static document. `}
                        <a
                            href="#"
                            onClick=${(e) => {
                                //@ts-ignore
                                window.open_edit_or_run_popup();
                                e.preventDefault();
                                window.dispatchEvent(new CustomEvent("close pluto popup"));
                            }}
                            >Run this notebook</a
                        >
                        ${` to enable interactivity.`}`,
                });
            }
        };
        bond_node.addEventListener("click", listener);
        invalidation.then(() => {
            bond_node.removeEventListener("click", listener);
        });
    });
};

/**
 * @param {NodeListOf<Element>} bond_nodes
 * @param {(name: string, value: any) => Promise} on_bond_change
 * @param {import("../components/Editor.js").BondValuesDict} known_values Object of variable names that already have a value in the state, which we may not want to send the initial bond value for. When reloading the page, bonds are set to their values from the state, and we don't want to trigger a change event for those.
 * @param {Promise<void>} invalidation
 */
const add_bonds_listener = (bond_nodes, on_bond_change, known_values, invalidation) => {
    // the <bond> node will be invalidated when the cell re-evaluates. when this happens, we need to stop processing input events
    let node_is_invalidated = false;

    invalidation.then(() => {
        node_is_invalidated = true;
    });

    bond_nodes.forEach(async (bond_node) => {
        const name = bond_node.getAttribute("def");
        const bound_element_node = bond_node.firstElementChild;
        if (name != null && bound_element_node != null) {
            const initial_value = get_input_value(bound_element_node);

            let skip_initialize = Object.keys(known_values).includes(name) && _.isEqual(known_values[name]?.value, initial_value);
            // Initialize the bond. This will send the data to the backend for the first time. If it's already there, and the value is the same, cells won't rerun.
            const init_promise = skip_initialize ? null : on_bond_change(name, initial_value).catch(console.error);

            // see the docs on Generators.input from observablehq/stdlib
            let skippped_first = false;
            for (let val of input_generator(bound_element_node)) {
                if (node_is_invalidated) break

                if (skippped_first === false) {
                    skippped_first = true;
                    continue
                }
                // wait for a new input value. If a value is ready, then this promise resolves immediately
                const to_send = await transformed_val(await val);

                // send to the Pluto back-end (have a look at set_bond in Editor.js)
                // await the setter to avoid collisions
                //TODO : get this from state
                await init_promise;
                await on_bond_change(name, to_send).catch(console.error);
            }
        }
    });
};

/**
 * The identity function in most cases, loads file contents when appropriate
 * @type {((val: FileList) => Promise<Array<File>>)
 *  & ((val: File) => Promise<{ name: string, type: string, data: Uint8Array }>)
 *  & ((val: any) => Promise<any>)
 * }
 */
const transformed_val = async (val) => {
    if (val instanceof FileList) {
        return Promise.all(Array.from(val).map((file) => transformed_val(file)))
    } else if (val instanceof File) {
        return await new Promise((res) => {
            const reader = new FileReader();
            // @ts-ignore
            reader.onload = () => res({ name: val.name, type: val.type, data: new Uint8Array(reader.result) });
            reader.onerror = () => res({ name: val.name, type: val.type, data: null });
            reader.readAsArrayBuffer(val);
        })
    } else {
        return val
    }
};

// @ts-nocheck


function register(Component, tagName, propNames, options) {
	function PreactElement() {
		const inst = Reflect.construct(HTMLElement, [], PreactElement);
		inst._vdomComponent = Component;
		inst._root =
			inst;
		return inst;
	}
	PreactElement.prototype = Object.create(HTMLElement.prototype);
	PreactElement.prototype.constructor = PreactElement;
	PreactElement.prototype.connectedCallback = connectedCallback;
	PreactElement.prototype.attributeChangedCallback = attributeChangedCallback;
	PreactElement.prototype.disconnectedCallback = disconnectedCallback;

	propNames =
		propNames ||
		Component.observedAttributes ||
		Object.keys(Component.propTypes || {});
	PreactElement.observedAttributes = propNames;

	// Keep DOM properties and Preact props in sync
	propNames.forEach((name) => {
		Object.defineProperty(PreactElement.prototype, name, {
			get() {
				return this._vdom.props[name];
			},
			set(v) {
				if (this._vdom) {
					this.attributeChangedCallback(name, null, v);
				} else {
					if (!this._props) this._props = {};
					this._props[name] = v;
					this.connectedCallback();
				}

				// Reflect property changes to attributes if the value is a primitive
				const type = typeof v;
				if (
					v == null ||
					type === 'string' ||
					type === 'boolean' ||
					type === 'number'
				) {
					this.setAttribute(name, v);
				}
			},
		});
	});

	return customElements.define(
		tagName,
		PreactElement
	);
}

function ContextProvider(props) {
	this.getChildContext = () => props.context;
	// eslint-disable-next-line no-unused-vars
	const { context, children, ...rest } = props;
	return preact_10_13_2_pin_v113_target_es2020.cloneElement(children, rest);
}

function connectedCallback() {
	if(this.on_connect){
		this.on_connect();
	} else {
		// Obtain a reference to the previous context by pinging the nearest
		// higher up node that was rendered with Preact. If one Preact component
		// higher up receives our ping, it will set the `detail` property of
		// our custom event. This works because events are dispatched
		// synchronously.
		const event = new CustomEvent('_preact', {
			detail: {},
			bubbles: true,
			cancelable: true,
		});
		this.dispatchEvent(event);
		const context = event.detail.context;
	
		this._vdom = preact_10_13_2_pin_v113_target_es2020.h(
			ContextProvider,
			{ ...this._props, context },
			toVdom(this, this._vdomComponent)
		);
		(this.hasAttribute('hydrate') ? preact_10_13_2_pin_v113_target_es2020.hydrate : preact_10_13_2_pin_v113_target_es2020.render)(this._vdom, this._root);
	}
}

function toCamelCase(str) {
	return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''));
}

function attributeChangedCallback(name, oldValue, newValue) {
	if (!this._vdom) return;
	// Attributes use `null` as an empty value whereas `undefined` is more
	// common in pure JS components, especially with default parameters.
	// When calling `node.removeAttribute()` we'll receive `null` as the new
	// value. See issue #50.
	newValue = newValue == null ? undefined : newValue;
	const props = {};
	props[name] = newValue;
	props[toCamelCase(name)] = newValue;
	this._vdom = preact_10_13_2_pin_v113_target_es2020.cloneElement(this._vdom, props);
	preact_10_13_2_pin_v113_target_es2020.render(this._vdom, this._root);
}

function disconnectedCallback() {
	// instead of disconnecting right now, we have a 1sec grace period, in case the component is re-attached to the DOM
	// rea-attaching to the DOM means that it was "moved" in the DOM, rather than removed.
	const handle = setTimeout(() => {
		preact_10_13_2_pin_v113_target_es2020.render((this._vdom = null), this._root);
	}, 500);
	this.on_connect = () => clearTimeout(handle);
}

/**
 * Pass an event listener to each `<slot>` that "forwards" the current
 * context value to the rendered child. The child will trigger a custom
 * event, where will add the context value to. Because events work
 * synchronously, the child can immediately pull of the value right
 * after having fired the event.
 */
function Slot(props, context) {
	const ref = (r) => {
		if (!r) {
			this.ref.removeEventListener('_preact', this._listener);
		} else {
			this.ref = r;
			if (!this._listener) {
				this._listener = (event) => {
					event.stopPropagation();
					event.detail.context = context;
				};
				r.addEventListener('_preact', this._listener);
			}
		}
	};
	return preact_10_13_2_pin_v113_target_es2020.h('slot', { ...props, ref });
}

function toVdom(element, nodeName) {
	if (element.nodeType === 3) return element.data;
	if (element.nodeType !== 1) return null;
	let children = [],
		props = {},
		i = 0,
		a = element.attributes,
		cn = element.childNodes;
	for (i = a.length; i--; ) {
		if (a[i].name !== 'slot') {
			props[a[i].name] = a[i].value;
			props[toCamelCase(a[i].name)] = a[i].value;
		}
	}

	for (i = cn.length; i--; ) {
		const vnode = toVdom(cn[i], null);
		// Move slots correctly
		const name = cn[i].slot;
		if (name) {
			props[name] = preact_10_13_2_pin_v113_target_es2020.h(Slot, { name }, vnode);
		} else {
			children[i] = vnode;
		}
	}

	// Only wrap the topmost node with a slot
	const wrappedChildren = nodeName ? preact_10_13_2_pin_v113_target_es2020.h(Slot, null, children) : children;
	return preact_10_13_2_pin_v113_target_es2020.h(nodeName || element.nodeName.toLowerCase(), props, wrappedChildren);
}

// @ts-ignore

hljs.registerLanguage("julia", hljs_julia);
hljs.registerLanguage("julia-repl", hljs_juliarepl);

// Attach the highlighter object to the window to allow custom highlighting from the frontend. See https://github.com/fonsp/Pluto.jl/pull/2244
//@ts-ignore
window.hljs = hljs;

const SafePreviewUI = ({ process_waiting_for_permission, risky_file_source, restart, warn_about_untrusted_code }) => {
    return html`
        <div class="outline-frame safe-preview"></div>
        ${process_waiting_for_permission
            ? html`<div class="outline-frame-actions-container safe-preview">
                  <div class="safe-preview-info">
                      <span
                          >Safe preview
                          <button
                              onclick=${(e) => {
                                  open_pluto_popup({
                                      type: "info",
                                      big: true,
                                      should_focus: true,
                                      body: html`
                                          <h1>Safe preview</h1>
                                          <p>You are reading and editing this file without running Julia code.</p>

                                          <p>
                                              ${`When you are ready, you can `}<a
                                                  href="#"
                                                  onClick=${(e) => {
                                                      e.preventDefault();
                                                      restart(true);
                                                      window.dispatchEvent(new CustomEvent("close pluto popup"));
                                                  }}
                                                  >run this notebook</a
                                              >.
                                          </p>
                                          ${warn_about_untrusted_code
                                              ? html`
                                                    <pluto-output class="rich_output"
                                                        ><div class="markdown">
                                                            <div class="admonition warning">
                                                                <p class="admonition-title">Warning</p>
                                                                <p>Are you sure that you trust this file?</p>
                                                                ${risky_file_source == null ? null : html`<p><code>${risky_file_source}</code></pre>`}
                                                                <p>A malicious notebook can steal passwords and data.</p>
                                                            </div>
                                                        </div></pluto-output
                                                    >
                                                `
                                              : null}
                                      `,
                                  });
                              }}
                          >
                              <span><span class="info-icon pluto-icon"></span></span>
                          </button>
                      </span>
                  </div>
              </div>`
            : null}
    `
};

const SafePreviewOutput = () => {
    return html`<pluto-output class="rich_output"
        ><div class="safe-preview-output">
            <span class="offline-icon pluto-icon"></span><span>${`Code not executed in `}<em>Safe preview</em></span>
        </div></pluto-output
    >`
};

const SafePreviewSanitizeMessage = `<div class="safe-preview-output">
<span class="offline-icon pluto-icon"></span><span>${`Scripts and styles not rendered in `}<em>Safe preview</em></span>
</div>`;

const prettyAssignee = (assignee) =>
    assignee && assignee.startsWith("const ") ? html`<span style="color: var(--cm-color-keyword)">const</span> ${assignee.slice(6)}` : assignee;

class CellOutput extends preact_10_13_2_pin_v113_target_es2020.Component {
    constructor() {
        super();
        this.state = {
            output_changed_once: false,
        };

        this.old_height = 0;
        // @ts-ignore Is there a way to use the latest DOM spec?
        this.resize_observer = new ResizeObserver((entries) => {
            const new_height = this.base.offsetHeight;

            // Scroll the page to compensate for change in page height:
            if (document.body.querySelector("pluto-cell:focus-within")) {
                const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output"); // CSS wizardry ✨
                if (
                    !(document.activeElement?.tagName === "SUMMARY") &&
                    (cell_outputs_after_focused.length === 0 || !Array.from(cell_outputs_after_focused).includes(this.base))
                ) {
                    window.scrollBy(0, new_height - this.old_height);
                }
            }

            this.old_height = new_height;
        });
    }

    shouldComponentUpdate({ last_run_timestamp, sanitize_html }) {
        return last_run_timestamp !== this.props.last_run_timestamp || sanitize_html !== this.props.sanitize_html
    }

    componentDidUpdate(old_props) {
        if (this.props.last_run_timestamp !== old_props.last_run_timestamp) {
            this.setState({ output_changed_once: true });
        }
    }

    componentDidMount() {
        this.resize_observer.observe(this.base);
    }

    componentWillUnmount() {
        this.resize_observer.unobserve(this.base);
    }

    render() {
        const rich_output =
            this.props.errored ||
            !this.props.body ||
            (this.props.mime !== "application/vnd.pluto.tree+object" &&
                this.props.mime !== "application/vnd.pluto.table+object" &&
                this.props.mime !== "text/plain");
        const allow_translate = !this.props.errored && rich_output;
        return html`
            <pluto-output
                class=${cl({
                    rich_output,
                    scroll_y: this.props.mime === "application/vnd.pluto.table+object" || this.props.mime === "text/plain",
                })}
                translate=${allow_translate}
                mime=${this.props.mime}
                aria-live=${this.state.output_changed_once ? "polite" : "off"}
                aria-atomic="true"
                aria-relevant="all"
                aria-label=${this.props.rootassignee == null ? "Result of unlabeled cell:" : `Result of variable ${this.props.rootassignee}:`}
            >
                <assignee aria-hidden="true" translate=${false}>${prettyAssignee(this.props.rootassignee)}</assignee>
                <${OutputBody} ...${this.props} />
            </pluto-output>
        `
    }
}

let PlutoImage = ({ body, mime }) => {
    // I know I know, this looks stupid.
    // BUT it is necessary to make sure the object url is only created when we are actually attaching to the DOM,
    // and is removed when we are detatching from the DOM
    let imgref = hooks_pin_v113_target_es2020.useRef();
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: mime }));

        imgref.current.onload = imgref.current.onerror = () => {
            if (imgref.current) {
                imgref.current.style.display = null;
            }
        };
        if (imgref.current.src === "") {
            // an <img> that is loading takes up 21 vertical pixels, which causes a 1-frame scroll flicker
            // the solution is to make the <img> invisible until the image is loaded
            imgref.current.style.display = "none";
        }
        imgref.current.type = mime;
        imgref.current.src = url;

        return () => URL.revokeObjectURL(url)
    }, [body, mime]);

    return html`<img ref=${imgref} type=${mime} src=${""} />`
};

/**
 * @param {{
 *  mime: string,
 * body: any,
 * cell_id: string,
 * persist_js_state: boolean | string,
 * last_run_timestamp: number?,
 * sanitize_html?: boolean | string,
 * }} args
 */
const OutputBody = ({ mime, body, cell_id, persist_js_state = false, last_run_timestamp, sanitize_html = true }) => {
    // These two arguments might have been passed as strings if OutputBody was used as the custom HTML element <pluto-display>, with string attributes as arguments.
    sanitize_html = sanitize_html !== "false" && sanitize_html !== false;
    persist_js_state = persist_js_state === "true" || persist_js_state === true;

    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<div><${PlutoImage} mime=${mime} body=${body} /></div>`
        case "text/html":
            // Snippets starting with <!DOCTYPE or <html are considered "full pages" that get their own iframe.
            // Not entirely sure if this works the best, or if this slows down notebooks with many plots.
            // AFAIK JSServe and Plotly both trigger this code.
            // NOTE: Jupyter doesn't do this, jupyter renders everything directly in pages DOM.
            //                                                                   -DRAL
            if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
                return sanitize_html ? null : html`<${IframeContainer} body=${body} />`
            } else {
                return html`<${RawHTMLContainer}
                    cell_id=${cell_id}
                    body=${body}
                    persist_js_state=${persist_js_state}
                    last_run_timestamp=${last_run_timestamp}
                    sanitize_html=${sanitize_html}
                />`
            }
        case "application/vnd.pluto.tree+object":
            return html`<div>
                <${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />
            </div>`
        case "application/vnd.pluto.table+object":
            return html`<${TableView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`
        case "application/vnd.pluto.parseerror+object":
            return html`<div><${ParseError} cell_id=${cell_id} last_run_timestamp=${last_run_timestamp} ...${body} /></div>`
        case "application/vnd.pluto.stacktrace+object":
            return html`<div><${ErrorMessage} cell_id=${cell_id} ...${body} /></div>`
        case "application/vnd.pluto.divelement+object":
            return DivElement({ cell_id, ...body, persist_js_state, sanitize_html })
        case "text/plain":
            if (body) {
                return html`<div><${ANSITextOutput} body=${body} /></div>`
            } else {
                return html`<div></div>`
            }
        case null:
        case undefined:
        case "":
            return html``
        default:
            return html`<pre title="Something went wrong displaying this object">🛑</pre>`
    }
};

register(OutputBody, "pluto-display", ["mime", "body", "cell_id", "persist_js_state", "last_run_timestamp", "sanitize_html"]);

let IframeContainer = ({ body }) => {
    let iframeref = hooks_pin_v113_target_es2020.useRef();
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: "text/html" }));
        iframeref.current.src = url;

        run$1(async () => {
            await new Promise((resolve) => iframeref.current.addEventListener("load", () => resolve(null)));

            /** @type {Document} */
            let iframeDocument = iframeref.current.contentWindow.document;
            /** Grab the <script> tag for the iframe content window resizer */
            let original_script_element = /** @type {HTMLScriptElement} */ (document.querySelector("#iframe-resizer-content-window-script"));

            // Insert iframe resizer inside the iframe
            let iframe_resizer_content_script = iframeDocument.createElement("script");
            iframe_resizer_content_script.src = original_script_element.src;
            iframe_resizer_content_script.crossOrigin = "anonymous";
            iframeDocument.head.appendChild(iframe_resizer_content_script);

            // Apply iframe resizer from the host side
            new Promise((resolve) => iframe_resizer_content_script.addEventListener("load", () => resolve(null)));
            // @ts-ignore
            window.iFrameResize({ checkOrigin: false }, iframeref.current);
        });

        return () => URL.revokeObjectURL(url)
    }, [body]);

    return html`<iframe
        style=${{ width: "100%", border: "none" }}
        src=""
        ref=${iframeref}
        frameborder="0"
        allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; layout-animations; legacy-image-formats; magnetometer; microphone; midi; navigation-override; oversized-images; payment; picture-in-picture; publickey-credentials-get; sync-xhr; usb; wake-lock; screen-wake-lock; vr; web-share; xr-spatial-tracking"
        allowfullscreen
    ></iframe>`
};

/**
 * Call a block of code with with environment inserted as local bindings (even this)
 *
 * @param {{ code: string, environment: { [name: string]: any } }} options
 */
let execute_dynamic_function = async ({ environment, code }) => {
    // single line so that we don't affect line numbers in the stack trace
    const wrapped_code = `"use strict"; return (async () => {${code}})()`;

    let { ["this"]: this_value, ...args } = environment;
    let arg_names = Object.keys(args);
    let arg_values = Object.values(args);
    const result = await Function(...arg_names, wrapped_code).bind(this_value)(...arg_values);
    return result
};

/**
 * It is possible for `execute_scripttags` to run during the execution of `execute_scripttags`, and this variable counts the depth of this nesting.
 *
 * One case where nesting occurs is when using PlutoRunner.embed_display. In its HTML render, it outputs a `<script>`, which will render a `<pluto-display>` element with content. If that content contains a `<script>` tag, then it will be executed during the execution of the original script, etc.
 *
 * See https://github.com/fonsp/Pluto.jl/pull/2329
 */
let nested_script_execution_level = 0;

/**
 * Runs the code `fn` with `document.currentScript` being set to a new script_element thats
 * is placed on the page where `script_element` was.
 *
 * Why? So we can run the javascript code with extra cool Pluto variables and return value,
 * but still have a script at the same position as `document.currentScript`.
 * This way you can do `document.currentScript.insertBefore()` and have it work!
 *
 * This will remove the passed in `script_element` from the DOM!
 *
 * @param {HTMLOrSVGScriptElement} script_element
 * @param {() => any} fn
 */
let execute_inside_script_tag_that_replaces = async (script_element, fn) => {
    // Mimick as much as possible from the original script (only attributes but sure)
    let new_script_tag = document.createElement("script");
    for (let attr of script_element.attributes) {
        //@ts-ignore because of https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1260
        new_script_tag.attributes.setNamedItem(attr.cloneNode(true));
    }
    const container_name = `____FUNCTION_TO_RUN_INSIDE_SCRIPT_${nested_script_execution_level}`;
    new_script_tag.textContent = `{
        window.${container_name}.result = window.${container_name}.function_to_run(window.${container_name}.currentScript)
    }`;

    // @ts-ignore
    // I use this long variable name to pass the function and result to and from the script we created
    window[container_name] = { function_to_run: fn, currentScript: new_script_tag, result: null };
    // Put the script in the DOM, this will run the script
    const parent = script_element.parentNode;
    if (parent == null) {
        throw "Failed to execute script it has no parent in DOM."
    }
    parent.replaceChild(new_script_tag, script_element);
    // @ts-ignore - Get the result back
    let result = await window[container_name].result;
    // @ts-ignore - Reset the global variable "just in case"
    window[container_name] = { function_to_run: fn, result: null };

    return { node: new_script_tag, result: result }
};

const is_displayable = (result) => result instanceof Element && result.nodeType === Node.ELEMENT_NODE;

/**
 * @typedef {HTMLScriptElement} PlutoScript
 * @property {boolean?} pluto_is_loading_me
 */

/**
 *
 * @param {{
 * root_node: HTMLElement,
 * script_nodes: Array<PlutoScript>,
 * previous_results_map: Map,
 * invalidation: Promise<void>,
 * pluto_actions: any,
 * }} param0
 * @returns
 */
const execute_scripttags = async ({ root_node, script_nodes, previous_results_map, invalidation, pluto_actions }) => {
    let results_map = new Map();

    // Reattach DOM results from old scripts, you might want to skip reading this
    for (let node of script_nodes) {
        if (node.src != null && node.src !== "") ; else {
            let script_id = node.id;
            let old_result = script_id ? previous_results_map.get(script_id) : null;
            if (is_displayable(old_result)) {
                node.parentElement?.insertBefore(old_result, node);
            }
        }
    }

    // Run scripts sequentially
    for (let node of script_nodes) {
        nested_script_execution_level += 1;
        if (node.src != null && node.src !== "") {
            // If it has a remote src="", de-dupe and copy the script to head
            let script_el = Array.from(document.head.querySelectorAll("script")).find((s) => s.src === node.src);

            if (script_el == undefined) {
                script_el = document.createElement("script");
                script_el.referrerPolicy = node.referrerPolicy;
                script_el.crossOrigin = node.crossOrigin;
                script_el.integrity = node.integrity;
                script_el.noModule = node.noModule;
                script_el.nonce = node.nonce;
                script_el.type = node.type;
                script_el.src = node.src;
                // Not copying defer or async because this script is not included in the initial HTML document, so it has no effect.
                // @ts-ignore
                script_el.pluto_is_loading_me = true;
            }
            let script_el_really = script_el; // for typescript

            // @ts-ignore
            const need_to_await = script_el_really.pluto_is_loading_me != null;
            if (need_to_await) {
                await new Promise((resolve) => {
                    script_el_really.addEventListener("load", resolve);
                    script_el_really.addEventListener("error", resolve);
                    document.head.appendChild(script_el_really);
                });
                // @ts-ignore
                script_el_really.pluto_is_loading_me = undefined;
            }
        } else {
            // If there is no src="", we take the content and run it in an observablehq-like environment
            try {
                let code = node.innerText;
                let script_id = node.id;
                let old_result = script_id ? previous_results_map.get(script_id) : null;

                if (node.type === "module") {
                    console.warn("We don't (yet) fully support <script type=module> (loading modules with <script type=module src=...> is fine).");
                }

                if (node.type === "" || node.type === "text/javascript" || node.type === "module") {
                    if (is_displayable(old_result)) {
                        node.parentElement?.insertBefore(old_result, node);
                    }

                    const cell = root_node.closest("pluto-cell");
                    let { node: new_node, result } = await execute_inside_script_tag_that_replaces(node, async (currentScript) => {
                        return await execute_dynamic_function({
                            environment: {
                                this: script_id ? old_result : window,
                                currentScript: currentScript,
                                invalidation: invalidation,
                                // @ts-ignore
                                getPublishedObject: (id) => cell.getPublishedObject(id),

                                _internal_getJSLinkResponse: (cell_id, link_id) => (input) =>
                                    pluto_actions.request_js_link_response(cell_id, link_id, input).then(([success, result]) => {
                                        if (success) return result
                                        throw result
                                    }),
                                getBoundElementValueLikePluto: get_input_value,
                                setBoundElementValueLikePluto: set_input_value,
                                getBoundElementEventNameLikePluto: eventof,

                                getNotebookMetadataExperimental: (key) => pluto_actions.get_notebook()?.metadata?.[key],
                                setNotebookMetadataExperimental: (key, value) =>
                                    pluto_actions.update_notebook((notebook) => {
                                        notebook.metadata[key] = value;
                                    }),
                                deleteNotebookMetadataExperimental: (key) =>
                                    pluto_actions.update_notebook((notebook) => {
                                        delete notebook.metadata[key];
                                    }),

                                ...(cell == null
                                    ? {}
                                    : {
                                          getCellMetadataExperimental: (key, { cell_id = null } = {}) =>
                                              pluto_actions.get_notebook()?.cell_inputs?.[cell_id ?? cell.id]?.metadata?.[key],
                                          setCellMetadataExperimental: (key, value, { cell_id = null } = {}) =>
                                              pluto_actions.update_notebook((notebook) => {
                                                  notebook.cell_inputs[cell_id ?? cell.id].metadata[key] = value;
                                              }),
                                          deleteCellMetadataExperimental: (key, { cell_id = null } = {}) =>
                                              pluto_actions.update_notebook((notebook) => {
                                                  delete notebook.cell_inputs[cell_id ?? cell.id].metadata[key];
                                              }),
                                      }),

                                ...observablehq_for_cells,
                                _: _,
                            },
                            code,
                        })
                    });

                    // Save result for next run
                    if (script_id != null) {
                        results_map.set(script_id, result);
                    }
                    // Insert returned element
                    if (result !== old_result) {
                        if (is_displayable(old_result)) {
                            old_result.remove();
                        }
                        if (is_displayable(result)) {
                            new_node.parentElement?.insertBefore(result, new_node);
                        }
                    }
                }
            } catch (err) {
                console.error("Couldn't execute script:", node);
                // needs to be in its own console.error so that the stack trace is printed
                console.error(err);
                // TODO: relay to user
            }
        }
        nested_script_execution_level -= 1;
    }
    return results_map
};

let run$1 = (f) => f();

/**
 * Support declarative shadowroot 😺
 * https://web.dev/declarative-shadow-dom/
 * The polyfill they mention on the page is nice and all, but we need more.
 * For one, we need the polyfill anyway as we're adding html using innerHTML (just like we need to run the scripts ourselves)
 * Also, we want to run the scripts inside the shadow roots, ideally in the same order that a browser would.
 * And we want nested shadowroots, which their polyfill doesn't provide (and I hope the spec does)
 *
 * @param {HTMLTemplateElement} template
 */
let declarative_shadow_dom_polyfill = (template) => {
    try {
        const mode = template.getAttribute("shadowroot");
        // @ts-ignore
        const shadowRoot = template.parentElement.attachShadow({ mode });
        // @ts-ignore
        shadowRoot.appendChild(template.content);
        template.remove();

        // To mimick as much as possible the browser behavior, I
        const scripts_or_shadowroots = Array.from(shadowRoot.querySelectorAll("script, template[shadowroot]"));
        return scripts_or_shadowroots.flatMap((script_or_shadowroot) => {
            if (script_or_shadowroot.nodeName === "SCRIPT") {
                return [script_or_shadowroot]
            } else if (script_or_shadowroot.nodeName === "TEMPLATE") {
                // @ts-ignore
                return declarative_shadow_dom_polyfill(script_or_shadowroot)
            }
        })
    } catch (error) {
        console.error(`Couldn't attach declarative shadow dom to`, template, `because of`, error);
        return []
    }
};

let RawHTMLContainer = ({ body, className = "", persist_js_state = false, last_run_timestamp, sanitize_html = true, sanitize_html_message = true }) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    let pluto_bonds = hooks_pin_v113_target_es2020.useContext(PlutoBondsContext);
    let js_init_set = hooks_pin_v113_target_es2020.useContext(PlutoJSInitializingContext);
    let previous_results_map = hooks_pin_v113_target_es2020.useRef(new Map());

    let invalidate_scripts = hooks_pin_v113_target_es2020.useRef(() => {});

    let container_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (container_ref.current && pluto_bonds) set_bound_elements_to_their_value(container_ref.current.querySelectorAll("bond"), pluto_bonds);
    }, [body, persist_js_state, pluto_actions, pluto_bonds, sanitize_html]);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        const container = container_ref.current;
        if (container == null) return

        // Invalidate current scripts and create a new invalidation token immediately
        let invalidation = new Promise((resolve) => {
            invalidate_scripts.current = () => {
                resolve(null);
            };
        });

        const dump = document.createElement("p-dumpster");
        // @ts-ignore
        dump.append(...container.childNodes);

        let html_content_to_set = sanitize_html
            ? purify.sanitize(body, {
                  FORBID_TAGS: ["style"],
                  ADD_ATTR: ["target"],
              })
            : body;

        // Actually "load" the html
        container.innerHTML = html_content_to_set;

        if (sanitize_html_message && html_content_to_set !== body) {
            // DOMPurify also resolves HTML entities, which can give a false positive. To fix this, we use DOMParser to parse both strings, and we compare the innerHTML of the resulting documents.
            const parser = new DOMParser();
            const p1 = parser.parseFromString(body, "text/html");
            const p2 = parser.parseFromString(html_content_to_set, "text/html");

            if (p2.documentElement.innerHTML !== p1.documentElement.innerHTML) {
                console.info("HTML sanitized", { body, html_content_to_set });
                let info_element = document.createElement("div");
                info_element.innerHTML = SafePreviewSanitizeMessage;
                container.prepend(info_element);
            }
        }

        if (sanitize_html) return

        let scripts_in_shadowroots = Array.from(container.querySelectorAll("template[shadowroot]")).flatMap((template) => {
            // @ts-ignore
            return declarative_shadow_dom_polyfill(template)
        });

        // do this synchronously after loading HTML
        const new_scripts = [...scripts_in_shadowroots, ...Array.from(container.querySelectorAll("script"))];

        run$1(async () => {
            try {
                js_init_set?.add(container);
                previous_results_map.current = await execute_scripttags({
                    root_node: container,
                    script_nodes: new_scripts,
                    invalidation,
                    previous_results_map: persist_js_state ? previous_results_map.current : new Map(),
                    pluto_actions,
                });

                if (pluto_actions != null) {
                    const on_bond_value = (name, value) => pluto_actions?.set_bond?.(name, value) ?? Promise.resolve();

                    const bond_nodes = container.querySelectorAll("bond");
                    set_bound_elements_to_their_value(bond_nodes, pluto_bonds ?? {});
                    add_bonds_listener(bond_nodes, on_bond_value, pluto_bonds ?? {}, invalidation);
                    add_bonds_disabled_message_handler(bond_nodes, invalidation);
                }

                apply_enhanced_markup_features(container, pluto_actions);
            } finally {
                js_init_set?.delete(container);
            }
        });

        return () => {
            js_init_set?.delete(container);
            invalidate_scripts.current?.();
        }
    }, [body, last_run_timestamp, pluto_actions, sanitize_html]);

    return html`<div class="raw-html-wrapper ${className}" ref=${container_ref}></div>`
};

/** @param {HTMLElement} code_element */
let highlight = (code_element, language) => {
    language = language.toLowerCase();
    language = language === "jl" ? "julia" : language;

    if (code_element.children.length === 0) {
        {
            if (language === "htmlmixed") {
                code_element.classList.remove("language-htmlmixed");
                code_element.classList.add("language-html");
            }
            hljs.highlightElement(code_element);
        }
    }
};

/**
 * Generates a copy button for Markdown code blocks.
 */
const generateCopyCodeButton = (/** @type {HTMLElement?} */ pre) => {
    if (!pre) return

    // create copy button
    const button = document.createElement("button");
    button.title = "Copy to clipboard";
    button.className = "markdown-code-block-button";
    button.addEventListener("click", (e) => {
        const txt = pre.textContent ?? "";
        navigator.clipboard.writeText(txt);

        button.classList.add("recently-copied");
        setTimeout(() => {
            button.classList.remove("recently-copied");
        }, 1300);
    });

    // Append copy button to the code block element
    pre.prepend(button);
};

/**
 * Generates a copy button for Markdown header elements, to copy the URL to this header using the `id`.
 */
const generateCopyHeaderIdButton = (/** @type {HTMLHeadingElement} */ header, /** @type {any} */ pluto_actions) => {
    const id = header.id;
    if (!id) return
    const button = document.createElement("pluto-header-id-copy");
    button.title = "Click to copy URL to this header";
    button.ariaLabel = "Copy URL to this header";
    button.role = "button";
    button.tabIndex = 0;
    const listener = (_e) => {
        const id = header.id;
        if (!id) return
        let url_to_copy = `#${id}`;
        const launch_params = /** @type {import("./Editor.js").LaunchParameters?} */ (pluto_actions?.get_launch_params?.());
        if (launch_params?.isolated_cell_ids != null) return
        const root = new URL(window.location.href);
        root.hash = "";

        const is_localhost_hostname = (hostname) => hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
        if (
            (!launch_params || (launch_params.disable_ui && launch_params.notebook_id == null && launch_params.pluto_server_url == null)) &&
            !is_localhost_hostname(root.hostname)
        ) {
            url_to_copy = `${root.href}${url_to_copy}`;
        }

        navigator.clipboard.writeText(url_to_copy);

        button.classList.add("recently-copied");
        setTimeout(() => {
            button.classList.remove("recently-copied");
        }, 1300);
    };
    button.addEventListener("click", listener);
    button.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        listener();
        e.preventDefault();
    });

    const wrapper = document.createElement("pluto-header-id-copy-wrapper");
    wrapper.append(button);
    header.append(wrapper);
};

const ANSITextOutput = ({ body }) => {
    const has_ansi = /\x1b\[\d+m/.test(body);

    if (has_ansi) {
        return html`<${ANSIUpContents} body=${body} />`
    } else {
        return html`<pre class="no-block"><code>${body}</code></pre>`
    }
};

const ANSIUpContents = ({ body }) => {
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!node_ref.current) return
        node_ref.current.innerHTML = ansi_to_html(body);
    }, [body]);
    return html`<pre class="no-block"><code ref=${node_ref}></code></pre>`
};

function apply_enhanced_markup_features(container, pluto_actions) {
    // Convert LaTeX to svg
    // @ts-ignore
    if (window.MathJax?.typeset != undefined) {
        try {
            // @ts-ignore
            window.MathJax.typeset(container.querySelectorAll(".tex"));
        } catch (err) {
            console.info("Failed to typeset TeX:");
            console.info(err);
        }
    }

    // Apply syntax highlighting
    try {
        container.querySelectorAll("code").forEach((code_element) => {
            code_element.classList.forEach((className) => {
                if (className.startsWith("language-") && !className.endsWith("undefined")) {
                    // Remove "language-"
                    let language = className.substring(9);
                    highlight(code_element, language);
                }
            });
        });
    } catch (err) {
        console.warn("Highlighting failed", err);
    }

    // Find code blocks and add a copy button:
    try {
        if (container.firstElementChild?.matches("div.markdown")) {
            container.querySelectorAll("pre > code").forEach((code_element) => {
                const pre = code_element.parentElement;
                generateCopyCodeButton(pre);
            });
            container.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((header_element) => {
                if (header_element.closest("table, pluto-display, bond")) return
                generateCopyHeaderIdButton(/** @type {HTMLHeadingElement} */ (header_element), pluto_actions);
            });
        }
    } catch (err) {
        console.warn("Adding markdown code copy button failed", err);
    }
}

// Exposing this for PlutoPages.jl
// @ts-ignore
window.__pluto_apply_enhanced_markup_features = apply_enhanced_markup_features;

const LOGS_VISIBLE_START = 60;
const LOGS_VISIBLE_END = 20;

const PROGRESS_LOG_LEVEL = "LogLevel(-1)";
const STDOUT_LOG_LEVEL = "LogLevel(-555)";
// const RESIZE_THROTTLE = 60

const is_progress_log = (log) => {
    return log.level == PROGRESS_LOG_LEVEL && log.kwargs.find((kwarg) => kwarg[0] === "progress") !== undefined
};

const is_stdout_log = (log) => {
    return log.level == STDOUT_LOG_LEVEL
};

const Logs = ({ logs, line_heights, set_cm_highlighted_line, sanitize_html }) => {
    const progress_logs = logs.filter(is_progress_log);
    const latest_progress_logs = progress_logs.reduce((progress_logs, log) => ({ ...progress_logs, [log.id]: log }), {});
    const stdout_log = logs.reduce((stdout_log, log) => {
        if (!is_stdout_log(log)) {
            return stdout_log
        }
        if (stdout_log === null) {
            return log
        }
        return {
            ...stdout_log,
            msg: [stdout_log.msg[0] + log.msg[0]], // Append to the previous stdout
        }
    }, null);
    const [_, __, grouped_progress_and_logs] = logs.reduce(
        ([seen_progress, seen_stdout, final_logs], log) => {
            const ipl = is_progress_log(log);
            if (ipl && !seen_progress.has(log.id)) {
                seen_progress.add(log.id);
                return [seen_progress, seen_stdout, [...final_logs, latest_progress_logs[log.id]]]
            } else if (!ipl) {
                if (is_stdout_log(log) && !seen_stdout) {
                    return [seen_progress, true, [...final_logs, stdout_log]]
                } else if (!is_stdout_log(log)) {
                    return [seen_progress, seen_stdout, [...final_logs, log]]
                }
            }
            return [seen_progress, seen_stdout, final_logs]
        },
        [new Set(), false, []]
    );

    const is_hidden_input = line_heights[0] === 0;
    if (logs.length === 0) {
        return null
    }

    const dot = (log, i) => html`<${Dot}
        set_cm_highlighted_line=${set_cm_highlighted_line}
        level=${log.level}
        msg=${log.msg}
        kwargs=${log.kwargs}
        sanitize_html=${sanitize_html}
        key=${i}
        y=${is_hidden_input ? 0 : log.line - 1}
    /> `;

    return html`
        <pluto-logs-container>
            <pluto-logs>
                ${grouped_progress_and_logs.length <= LOGS_VISIBLE_END + LOGS_VISIBLE_START
                    ? grouped_progress_and_logs.map(dot)
                    : [
                          ...grouped_progress_and_logs.slice(0, LOGS_VISIBLE_START).map(dot),
                          html`<pluto-log-truncated>
                              ${grouped_progress_and_logs.length - LOGS_VISIBLE_START - LOGS_VISIBLE_END} logs not shown...
                          </pluto-log-truncated>`,
                          ...grouped_progress_and_logs
                              .slice(-LOGS_VISIBLE_END)
                              .map((log, i) => dot(log, i + grouped_progress_and_logs.length - LOGS_VISIBLE_END)),
                      ]}
            </pluto-logs>
        </pluto-logs-container>
    `
};

const Progress = ({ name, progress }) => {
    return html`<pluto-progress-name>${name}</pluto-progress-name>
        <pluto-progress-bar-container><${ProgressBar} progress=${progress} /></pluto-progress-bar-container>`
};

const ProgressBar = ({ progress }) => {
    const bar_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!bar_ref.current) return
        bar_ref.current.style.backgroundSize = `${progress * 100}% 100%`;
    }, [bar_ref.current, progress]);

    return html`<pluto-progress-bar ref=${bar_ref}>${Math.ceil(100 * progress)}%</pluto-progress-bar>`
};

const Dot = ({ set_cm_highlighted_line, msg, kwargs, y, level, sanitize_html }) => {
    const is_progress = is_progress_log({ level, kwargs });
    const is_stdout = level === STDOUT_LOG_LEVEL;
    let progress = null;
    if (is_progress) {
        progress = kwargs.find((p) => p[0] === "progress")[1][0];
        if (progress === "nothing") {
            progress = 0;
        } else if (progress === '"done"') {
            progress = 1;
        } else {
            progress = parseFloat(progress);
        }

        level = "Progress";
    }
    if (is_stdout) {
        level = "Stdout";
    }

    const mimepair_output = (pair) =>
        html`<${SimpleOutputBody} cell_id=${"cell_id_not_known"} mime=${pair[1]} body=${pair[0]} persist_js_state=${false} sanitize_html=${sanitize_html} />`;

    hooks_pin_v113_target_es2020.useEffect(() => {
        return () => set_cm_highlighted_line(null)
    }, []);

    return html`<pluto-log-dot-positioner
        class=${cl({ [level]: true })}
        onMouseenter=${() => is_progress || set_cm_highlighted_line(y + 1)}
        onMouseleave=${() => {
            set_cm_highlighted_line(null);
        }}
    >
        <pluto-log-icon></pluto-log-icon>
        <pluto-log-dot class=${level}
            >${is_progress
                ? html`<${Progress} name="${msg[0]}" progress=${progress} />`
                : is_stdout
                ? html`<${MoreInfo}
                          body=${html`${"This text was written to the "}
                              <a href="https://en.wikipedia.org/wiki/Standard_streams" target="_blank">terminal stream</a>${" while running the cell. "}<span
                                  style="opacity: .5"
                                  >${"(It is not the "}<em>return value</em>${" of the cell.)"}</span
                              >`}
                      />
                      <${LogViewAnsiUp} value=${msg[0]} />`
                : html`${mimepair_output(msg)}${kwargs.map(
                      ([k, v]) => html`<pluto-log-dot-kwarg><pluto-key>${k}</pluto-key><pluto-value>${mimepair_output(v)}</pluto-value></pluto-log-dot-kwarg>`
                  )}`}</pluto-log-dot
        >
    </pluto-log-dot-positioner>`
};

const MoreInfo = (/** @type{{body: import("../imports/Preact.js").ReactElement}} */ { body }) => {
    return html`<a
        class="stdout-info"
        target="_blank"
        title="Click for more info"
        href="#"
        onClick=${(/** @type{Event} */ e) => {
            open_pluto_popup({
                type: "info",
                source_element: /** @type {HTMLElement?} */ (e.currentTarget),
                body,
            });
            e.preventDefault();
        }}
        ><img alt="❔" src=${help_circle_icon}
    /></a>`
};

const LogViewAnsiUp = (/** @type {{value: string}} */ { value }) => {
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!node_ref.current) return
        node_ref.current.innerHTML = ansi_to_html(value);
    }, [node_ref.current, value]);

    return html`<pre ref=${node_ref}></pre>`
};

const useCellApi = (node_ref, published_object_keys, pluto_actions) => {
    const [cell_api_ready, set_cell_api_ready] = hooks_pin_v113_target_es2020.useState(false);
    const published_object_keys_ref = hooks_pin_v113_target_es2020.useRef(published_object_keys);
    published_object_keys_ref.current = published_object_keys;

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        Object.assign(node_ref.current, {
            getPublishedObject: (id) => {
                if (!published_object_keys_ref.current.includes(id)) throw `getPublishedObject: ${id} not found`
                return pluto_actions.get_published_object(id)
            },
            _internal_pluto_actions: pluto_actions,
        });

        set_cell_api_ready(true);
    });

    return cell_api_ready
};

/**
 * @param {String} a_cell_id
 * @param {import("./Editor.js").NotebookData} notebook
 * @returns {Array<String>}
 */
const upstream_of = (a_cell_id, notebook) => Object.values(notebook?.cell_dependencies?.[a_cell_id]?.upstream_cells_map || {}).flatMap((x) => x);

/**
 * @param {String} a_cell_id
 * @param {import("./Editor.js").NotebookData} notebook
 * @param {Function} predicate
 * @param {Set<String>} explored
 * @returns {String | null}
 */
const find_upstream_of = (a_cell_id, notebook, predicate, explored = new Set([])) => {
    if (explored.has(a_cell_id)) return null
    explored.add(a_cell_id);

    if (predicate(a_cell_id)) {
        return a_cell_id
    }

    for (let upstream of upstream_of(a_cell_id, notebook)) {
        const upstream_val = find_upstream_of(upstream, notebook, predicate, explored);
        if (upstream_val !== null) {
            return upstream_val
        }
    }

    return null
};

/**
 * @param {String} flag_name
 * @returns {Function}
 */
const hasTargetBarrier = (flag_name) => {
    return (a_cell_id, notebook) => {
        return notebook?.cell_inputs?.[a_cell_id].metadata[flag_name]
    }
};

const on_jump = (hasBarrier, pluto_actions, cell_id) => () => {
    const notebook = pluto_actions.get_notebook() || {};
    const barrier_cell_id = find_upstream_of(cell_id, notebook, (c) => hasBarrier(c, notebook));
    if (barrier_cell_id !== null) {
        window.dispatchEvent(
            new CustomEvent("cell_focus", {
                detail: {
                    cell_id: barrier_cell_id,
                    line: 0, // 1-based to 0-based index
                },
            })
        );
    }
};

/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  cell_input_local: { code: String },
 *  cell_dependencies: import("./Editor.js").CellDependencyData
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 *  selected: boolean,
 *  force_hide_input: boolean,
 *  focus_after_creation: boolean,
 *  process_waiting_for_permission: boolean,
 *  sanitize_html: boolean,
 *  [key: string]: any,
 * }} props
 * */
const Cell = ({
    cell_input: { cell_id, code, code_folded, metadata },
    cell_result: { queued, running, runtime, errored, output, logs, published_object_keys, depends_on_disabled_cells, depends_on_skipped_cells },
    cell_dependencies,
    cell_input_local,
    notebook_id,
    selected,
    force_hide_input,
    focus_after_creation,
    is_process_ready,
    disable_input,
    process_waiting_for_permission,
    sanitize_html = true,
    nbpkg,
    global_definition_locations,
    is_first_cell,
}) => {
    const { show_logs, disabled: running_disabled, skip_as_script } = metadata;
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    // useCallback because pluto_actions.set_doc_query can change value when you go from viewing a static document to connecting (to binder)
    const on_update_doc_query = hooks_pin_v113_target_es2020.useCallback((...args) => pluto_actions.set_doc_query(...args), [pluto_actions]);
    const on_focus_neighbor = hooks_pin_v113_target_es2020.useCallback((...args) => pluto_actions.focus_on_neighbor(...args), [pluto_actions]);
    const on_change = hooks_pin_v113_target_es2020.useCallback((val) => pluto_actions.set_local_cell(cell_id, val), [cell_id, pluto_actions]);
    const variables = hooks_pin_v113_target_es2020.useMemo(() => Object.keys(cell_dependencies?.downstream_cells_map ?? {}), [cell_dependencies]);

    // We need to unmount & remount when a destructive error occurs.
    // For that reason, we will use a simple react key and increment it on error
    const [key, setKey] = hooks_pin_v113_target_es2020.useState(0);
    const cell_key = hooks_pin_v113_target_es2020.useMemo(() => cell_id + key, [cell_id, key]);

    const [, resetError] = hooks_pin_v113_target_es2020.useErrorBoundary((error) => {
        console.log(`An error occurred in the CodeMirror code, resetting CellInput component. See error below:\n\n${error}\n\n -------------- `);
        setKey(key + 1);
        resetError();
    });

    const remount = hooks_pin_v113_target_es2020.useMemo(() => () => setKey(key + 1));
    // cm_forced_focus is null, except when a line needs to be highlighted because it is part of a stack trace
    const [cm_forced_focus, set_cm_forced_focus] = hooks_pin_v113_target_es2020.useState(/** @type {any} */ (null));
    const [cm_highlighted_range, set_cm_highlighted_range] = hooks_pin_v113_target_es2020.useState(/** @type {{from, to}?} */ (null));
    const [cm_highlighted_line, set_cm_highlighted_line] = hooks_pin_v113_target_es2020.useState(null);
    const [cm_diagnostics, set_cm_diagnostics] = hooks_pin_v113_target_es2020.useState([]);

    useEventListener(
        window,
        "cell_diagnostics",
        (e) => {
            if (e.detail.cell_id === cell_id) {
                set_cm_diagnostics(e.detail.diagnostics);
            }
        },
        [cell_id, set_cm_diagnostics]
    );

    useEventListener(
        window,
        "cell_highlight_range",
        (e) => {
            if (e.detail.cell_id == cell_id && e.detail.from != null && e.detail.to != null) {
                set_cm_highlighted_range({ from: e.detail.from, to: e.detail.to });
            } else {
                set_cm_highlighted_range(null);
            }
        },
        [cell_id]
    );

    useEventListener(
        window,
        "cell_focus",
        hooks_pin_v113_target_es2020.useCallback((e) => {
            if (e.detail.cell_id === cell_id) {
                if (e.detail.line != null) {
                    const ch = e.detail.ch;
                    if (ch == null) {
                        set_cm_forced_focus([
                            { line: e.detail.line, ch: 0 },
                            { line: e.detail.line, ch: Infinity },
                            { scroll: true, definition_of: e.detail.definition_of },
                        ]);
                    } else {
                        set_cm_forced_focus([
                            { line: e.detail.line, ch: ch },
                            { line: e.detail.line, ch: ch },
                            { scroll: true, definition_of: e.detail.definition_of },
                        ]);
                    }
                }
            }
        }, [])
    );

    // When you click to run a cell, we use `waiting_to_run` to immediately set the cell's traffic light to 'queued', while waiting for the backend to catch up.
    const [waiting_to_run, set_waiting_to_run] = hooks_pin_v113_target_es2020.useState(false);
    hooks_pin_v113_target_es2020.useEffect(() => {
        set_waiting_to_run(false);
    }, [queued, running, output?.last_run_timestamp, depends_on_disabled_cells, running_disabled]);
    // We activate animations instantly BUT deactivate them NSeconds later.
    // We then toggle animation visibility using opacity. This saves a bunch of repaints.
    const activate_animation = useDebouncedTruth(running || queued || waiting_to_run);

    const class_code_differs = code !== (cell_input_local?.code ?? code);
    const no_output_yet = (output?.last_run_timestamp ?? 0) === 0;
    const code_not_trusted_yet = process_waiting_for_permission && no_output_yet;

    // during the initial page load, force_hide_input === true, so that cell outputs render fast, and codemirrors are loaded after
    let show_input = !force_hide_input && (code_not_trusted_yet || errored || class_code_differs || cm_forced_focus != null || !code_folded);

    const [line_heights, set_line_heights] = hooks_pin_v113_target_es2020.useState([15]);
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    const disable_input_ref = hooks_pin_v113_target_es2020.useRef(disable_input);
    disable_input_ref.current = disable_input;
    const should_set_waiting_to_run_ref = hooks_pin_v113_target_es2020.useRef(true);
    should_set_waiting_to_run_ref.current = !running_disabled && !depends_on_disabled_cells;
    useEventListener(
        window,
        "set_waiting_to_run_smart",
        (e) => {
            if (e.detail.cell_ids.includes(cell_id)) set_waiting_to_run(should_set_waiting_to_run_ref.current);
        },
        [cell_id, set_waiting_to_run]
    );

    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions);
    const on_delete = hooks_pin_v113_target_es2020.useCallback(() => {
        pluto_actions.confirm_delete_multiple("Delete", pluto_actions.get_selected_cells(cell_id, selected));
    }, [pluto_actions, selected, cell_id]);
    const on_submit = hooks_pin_v113_target_es2020.useCallback(() => {
        if (!disable_input_ref.current) {
            pluto_actions.set_and_run_multiple([cell_id]);
        }
    }, [pluto_actions, cell_id]);
    const on_change_cell_input = hooks_pin_v113_target_es2020.useCallback(
        (new_code) => {
            if (!disable_input_ref.current) {
                if (code_folded && cm_forced_focus != null) {
                    pluto_actions.fold_remote_cells([cell_id], false);
                }
                on_change(new_code);
            }
        },
        [code_folded, cm_forced_focus, pluto_actions, on_change]
    );
    const on_add_after = hooks_pin_v113_target_es2020.useCallback(() => {
        pluto_actions.add_remote_cell(cell_id, "after");
    }, [pluto_actions, cell_id, selected]);
    const on_code_fold = hooks_pin_v113_target_es2020.useCallback(() => {
        pluto_actions.fold_remote_cells(pluto_actions.get_selected_cells(cell_id, selected), !code_folded);
    }, [pluto_actions, cell_id, selected, code_folded]);
    const on_run = hooks_pin_v113_target_es2020.useCallback(() => {
        pluto_actions.set_and_run_multiple(pluto_actions.get_selected_cells(cell_id, selected));
    }, [pluto_actions, cell_id, selected]);
    const set_show_logs = hooks_pin_v113_target_es2020.useCallback(
        (show_logs) =>
            pluto_actions.update_notebook((notebook) => {
                notebook.cell_inputs[cell_id].metadata.show_logs = show_logs;
            }),
        [pluto_actions, cell_id]
    );
    const set_cell_disabled = hooks_pin_v113_target_es2020.useCallback(
        async (new_val) => {
            await pluto_actions.update_notebook((notebook) => {
                notebook.cell_inputs[cell_id].metadata["disabled"] = new_val;
            });
            // we also 'run' the cell if it is disabled, this will make the backend propage the disabled state to dependent cells
            await on_submit();
        },
        [pluto_actions, cell_id, on_submit]
    );

    const any_logs = hooks_pin_v113_target_es2020.useMemo(() => !_.isEmpty(logs), [logs]);

    const skip_as_script_jump = hooks_pin_v113_target_es2020.useCallback(on_jump(hasTargetBarrier("skip_as_script"), pluto_actions, cell_id), [pluto_actions, cell_id]);
    const disabled_jump = hooks_pin_v113_target_es2020.useCallback(on_jump(hasTargetBarrier("disabled"), pluto_actions, cell_id), [pluto_actions, cell_id]);

    return html`
        <pluto-cell
            key=${cell_key}
            ref=${node_ref}
            class=${cl({
                queued: queued || (waiting_to_run && is_process_ready),
                internal_test_queued: !is_process_ready && (queued || waiting_to_run),
                running,
                activate_animation,
                errored,
                selected,
                code_differs: class_code_differs,
                code_folded,
                skip_as_script,
                running_disabled,
                depends_on_disabled_cells,
                depends_on_skipped_cells,
                show_input,
                shrunk: Object.values(logs).length > 0,
                hooked_up: output?.has_pluto_hook_features ?? false,
                no_output_yet,
            })}
            id=${cell_id}
        >
            ${variables.map((name) => html`<span id=${encodeURI(name)} />`)}
            <button
                onClick=${() => {
                    pluto_actions.add_remote_cell(cell_id, "before");
                }}
                class="add_cell before"
                title="Add cell (Ctrl + Enter)"
                tabindex=${is_first_cell ? undefined : "-1"}
            >
                <span></span>
            </button>
            <pluto-shoulder draggable="true" title="Drag to move cell">
                <button onClick=${on_code_fold} class="foldcode" title="Show/hide code">
                    <span></span>
                </button>
            </pluto-shoulder>
            <pluto-trafficlight></pluto-trafficlight>
            ${code_not_trusted_yet
                ? html`<${SafePreviewOutput} />`
                : cell_api_ready
                ? html`<${CellOutput} errored=${errored} ...${output} sanitize_html=${sanitize_html} cell_id=${cell_id} />`
                : html``}
            <${CellInput}
                local_code=${cell_input_local?.code ?? code}
                remote_code=${code}
                global_definition_locations=${global_definition_locations}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                cm_forced_focus=${cm_forced_focus}
                set_cm_forced_focus=${set_cm_forced_focus}
                show_input=${show_input}
                skip_static_fake=${is_first_cell}
                on_submit=${on_submit}
                on_delete=${on_delete}
                on_add_after=${on_add_after}
                on_change=${on_change_cell_input}
                on_update_doc_query=${on_update_doc_query}
                on_focus_neighbor=${on_focus_neighbor}
                on_line_heights=${set_line_heights}
                nbpkg=${nbpkg}
                cell_id=${cell_id}
                notebook_id=${notebook_id}
                metadata=${metadata}
                any_logs=${any_logs}
                show_logs=${show_logs}
                set_show_logs=${set_show_logs}
                set_cell_disabled=${set_cell_disabled}
                cm_highlighted_line=${cm_highlighted_line}
                cm_highlighted_range=${cm_highlighted_range}
                cm_diagnostics=${cm_diagnostics}
                onerror=${remount}
            />
            ${show_logs && cell_api_ready
                ? html`<${Logs}
                      logs=${Object.values(logs)}
                      line_heights=${line_heights}
                      set_cm_highlighted_line=${set_cm_highlighted_line}
                      sanitize_html=${sanitize_html}
                  />`
                : null}
            <${RunArea}
                cell_id=${cell_id}
                running_disabled=${running_disabled}
                depends_on_disabled_cells=${depends_on_disabled_cells}
                on_run=${on_run}
                on_interrupt=${() => {
                    pluto_actions.interrupt_remote(cell_id);
                }}
                set_cell_disabled=${set_cell_disabled}
                runtime=${runtime}
                running=${running}
                code_differs=${class_code_differs}
                queued=${queued}
                on_jump=${disabled_jump}
            />
            <button
                onClick=${() => {
                    pluto_actions.add_remote_cell(cell_id, "after");
                }}
                class="add_cell after"
                title="Add cell (Ctrl + Enter)"
            >
                <span></span>
            </button>
            ${skip_as_script
                ? html`<div
                      class="skip_as_script_marker"
                      title=${`This cell is directly flagged as disabled in file. Click to know more!`}
                      onClick=${(e) => {
                          open_pluto_popup({
                              type: "info",
                              source_element: e.target,
                              body: html`This cell is currently stored in the notebook file as a Julia <em>comment</em>, instead of <em>code</em>.<br />
                                  This way, it will not run when the notebook runs as a script outside of Pluto.<br />
                                  Use the context menu to enable it again`,
                          });
                      }}
                  ></div>`
                : depends_on_skipped_cells
                ? html`<div
                      class="depends_on_skipped_marker"
                      title=${`This cell is indirectly flagged as disabled in file. Click to know more!`}
                      onClick=${(e) => {
                          open_pluto_popup({
                              type: "info",
                              source_element: e.target,
                              body: html`This cell is currently stored in the notebook file as a Julia <em>comment</em>, instead of <em>code</em>.<br />
                                  This way, it will not run when the notebook runs as a script outside of Pluto.<br />
                                  An upstream cell is <b> indirectly</b> <em>disabling in file</em> this one; enable
                                  <span onClick=${skip_as_script_jump} style="cursor: pointer; text-decoration: underline"> the upstream one</span> to affect
                                  this cell.`,
                          });
                      }}
                  ></div>`
                : null}
        </pluto-cell>
    `
};
/**
 * @param {{
 *  cell_result: import("./Editor.js").CellResultData,
 *  cell_input: import("./Editor.js").CellInputData,
 *  [key: string]: any,
 * }} props
 * */
const IsolatedCell = ({ cell_input: { cell_id, metadata }, cell_result: { logs, output, published_object_keys }, hidden, sanitize_html = true }) => {
    const node_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);
    const cell_api_ready = useCellApi(node_ref, published_object_keys, pluto_actions);
    const { show_logs } = metadata;

    return html`
        <pluto-cell ref=${node_ref} id=${cell_id} class=${hidden ? "hidden-cell" : "isolated-cell"}>
            ${cell_api_ready ? html`<${CellOutput} ...${output} sanitize_html=${sanitize_html} cell_id=${cell_id} />` : html``}
            ${show_logs ? html`<${Logs} logs=${Object.values(logs)} line_heights=${[15]} set_cm_highlighted_line=${() => {}} />` : null}
        </pluto-cell>
    `
};

const CellMemo = ({
    cell_result,
    cell_input,
    cell_input_local,
    notebook_id,
    cell_dependencies,
    selected,
    focus_after_creation,
    force_hide_input,
    is_process_ready,
    disable_input,
    sanitize_html = true,
    process_waiting_for_permission,
    show_logs,
    set_show_logs,
    nbpkg,
    global_definition_locations,
    is_first_cell,
}) => {
    const { body, last_run_timestamp, mime, persist_js_state, rootassignee } = cell_result?.output || {};
    const { queued, running, runtime, errored, depends_on_disabled_cells, logs, depends_on_skipped_cells } = cell_result || {};
    const { cell_id, code, code_folded, metadata } = cell_input || {};
    return hooks_pin_v113_target_es2020.useMemo(() => {
        return html`
            <${Cell}
                cell_result=${cell_result}
                cell_dependencies=${cell_dependencies}
                cell_input=${cell_input}
                cell_input_local=${cell_input_local}
                notebook_id=${notebook_id}
                selected=${selected}
                force_hide_input=${force_hide_input}
                focus_after_creation=${focus_after_creation}
                is_process_ready=${is_process_ready}
                disable_input=${disable_input}
                process_waiting_for_permission=${process_waiting_for_permission}
                sanitize_html=${sanitize_html}
                nbpkg=${nbpkg}
                global_definition_locations=${global_definition_locations}
                is_first_cell=${is_first_cell}
            />
        `
    }, [
        // Object references may invalidate this faster than the optimal. To avoid this, spread out objects to primitives!
        cell_id,
        ...Object.keys(metadata),
        ...Object.values(metadata),
        depends_on_disabled_cells,
        depends_on_skipped_cells,
        queued,
        running,
        runtime,
        errored,
        body,
        last_run_timestamp,
        mime,
        persist_js_state,
        rootassignee,
        logs,
        code,
        code_folded,
        cell_input_local,
        notebook_id,
        cell_dependencies,
        selected,
        force_hide_input,
        focus_after_creation,
        is_process_ready,
        disable_input,
        process_waiting_for_permission,
        sanitize_html,
        ...nbpkg_fingerprint(nbpkg),
        global_definition_locations,
        is_first_cell,
    ])
};

/**
 * Rendering cell outputs can slow down the initial page load, so we delay rendering them using this heuristic function to determine the length of the delay (as a function of the number of cells in the notebook). Since using CodeMirror 6, cell inputs do not cause a slowdown when out-of-viewport, rendering is delayed until they come into view.
 * @param {Number} num_cells
 */
const render_cell_outputs_delay = (num_cells) => (num_cells > 20 ? 100 : 0);
/**
 * The first <x> cells will bypass the {@link render_cell_outputs_delay} heuristic and render directly.
 */
const render_cell_outputs_minimum = 20;

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  cell_inputs_local: { [uuid: string]: { code: String } },
 *  on_update_doc_query: any,
 *  on_cell_input: any,
 *  on_focus_neighbor: any,
 *  last_created_cell: string,
 *  selected_cells: Array<string>,
 *  is_initializing: boolean,
 *  is_process_ready: boolean,
 *  disable_input: boolean,
 *  process_waiting_for_permission: boolean,
 *  sanitize_html: boolean,
 * }} props
 * */
const Notebook = ({
    notebook,
    cell_inputs_local,
    last_created_cell,
    selected_cells,
    is_initializing,
    is_process_ready,
    disable_input,
    process_waiting_for_permission,
    sanitize_html = true,
}) => {
    let pluto_actions = hooks_pin_v113_target_es2020.useContext(PlutoActionsContext);

    // Add new cell when the last cell gets deleted
    hooks_pin_v113_target_es2020.useEffect(() => {
        // This might look kinda silly...
        // and it is... but it covers all the cases... - DRAL
        if (notebook.cell_order.length === 0 && !is_initializing) {
            pluto_actions.add_remote_cell_at(0);
        }
    }, [is_initializing, notebook.cell_order.length]);

    // Only render the notebook partially during the first few seconds
    const [cell_outputs_delayed, set_cell_outputs_delayed] = hooks_pin_v113_target_es2020.useState(true);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (cell_outputs_delayed && notebook.cell_order.length > 0) {
            setTimeout(() => {
                set_cell_outputs_delayed(false);
            }, render_cell_outputs_delay(notebook.cell_order.length));
        }
    }, [cell_outputs_delayed, notebook.cell_order.length]);

    let global_definition_locations = hooks_pin_v113_target_es2020.useMemo(
        () =>
            Object.fromEntries(
                Object.values(notebook?.cell_dependencies ?? {}).flatMap((x) =>
                    Object.keys(x.downstream_cells_map)
                        .filter((variable) => !variable.includes("."))
                        .map((variable) => [variable, x.cell_id])
                )
            ),
        [notebook?.cell_dependencies]
    );

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        let oldhash = window.location.hash;
        if (oldhash.length > 1) {
            let go = () => {
                window.location.hash = "#";
                window.location.hash = oldhash;
            };
            go();
            // Scrolling there might trigger some codemirrors to render and change height, so let's do it again.
            requestIdleCallback(go);
        }
    }, [cell_outputs_delayed]);

    return html`
        <pluto-notebook id=${notebook.notebook_id}>
            ${notebook.cell_order
                .filter((_, i) => !(cell_outputs_delayed && i > render_cell_outputs_minimum))
                .map(
                    (cell_id, i) => html`<${CellMemo}
                        key=${cell_id}
                        cell_result=${notebook.cell_results[cell_id] ?? {
                            cell_id: cell_id,
                            queued: true,
                            running: false,
                            errored: false,
                            runtime: null,
                            output: null,
                            logs: [],
                        }}
                        cell_input=${notebook.cell_inputs[cell_id]}
                        cell_dependencies=${notebook?.cell_dependencies?.[cell_id] ?? {}}
                        cell_input_local=${cell_inputs_local[cell_id]}
                        notebook_id=${notebook.notebook_id}
                        selected=${selected_cells.includes(cell_id)}
                        focus_after_creation=${last_created_cell === cell_id}
                        force_hide_input=${false}
                        is_process_ready=${is_process_ready}
                        disable_input=${disable_input}
                        process_waiting_for_permission=${process_waiting_for_permission}
                        sanitize_html=${sanitize_html}
                        nbpkg=${notebook.nbpkg}
                        global_definition_locations=${global_definition_locations}
                        is_first_cell=${i === 0}
                    />`
                )}
            ${
                // Waiting for the last deleted cell to be recovered...
                notebook.cell_order.length === 0 ||
                // Waiting for all cells to be displayed...
                (cell_outputs_delayed && notebook.cell_order.length >= render_cell_outputs_minimum)
                    ? html`<div
                          style="
                        font-family: system-ui;
                        font-style: italic;
                        padding: 0.3rem 1rem;
                        margin: 1rem 0rem;
                        border-radius: .3rem;
                        background: var(--blockquote-bg);
                        opacity: 0.6;
                        animation: fadeintext .2s 1.5s linear;
                        animation-fill-mode: both;
                        margin-bottom: ${Math.max(0, (notebook.cell_order.length - render_cell_outputs_minimum) * 10)}rem;"
                      >
                          Loading cells...
                      </div>`
                    : null
            }
        </pluto-notebook>
    `
};

/**
 * @typedef DropRulerProps
 * @type {{
 *   actions: any,
 *   selected_cells: string[],
 *   set_scroller: (enabled: any) => void
 *   serialize_selected: (id: string) => string | undefined,
 *   pluto_editor_element: HTMLElement,
 * }}
 */

/**
 * @augments Component<DropRulerProps,any>
 */
class DropRuler extends preact_10_13_2_pin_v113_target_es2020.Component {
    constructor(/** @type {DropRulerProps} */ props) {
        super(props);
        this.dropee = null;
        this.dropped = null;
        this.cell_edges = [];
        this.pointer_position = { pageX: 0, pageY: 0 };
        this.precompute_cell_edges = () => {
            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(this.props.pluto_editor_element.querySelectorAll(":scope > main > pluto-notebook > pluto-cell"));
            this.cell_edges = cell_nodes.map((el) => el.offsetTop);
            this.cell_edges.push(last(cell_nodes).offsetTop + last(cell_nodes).scrollHeight);
        };
        this.getDropIndexOf = ({ pageX, pageY }) => {
            const editorY =
                pageY -
                ((this.props.pluto_editor_element.querySelector("main") ?? this.props.pluto_editor_element).getBoundingClientRect().top +
                    document.documentElement.scrollTop);

            const distances = this.cell_edges.map((p) => Math.abs(p - editorY - 8)); // 8 is the magic computer number: https://en.wikipedia.org/wiki/8
            return argmin(distances)
        };

        this.state = {
            drag_start: false,
            drag_target: false,
            drop_index: 0,
        };
    }

    componentDidMount() {
        const event_not_for_me = (/** @type {MouseEvent} */ e) => {
            return (e.target instanceof Element ? e.target.closest("pluto-editor") : null) !== this.props.pluto_editor_element
        };

        document.addEventListener("dragstart", (e) => {
            if (event_not_for_me(e)) return
            if (!e.dataTransfer) return
            let target = /** @type {Element} */ (e.target);
            let pe = target.parentElement;
            if (target.matches("pluto-shoulder") && pe != null) {
                this.dropee = pe;
                let data = this.props.serialize_selected(pe.id);
                if (data) e.dataTransfer.setData("text/pluto-cell", data);
                this.dropped = false;
                this.precompute_cell_edges();

                this.setState({
                    drag_start: true,
                    drop_index: this.getDropIndexOf(e),
                });
                this.props.set_scroller({ up: true, down: true });
            } else {
                this.setState({
                    drag_start: false,
                    drag_target: false,
                });
                this.props.set_scroller({ up: false, down: false });
                this.dropee = null;
            }
        });
        document.addEventListener("dragenter", (e) => {
            if (event_not_for_me(e)) return
            if (!e.dataTransfer) return
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            if (!this.state.drag_target) this.precompute_cell_edges();
            this.lastenter = e.target;
            this.setState({ drag_target: true });
            e.preventDefault();
        });
        document.addEventListener("dragleave", (e) => {
            if (event_not_for_me(e)) return
            if (!e.dataTransfer) return
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            if (e.target === this.lastenter) {
                this.setState({ drag_target: false });
            }
        });
        const precompute_cell_edges_throttled = _.throttle(this.precompute_cell_edges, 4000, { leading: false, trailing: true });
        const update_drop_index_throttled = _.throttle(
            () => {
                this.setState({
                    drop_index: this.getDropIndexOf(this.pointer_position),
                });
            },
            100,
            { leading: false, trailing: true }
        );
        document.addEventListener("dragover", (e) => {
            if (event_not_for_me(e)) return
            if (!e.dataTransfer) return
            // Called continuously during drag
            if (e.dataTransfer.types[0] !== "text/pluto-cell") return
            this.pointer_position = e;

            precompute_cell_edges_throttled();
            update_drop_index_throttled();

            if (this.state.drag_start) {
                // Then we're dragging a cell from within the notebook. Use a move icon:
                e.dataTransfer.dropEffect = "move";
            }
            e.preventDefault();
        });
        document.addEventListener("dragend", (e) => {
            if (event_not_for_me(e)) return
            // Called after drag, also when dropped outside of the browser or when ESC is pressed
            update_drop_index_throttled.flush();
            this.setState({
                drag_start: false,
                drag_target: false,
            });
            this.props.set_scroller({ up: false, down: false });
        });
        document.addEventListener("drop", (e) => {
            if (event_not_for_me(e)) return
            if (!e.dataTransfer) return
            // Guaranteed to fire before the 'dragend' event
            // Ignore files
            if (e.dataTransfer.types[0] !== "text/pluto-cell") {
                return
            }
            this.setState({
                drag_target: false,
            });
            this.dropped = true;
            if (this.dropee && this.state.drag_start) {
                // Called when drag-dropped somewhere on the page
                const drop_index = this.getDropIndexOf(e);
                const friend_ids = this.props.selected_cells.includes(this.dropee.id) ? this.props.selected_cells : [this.dropee.id];
                this.props.actions.move_remote_cells(friend_ids, drop_index);
            } else {
                // Called when cell(s) from another window are dragged onto the page
                const drop_index = this.getDropIndexOf(e);
                const data = e.dataTransfer.getData("text/pluto-cell");
                this.props.actions.add_deserialized_cells(data, drop_index);
            }
        });
    }

    render() {
        const styles = this.state.drag_target
            ? {
                  display: "block",
                  top: this.cell_edges[this.state.drop_index] + "px",
              }
            : {};
        return html`<dropruler style=${styles}></dropruler>`
    }
}

const argmin = (x) => {
    let best_val = Infinity;
    let best_index = -1;
    let val;
    for (let i = 0; i < x.length; i++) {
        val = x[i];
        if (val < best_val) {
            best_index = i;
            best_val = val;
        }
    }
    return best_index
};

const last = (x) => x[x.length - 1];

const get_element_position_in_document = (element) => {
    let top = 0;
    let left = 0;

    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while (element)

    return {
        top: top,
        left: left,
    }
};

const in_request_animation_frame = (fn) => {
    let last_known_arguments = null;
    let ticking = false;

    return (...args) => {
        last_known_arguments = args;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                fn(...last_known_arguments);
                ticking = false;
            });

            ticking = true;
        }
    }
};

/**
 *
 * @typedef Coordinate2D
 * @property {number} x
 * @property {number} y
 */

const SelectionArea = ({ on_selection, set_scroller, cell_order }) => {
    const mouse_position_ref = hooks_pin_v113_target_es2020.useRef();
    const is_selecting_ref = hooks_pin_v113_target_es2020.useRef(false);
    const element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLElement?} */ (null));

    const [selection, set_selection] = hooks_pin_v113_target_es2020.useState(/** @type {{start: Coordinate2D, end: Coordinate2D}?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        const event_target_inside_this_notebook = (/** @type {MouseEvent} */ e) => {
            if (e.target == null) {
                return false
            }

            // this should also work for notebooks inside notebooks!
            let closest_editor = /** @type {HTMLElement} */ (e.target).closest("pluto-editor");
            let my_editor = element_ref.current?.closest("pluto-editor");

            return closest_editor === my_editor
        };

        const onmousedown = (/** @type {MouseEvent} */ e) => {
            // @ts-ignore
            const t = e.target?.tagName;

            // TODO: also allow starting the selection in one codemirror and stretching it to another cell
            if (
                e.button === 0 &&
                event_target_inside_this_notebook(e) &&
                (t === "PLUTO-EDITOR" || t === "MAIN" || t === "PLUTO-NOTEBOOK" || t === "PREAMBLE")
            ) {
                on_selection([]);
                set_selection({ start: { x: e.pageX, y: e.pageY }, end: { x: e.pageX, y: e.pageY } });
                is_selecting_ref.current = true;
            }
        };

        const onmouseup = (/** @type {MouseEvent} */ e) => {
            if (is_selecting_ref.current) {
                set_selection(null);
                set_scroller({ up: false, down: false });
                is_selecting_ref.current = false;
            } else {
                // if you didn't click on a UI element...
                if (
                    !e.composedPath().some((e) => {
                        // @ts-ignore
                        e.tagName;
                        if (e instanceof HTMLElement)
                            return e.matches("pluto-shoulder, button.input_context_menu, button.foldcode") || e.closest(".input_context_menu")
                    })
                ) {
                    // ...clear the selection
                    on_selection([]);
                }
            }
        };

        let update_selection = in_request_animation_frame(({ pageX, pageY }) => {
            if (!is_selecting_ref.current || selection == null) return

            let new_selection_end = { x: pageX, y: pageY };

            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"));

            let A = {
                start_left: Math.min(selection.start.x, new_selection_end.x),
                start_top: Math.min(selection.start.y, new_selection_end.y),
                end_left: Math.max(selection.start.x, new_selection_end.x),
                end_top: Math.max(selection.start.y, new_selection_end.y),
            };
            let in_selection = cell_nodes.filter((cell) => {
                let cell_position = get_element_position_in_document(cell);
                let cell_size = cell.getBoundingClientRect();

                let B = {
                    start_left: cell_position.left,
                    start_top: cell_position.top,
                    end_left: cell_position.left + cell_size.width,
                    end_top: cell_position.top + cell_size.height,
                };
                return A.start_left < B.end_left && A.end_left > B.start_left && A.start_top < B.end_top && A.end_top > B.start_top
            });

            set_scroller({ up: true, down: true });
            on_selection(in_selection.map((x) => x.id));
            set_selection({ start: selection.start, end: new_selection_end });
        });

        const onscroll = (e) => {
            if (is_selecting_ref.current) {
                update_selection({ pageX: mouse_position_ref.current.clientX, pageY: mouse_position_ref.current.clientY + document.documentElement.scrollTop });
            }
        };

        const onmousemove = (e) => {
            mouse_position_ref.current = e;
            if (is_selecting_ref.current) {
                update_selection({ pageX: e.pageX, pageY: e.pageY });
                e.preventDefault();
            }
        };

        const onselectstart = (e) => {
            if (is_selecting_ref.current) {
                e.preventDefault();
            }
        };

        // Ctrl+A to select all cells
        const onkeydown = (e) => {
            if (e.key?.toLowerCase() === "a" && has_ctrl_or_cmd_pressed(e)) {
                // if you are not writing text somewhere else
                if (document.activeElement === document.body && (window.getSelection()?.isCollapsed ?? true)) {
                    on_selection(cell_order);
                    e.preventDefault();
                }
            }
        };

        document.addEventListener("mousedown", onmousedown);
        document.addEventListener("mouseup", onmouseup);
        document.addEventListener("mousemove", onmousemove);
        document.addEventListener("selectstart", onselectstart);
        document.addEventListener("keydown", onkeydown);
        document.addEventListener("scroll", onscroll, { passive: true });
        return () => {
            document.removeEventListener("mousedown", onmousedown);
            document.removeEventListener("mouseup", onmouseup);
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("selectstart", onselectstart);
            document.removeEventListener("keydown", onkeydown);
            // @ts-ignore
            document.removeEventListener("scroll", onscroll, { passive: true });
        }
    }, [selection]);

    // let translateY = `translateY(${Math.min(selection_start.y, selection_end.y)}px)`
    // let translateX = `translateX(${Math.min(selection_start.x, selection_end.x)}px)`
    // let scaleX = `scaleX(${Math.abs(selection_start.x - selection_end.x)})`
    // let scaleY = `scaleY(${Math.abs(selection_start.y - selection_end.y)})`

    if (selection == null) {
        return html`<span ref=${element_ref}></span>`
    }
    return html`
        <pl-select-area
            ref=${element_ref}
            style=${{
                position: "absolute",
                background: "rgba(40, 78, 189, 0.24)",
                zIndex: 1000000, // Yes, really
                top: Math.min(selection.start.y, selection.end.y),
                left: Math.min(selection.start.x, selection.end.x),
                width: Math.abs(selection.start.x - selection.end.x),
                height: Math.abs(selection.start.y - selection.end.y),

                // Transform could be faster
                // top: 0,
                // left: 0,
                // width: 1,
                // height: 1,
                // transformOrigin: "top left",
                // transform: `${translateX} ${translateY} ${scaleX} ${scaleY}`,
            }}
        ></pl-select-area>
    `
};

const UndoDelete = ({ recently_deleted, on_click }) => {
    const [hidden, set_hidden] = hooks_pin_v113_target_es2020.useState(true);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (recently_deleted != null && recently_deleted.length > 0) {
            set_hidden(false);
            const interval = setTimeout(() => {
                set_hidden(true);
            }, 8000 * Math.pow(recently_deleted.length, 1 / 3));

            return () => {
                clearTimeout(interval);
            }
        }
    }, [recently_deleted]);

    let text = recently_deleted == null ? "" : recently_deleted.length === 1 ? "Cell deleted" : `${recently_deleted.length} cells deleted`;

    return html`
        <nav id="undo_delete" inert=${hidden} class=${cl({ hidden })}>
            ${text} (<a
                href="#"
                onClick=${(e) => {
                    e.preventDefault();
                    set_hidden(true);
                    on_click();
                }}
                ><strong>UNDO</strong></a
            >)
        </nav>
    `
};

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  recently_auto_disabled_cells: Record<string,[string,string]>,
 * }} props
 * */
const RecentlyDisabledInfo = ({ notebook, recently_auto_disabled_cells }) => {
    hooks_pin_v113_target_es2020.useEffect(() => {
        Object.entries(recently_auto_disabled_cells).forEach(([cell_id, reason]) => {
            open_pluto_popup({
                type: "info",
                source_element: document.getElementById(reason[0]),
                body: html`<a
                        href=${`#${cell_id}`}
                        onClick=${(e) => {
                            scroll_cell_into_view(cell_id);
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        >Another cell</a
                    >${` has been disabled because it also defined `}<code class="auto_disabled_variable">${reason[1]}</code>.`,
            });
        });
    }, [recently_auto_disabled_cells]);

    return null
};

const SlideControls = () => {
    const button_prev_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLButtonElement?} */ (null));
    const button_next_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLButtonElement?} */ (null));

    const [presenting, set_presenting] = hooks_pin_v113_target_es2020.useState(false);

    const move_slides_with_keyboard = (/** @type {KeyboardEvent} */ e) => {
        const activeElement = document.activeElement;
        if (
            activeElement != null &&
            activeElement !== document.body &&
            activeElement !== button_prev_ref.current &&
            activeElement !== button_next_ref.current
        ) {
            // We do not move slides with arrow if we have an active element
            return
        }
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
            button_prev_ref.current?.click();
        } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
            button_next_ref.current?.click();
        } else if (e.key === "Escape") {
            set_presenting(false);
        } else {
            return
        }
        e.preventDefault();
    };

    const calculate_slide_positions = (/** @type {Event} */ e) => {
        const notebook_node = /** @type {HTMLElement?} */ (e.target)?.closest("pluto-editor")?.querySelector("pluto-notebook");
        if (!notebook_node) return []

        const height = window.innerHeight;
        const headers = Array.from(notebook_node.querySelectorAll("pluto-output h1, pluto-output h2"));
        const pos = headers.map((el) => el.getBoundingClientRect());
        const edges = pos.map((rect) => rect.top + window.scrollY);

        edges.push(notebook_node.getBoundingClientRect().bottom + window.scrollY);

        const scrollPositions = headers.map((el, i) => {
            if (el.tagName == "H1") {
                // center vertically
                const slideHeight = edges[i + 1] - edges[i] - height;
                return edges[i] - Math.max(0, (height - slideHeight) / 2)
            } else {
                // align to top
                return edges[i] - 20
            }
        });

        return scrollPositions
    };

    const go_previous_slide = (/** @type {Event} */ e) => {
        const positions = calculate_slide_positions(e);

        const pos = positions.reverse().find((y) => y < window.scrollY - 10);

        if (pos) window.scrollTo(window.scrollX, pos);
    };

    const go_next_slide = (/** @type {Event} */ e) => {
        const positions = calculate_slide_positions(e);
        const pos = positions.find((y) => y - 10 > window.scrollY);
        if (pos) window.scrollTo(window.scrollX, pos);
    };

    const presenting_ref = hooks_pin_v113_target_es2020.useRef(false);
    presenting_ref.current = presenting;
    // @ts-ignore
    window.present = () => {
        set_presenting(!presenting_ref.current);
    };

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        document.body.classList.toggle("presentation", presenting);

        if (!presenting) return // We do not add listeners if not presenting

        window.addEventListener("keydown", move_slides_with_keyboard);

        return () => {
            window.removeEventListener("keydown", move_slides_with_keyboard);
        }
    }, [presenting]);

    return html`
        <nav id="slide_controls" inert=${!presenting}>
            <button ref=${button_prev_ref} class="changeslide prev" title="Previous slide" onClick=${go_previous_slide}><span></span></button>
            <button ref=${button_next_ref} class="changeslide next" title="Next slide" onClick=${go_next_slide}><span></span></button>
        </nav>
    `
};

//@ts-ignore

const Circle = ({ fill }) => html`
    <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        style="
        height: .7em;
        width: .7em;
        margin-left: .3em;
        margin-right: .2em;
    "
    >
        <circle cx="24" cy="24" r="24" fill=${fill}></circle>
    </svg>
`;
const Triangle = ({ fill }) => html`
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
        <polygon points="24,0 48,40 0,40" fill=${fill} stroke="none" />
    </svg>
`;
const Square = ({ fill }) => html`
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
        <polygon points="0,0 0,40 40,40 40,0" fill=${fill} stroke="none" />
    </svg>
`;

const WarnForVisisblePasswords = () => {
    if (
        Array.from(document.querySelectorAll("bond")).some((bond_el) =>
            Array.from(bond_el.querySelectorAll(`input[type="password"]`)).some((input) => {
                // @ts-ignore
                if (input?.value !== "") {
                    input.scrollIntoView();
                    return true
                }
            })
        )
    ) {
        alert(
            "Warning: this notebook includes a password input with something typed in it. The contents of this password field will be included in the exported file in an unsafe way. \n\nClear the password field and export again to avoid this problem."
        );
    }
};

const ExportBanner = ({ notebook_id, print_title, open, onClose, notebookfile_url, notebookexport_url, start_recording }) => {
    // @ts-ignore
    const isDesktop = !!window.plutoDesktop;

    const exportNotebook = (/** @type {{ preventDefault: () => void; }} */ e, /** @type {Desktop.PlutoExport} */ type) => {
        if (isDesktop) {
            e.preventDefault();
            window.plutoDesktop?.fileSystem.exportNotebook(notebook_id, type);
        }
    };

    //
    let print_old_title_ref = hooks_pin_v113_target_es2020.useRef("");
    useEventListener(
        window,
        "beforeprint",
        (e) => {
            if (!e.detail?.fake) {
                print_old_title_ref.current = document.title;
                document.title = print_title.replace(/\.jl$/, "").replace(/\.plutojl$/, "");
            }
        },
        [print_title]
    );
    useEventListener(
        window,
        "afterprint",
        () => {
            document.title = print_old_title_ref.current;
        },
        [print_title]
    );

    const element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLDialogElement?} */ (null));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (element_ref.current != null && typeof HTMLDialogElement !== "function") dialogPolyfill.registerDialog(element_ref.current);
    }, [element_ref.current]);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        // Closing doesn't play well if the browser is old and the dialog not open
        // https://github.com/GoogleChrome/dialog-polyfill/issues/149
        if (open) {
            element_ref.current?.open === false && element_ref.current?.show?.();
        } else {
            element_ref.current?.open && element_ref.current?.close?.();
        }
    }, [open, element_ref.current]);

    const onCloseRef = hooks_pin_v113_target_es2020.useRef(onClose);
    onCloseRef.current = onClose;

    useEventListener(
        element_ref.current,
        "focusout",
        () => {
            if (!element_ref.current?.matches(":focus-within")) onCloseRef.current();
        },
        []
    );
    const prideMonth = new Date().getMonth() === 5;

    return html`
        <dialog id="export" inert=${!open} open=${open} ref=${element_ref} class=${prideMonth ? "pride" : ""}>
            <div id="container">
                <div class="export_title">export</div>
                <!-- no "download" attribute here: we want the jl contents to be shown in a new tab -->
                <a href=${notebookfile_url} target="_blank" class="export_card" onClick=${(e) => exportNotebook(e, 0)}>
                    <header role="none"><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a
                    href=${notebookexport_url}
                    target="_blank"
                    class="export_card"
                    download=""
                    onClick=${(e) => {
                        WarnForVisisblePasswords();
                        exportNotebook(e, 1);
                    }}
                >
                    <header role="none"><${Square} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a href="#" class="export_card" onClick=${() => window.print()}>
                    <header role="none"><${Square} fill="#619b3d" /> PDF</header>
                    <section>A static <b>.pdf</b> file for print or email.</section>
                </a>
                ${html`
                    <div class="export_title">record</div>
                    <a
                        href="#"
                        onClick=${(e) => {
                            WarnForVisisblePasswords();
                            start_recording();
                            onClose();
                            e.preventDefault();
                        }}
                        class="export_card"
                    >
                        <header role="none"><${Circle} fill="#E86F51" /> Record <em>(preview)</em></header>
                        <section>Capture the entire notebook, and any changes you make.</section>
                    </a>
                `}
                ${prideMonth
                    ? html`<div class="pride_message">
                          <p>The future is <strong>queer</strong>!</p>
                      </div>`
                    : null}
            </div>
            <div class="export_small_btns">
                <button
                    title="Edit frontmatter"
                    class="toggle_frontmatter_edit"
                    onClick=${() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent("open pluto frontmatter"));
                    }}
                >
                    <span></span>
                </button>
                <button
                    title="Start presentation"
                    class="toggle_presentation"
                    onClick=${() => {
                        onClose();
                        // @ts-ignore
                        window.present();
                    }}
                >
                    <span></span>
                </button>
                <button title="Close" class="toggle_export" onClick=${() => onClose()}>
                    <span></span>
                </button>
            </div>
        </dialog>
    `
};

let setup_done = false;

const setup_mathjax = () => {
    if (setup_done) {
        return
    }
    setup_done = true;

    const deprecated = () =>
        console.error(
            "Pluto.jl: Pluto loads MathJax 3 globally, but a MathJax 2 function was called. The two version can not be used together on the same web page."
        );
    const twowasloaded = () =>
        console.error(
            "Pluto.jl: MathJax 2 is already loaded in this page, but Pluto wants to load MathJax 3. Packages that import MathJax 2 in their html display will break Pluto's ability to render latex."
        );

    // @ts-ignore
    window.MathJax = {
        options: {
            ignoreHtmlClass: "no-MαθJax",
            processHtmlClass: "tex",
        },
        startup: {
            typeset: true, // because we load MathJax asynchronously
            ready: () => {
                // @ts-ignore
                window.MathJax.startup.defaultReady();

                // plotly uses MathJax 2, so we have this shim to make it work kindof
                // @ts-ignore
                window.MathJax.Hub = {
                    Queue: function () {
                        for (var i = 0, m = arguments.length; i < m; i++) {
                            // @ts-ignore
                            var fn = window.MathJax.Callback(arguments[i]);
                            // @ts-ignore
                            window.MathJax.startup.promise = window.MathJax.startup.promise.then(fn);
                        }
                        // @ts-ignore
                        return window.MathJax.startup.promise
                    },
                    Typeset: function (elements, callback) {
                        // @ts-ignore
                        var promise = window.MathJax.typesetPromise(elements);
                        if (callback) {
                            promise = promise.then(callback);
                        }
                        return promise
                    },
                    Register: {
                        MessageHook: deprecated,
                        StartupHook: deprecated,
                        LoadHook: deprecated,
                    },
                    Config: deprecated,
                    Configured: deprecated,
                    setRenderer: deprecated,
                };
            },
        },
        tex: {
            inlineMath: [
                ["$", "$"],
                ["\\(", "\\)"],
            ],
        },
        svg: {
            fontCache: "global",
        },
    };

    requestIdleCallback(
        () => {
            console.log("Loading mathjax!!");
            const src = get_included_external_source("MathJax-script");
            if (!src) throw new Error("Could not find mathjax source")

            const script = document.createElement("script");
            script.addEventListener("load", () => {
                console.log("MathJax loaded!");
                if (window["MathJax"]?.version !== "3.2.2") {
                    twowasloaded();
                }
            });
            script.crossOrigin = src.crossOrigin;
            script.integrity = src.integrity;
            script.src = src.href;
            document.head.append(script);
        },
        { timeout: 2000 }
    );
};

// @ts-ignore
window.__pluto_setup_mathjax = setup_mathjax;

/**
 * Sometimes, we want to render HTML outside of the Cell Output,
 *   for to add toolboxes like the Table of Contents or something similar.
 * 
 * Additionally, the environment may want to inject some non cell/non editor
 * specific HTML to be rendered in the page. This component acts as a sink for
 * rendering these usecases.
 * 
 * That way, the Cell Output can change with a different lifecycle than
 * the Non-Cell output and environments can inject UI.
 * 
 * This component listens to events like the one below and updates
 * document.dispatchEvent(
 *      new CustomEvent("experimental_add_node_non_cell_output", {
 *          detail: { order: 1, node: html`<div>...</div>`, name: "Name of toolbox" }
 *      }))

 */
const NonCellOutput = ({ environment_component, notebook_id }) => {
    const surely_the_latest_updated_set = hooks_pin_v113_target_es2020.useRef();
    const [component_set, update_component_set] = hooks_pin_v113_target_es2020.useState({});
    useEventListener(
        document,
        "eexperimental_add_node_non_cell_output",
        (e) => {
            try {
                const { name, node, order } = e.detail;
                surely_the_latest_updated_set.current = { ...surely_the_latest_updated_set.current, [name]: { node, order } };
                update_component_set(surely_the_latest_updated_set.current);
            } catch (e) {}
        },
        [surely_the_latest_updated_set, update_component_set]
    );

    let components = Object.values(component_set);
    components.sort(({ order: o1 }, { order: o2 }) => o1 - o2);
    components = components.map(({ node }) => node);
    return html`<div class="non-cell-output">
        ${environment_component ? html`<${environment_component} notebook_id=${notebook_id} />` : null} ${components}
    </div>`
};

// @ts-ignore

const create_recorder_mp3 = async () => {
    const wasmURL = get_included_external_source("vmsg-wasm")?.href;

    if (!wasmURL) throw new Error("wasmURL not found")

    const recorder = new vmsg.Recorder({ wasmURL });

    return {
        start: async () => {
            await recorder.initAudio();
            await recorder.initWorker();
            recorder.startRecording();
        },
        stop: async () => {
            const blob = await recorder.stopRecording();

            return window.URL.createObjectURL(blob)
        },
    }
};

const create_recorder = () => {
    try {
        return create_recorder_mp3()
    } catch (e) {
        console.error("Failed to create mp3 recorder", e);
    }

    return create_recorder_native()
};

// really nice but it can only record to audio/ogg or sometihng, nothing that works across all browsers
const create_recorder_native = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    let chunks = [];
    const mediaRecorder = new MediaRecorder(stream, {});

    mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
    };

    new Promise((r) => {
        mediaRecorder.onstart = r;
    });
    let stop_return_promise = new Promise((r) => {
        mediaRecorder.onstop = function (e) {
            const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
            chunks = [];
            const audioURL = window.URL.createObjectURL(blob);

            r(audioURL);
        };
    });

    return {
        start: () => {
            mediaRecorder.start();
        },
        stop: () => {
            mediaRecorder.stop();
            return stop_return_promise
        },
    }
};

// taken from https://github.com/edoudou/create-silent-audio

// original license from https://github.com/edoudou/create-silent-audio/blob/master/LICENSE

/*

MIT License

Copyright (c) 2019 Edouard Short

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

function createSilentAudio(time, freq = 44100) {
    const length = time * freq;
    // @ts-ignore
    const AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
    if (!AudioContext) {
        console.log("No Audio Context");
    }
    const context = new AudioContext();
    const audioFile = context.createBuffer(1, length, freq);
    return URL.createObjectURL(bufferToWave(audioFile, length))
}

function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        i,
        sample,
        offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    // create Blob
    return new Blob([buffer], { type: "audio/wav" })

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

let run = (x) => x();

const AudioPlayer = ({ onPlay, src, loaded_recording, audio_element_ref }) => {
    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        run(async () => {
            if (src == null) {
                // We create a silent audio track to play. The duration is the last timestamp of the loaded recording state.
                let last_timestamp = (things) => _.last([[0, null], ...things])[0];
                let fake_duration = Math.max(last_timestamp((await loaded_recording).scrolls), last_timestamp((await loaded_recording).steps));
                fake_duration = Math.ceil(fake_duration + 0.1);
                console.log({ fake_duration });

                let fake_source = createSilentAudio(fake_duration);
                audio_element_ref.current.src = fake_source;
            } else {
                audio_element_ref.current.src = src;
            }
        });
    }, []);

    return html`<div class="recording-playback"><audio ref=${audio_element_ref} onPlay=${onPlay} controls></audio></div>`
};

const assert_response_ok = (/** @type {Response} */ r) => (r.ok ? r : Promise.reject(r));

/**
 * @typedef {[number, Array?]} PatchStep
 */

/**
 * @typedef {Object} RecordingData
 * @property {Array<PatchStep>} steps
 * @property {Array<[number, {cell_id: string, relative_distance: number}]>} scrolls
 */

/**
 * @typedef {RecordingData & {
 *   initial_html: string,
 * scroll_handler: (x: number) => void,
 * audio_recorder: {start: () => void, stop: () => Promise<string>}?
 * }} RecordingState
 */

const RecordingUI = ({ notebook_name, is_recording, recording_waiting_to_start, set_recording_states, patch_listeners, export_url }) => {
    let current_recording_ref = hooks_pin_v113_target_es2020.useRef(/** @type{RecordingState?} */ (null));
    let recording_start_time_ref = hooks_pin_v113_target_es2020.useRef(0);

    hooks_pin_v113_target_es2020.useEffect(() => {
        let listener = (patches) => {
            if (current_recording_ref.current != null) {
                current_recording_ref.current.steps = [
                    ...current_recording_ref.current.steps,
                    [(Date.now() - recording_start_time_ref.current) / 1000, patches],
                ];
            }
        };

        patch_listeners.push(listener);

        return () => {
            patch_listeners.splice(patch_listeners.indexOf(listener), 1);
        }
    }, []);

    const start_recording = async ({ want_audio }) => {
        let audio_recorder = null,
            audio_record_start_promise;

        let abort = async (e) => {
            alert(
                `We were unable to activate your microphone. Make sure that it is connected, and that this site (${
                    window.location.protocol + "//" + window.location.host
                }) has permission to use the microphone.`
            );
            console.warn("Failed to create audio recorder asdfasdf ", e);
            await stop_recording();
        };

        if (want_audio) {
            try {
                audio_recorder = await create_recorder();
                audio_record_start_promise = audio_recorder.start();
            } catch (e) {
                await abort(e);
                return
            }
        }

        let initial_html = await (await fetch(export_url("notebookexport")).then(assert_response_ok)).text();

        initial_html = initial_html.replaceAll(
            "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/",
            "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@8d243df/frontend/"
        );
        // initial_html = initial_html.replaceAll("https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@0.17.3/frontend/", "http://localhost:1234/")

        const scroll_handler_direct = () => {
            if (current_recording_ref.current == null) return

            let y = window.scrollY + window.innerHeight / 2;

            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"));

            let best_index = "";
            let relative_distance = 0;

            cell_nodes.forEach((el, i) => {
                let cy = el.offsetTop;
                if (cy <= y) {
                    best_index = el.id;
                    relative_distance = (y - cy) / el.offsetHeight;
                }
            });

            current_recording_ref.current.scrolls = [
                ...current_recording_ref.current.scrolls,
                [
                    (Date.now() - recording_start_time_ref.current) / 1000,
                    {
                        cell_id: best_index,
                        relative_distance,
                    },
                ],
            ];
        };
        const scroll_handler = _.debounce(scroll_handler_direct, 500);

        try {
            await audio_record_start_promise;
        } catch (e) {
            await abort(e);
            return
        }

        current_recording_ref.current = {
            initial_html,
            steps: [],
            scrolls: [],
            scroll_handler,
            audio_recorder,
        };
        recording_start_time_ref.current = Date.now();

        set_recording_states({ is_recording: true, recording_waiting_to_start: false });

        // call it once to record the start scroll position
        scroll_handler_direct();
        window.addEventListener("scroll", scroll_handler, { passive: true });
    };

    let notebook_name_ref = hooks_pin_v113_target_es2020.useRef(notebook_name);
    notebook_name_ref.current = _.last(notebook_name.split("/"))
        .replace(/\.jl$/, "")
        .replace(/\.plutojl$/, "");
    const stop_recording = async () => {
        if (current_recording_ref.current != null) {
            const { audio_recorder, initial_html, steps, scrolls, scroll_handler } = current_recording_ref.current;
            // @ts-ignore
            window.removeEventListener("scroll", scroll_handler, { passive: true });

            const audio_blob_url = await audio_recorder?.stop();
            const audio_data_url = audio_blob_url == null ? null : await blob_url_to_data_url(audio_blob_url);

            const magic_tag = `<meta name="pluto-insertion-spot-parameters">`;
            const output_html = initial_html.replace(
                magic_tag,
                `
                <script>
                window.pluto_recording_url = "data:;base64,${await base64_arraybuffer(pack({ steps: steps, scrolls: scrolls }))}";
                window.pluto_recording_audio_url = ${audio_data_url == null ? null : `"${audio_data_url}"`};
                </script>
                ${magic_tag}`
            );

            console.log(current_recording_ref.current);

            let element = document.createElement("a");
            element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(output_html));
            element.setAttribute("download", `${notebook_name_ref.current} recording.html`);

            element.style.display = "none";
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }

        recording_start_time_ref.current = 0;
        current_recording_ref.current = null;

        set_recording_states({ is_recording: false, recording_waiting_to_start: false });
    };

    return html`
        <div class="outline-frame recording"></div>
        ${recording_waiting_to_start
            ? html`<div class="outline-frame-actions-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
                              start_recording({ want_audio: true });
                          }}
                      >
                          <span><b>Start recording</b><span class="microphone-icon pluto-icon"></span></span>
                      </button>
                  </div>
                  <div class="overlay-button record-no-audio">
                      <button
                          onclick=${() => {
                              start_recording({ want_audio: false });
                          }}
                      >
                          <span><b>Start recording</b> (no audio)<span class="mute-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
            : is_recording
            ? html`<div class="outline-frame-actions-container">
                  <div class="overlay-button">
                      <button
                          onclick=${() => {
                              stop_recording();
                          }}
                      >
                          <span><b>Stop recording</b><span class="stop-recording-icon pluto-icon"></span></span>
                      </button>
                  </div>
              </div>`
            : null}
    `
};

let get_scroll_top = ({ cell_id, relative_distance }) => {
    let cell = document.getElementById(cell_id);
    if (cell) return cell.offsetTop + relative_distance * cell.offsetHeight - window.innerHeight / 2
};

/**
 *
 * @param {{
 *  launch_params: import("./Editor.js").LaunchParameters,
 *  initializing: boolean,
 *  [key: string]: any,
 * }} props
 * @returns
 */
const RecordingPlaybackUI = ({ launch_params, initializing, apply_notebook_patches, reset_notebook_state }) => {
    const { recording_url, recording_url_integrity, recording_audio_url } = launch_params;

    let loaded_recording = hooks_pin_v113_target_es2020.useMemo(
        () =>
            Promise.resolve().then(async () => {
                if (recording_url) {
                    return unpack(
                        new Uint8Array(
                            await (
                                await fetch(new Request(recording_url, { integrity: recording_url_integrity ?? undefined })).then(assert_response_ok)
                            ).arrayBuffer()
                        )
                    )
                } else {
                    return null
                }
            }),
        [recording_url]
    );
    let computed_reverse_patches_ref = hooks_pin_v113_target_es2020.useRef(/** @type{Array<PatchStep>?} */ (null));

    hooks_pin_v113_target_es2020.useEffect(() => {
        loaded_recording.then(console.log);
    }, [loaded_recording]);

    let audio_element_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLAudioElement?} */ (null));

    let match_state_to_playback_running_ref = hooks_pin_v113_target_es2020.useRef(false);
    let current_state_timestamp_ref = hooks_pin_v113_target_es2020.useRef(0);

    let [current_scrollY, set_current_scrollY] = hooks_pin_v113_target_es2020.useState(/** @type {number?} */ (null));
    let [following_scroll, set_following_scroll] = hooks_pin_v113_target_es2020.useState(true);
    let following_scroll_ref = hooks_pin_v113_target_es2020.useRef(following_scroll);
    following_scroll_ref.current = following_scroll;
    let was_playing_before_scrollout_ref = hooks_pin_v113_target_es2020.useRef(false);

    let last_manual_window_scroll_time_ref = hooks_pin_v113_target_es2020.useRef(0);
    let last_manual_window_smoothscroll_time_ref = hooks_pin_v113_target_es2020.useRef(0);
    const scroll_window = (scrollY, smooth = true) => {
        last_manual_window_scroll_time_ref.current = Date.now();
        last_manual_window_smoothscroll_time_ref.current = Date.now();
        window.scrollTo({
            top: scrollY,
            behavior: smooth ? "smooth" : "auto",
        });
    };

    let on_scroll = ({ cell_id, relative_distance }, smooth = true) => {
        let scrollY = get_scroll_top({ cell_id, relative_distance });
        if (scrollY == null) return
        set_current_scrollY(scrollY);
        if (following_scroll_ref.current) {
            scroll_window(scrollY, smooth);
        }
    };

    const match_state_to_playback_ref = hooks_pin_v113_target_es2020.useRef(() => {});
    match_state_to_playback_ref.current = async () => {
        match_state_to_playback_running_ref.current = true;

        const deserialized = /** @type {RecordingData} */ (await loaded_recording);

        computed_reverse_patches_ref.current = computed_reverse_patches_ref.current ?? deserialized.steps.map(([t, s]) => [t, undefined]);

        const audio = audio_element_ref.current;
        if (audio == null) return

        let new_timestamp = audio.currentTime;
        let forward = new_timestamp >= current_state_timestamp_ref.current;
        /** @type {<T>(x: T[]) => T[]} */
        let directed = (x) => (forward ? x : [...x].reverse());

        let lower = Math.min(current_state_timestamp_ref.current, new_timestamp);
        let upper = Math.max(current_state_timestamp_ref.current, new_timestamp);

        let scrolls_in_time_window = deserialized.scrolls.filter(([t, s]) => lower < t && t <= upper);
        if (scrolls_in_time_window.length > 0) {
            let scroll_state = _.last(directed(scrolls_in_time_window))?.[1];

            if (scroll_state) on_scroll(scroll_state);
        }

        let steps_in_current_direction = forward ? deserialized.steps : computed_reverse_patches_ref.current;
        let steps_and_indices = steps_in_current_direction.map((x, i) => /** @type{[PatchStep, number]} */ ([x, i]));
        let steps_and_indices_in_time_window = steps_and_indices.filter(([[t, s], i]) => lower < t && t <= upper);

        let reverse_patches = [];
        for (let [[t, patches], i] of directed(steps_and_indices_in_time_window)) {
            reverse_patches = await apply_notebook_patches(patches, undefined, forward);
            if (forward) {
                computed_reverse_patches_ref.current[i] = [t, reverse_patches];
            }
        }
        // if (!_.isEmpty(steps_and_indices_in_time_window)) console.log(computed_reverse_patches_ref.current)

        current_state_timestamp_ref.current = new_timestamp;

        if (audio.paused) {
            match_state_to_playback_running_ref.current = false;
        } else {
            requestAnimationFrame(() => match_state_to_playback_ref.current());
        }
    };

    let on_audio_playback_change = hooks_pin_v113_target_es2020.useCallback(
        (e) => {
            // console.log(e)

            if (!match_state_to_playback_running_ref.current) {
                match_state_to_playback_ref.current();
            }
        },
        [match_state_to_playback_running_ref, match_state_to_playback_ref]
    );

    const event_names = ["seeked", "suspend", "play", "pause", "ended", "waiting"];

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        const audio_el = audio_element_ref.current;
        if (audio_el) {
            event_names.forEach((en) => {
                audio_el.addEventListener(en, on_audio_playback_change);
            });

            return () => {
                event_names.forEach((en) => {
                    audio_el.removeEventListener(en, on_audio_playback_change);
                });
            }
        }
    }, [audio_element_ref.current, on_audio_playback_change]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!initializing && recording_url != null) {
            // if we are playing a recording, fix the initial scroll position
            loaded_recording.then((x) => {
                let first_scroll = _.first(x?.scrolls);
                if (first_scroll) {
                    let obs = new ResizeObserver(() => {
                        console.log("Scrolling back to first recorded scroll position...");
                        on_scroll(first_scroll[1], false);
                    });
                    let old_value = history.scrollRestoration;
                    history.scrollRestoration = "manual";
                    obs.observe(document.body);
                    setTimeout(() => {
                        history.scrollRestoration = old_value;
                        obs.disconnect();
                    }, 3000);
                    on_scroll(first_scroll[1], false);
                }

                document.fonts.ready.then(() => {
                    console.info("Fonts loaded");
                    on_scroll(first_scroll[1], false);
                });
            });
        }
    }, [initializing]);

    hooks_pin_v113_target_es2020.useEffect(() => {
    }, [initializing]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!initializing && recording_url != null) {
            let on_scroll = (e) => {
                let now = Date.now();
                let dt = (now - last_manual_window_scroll_time_ref.current) / 1000;
                let smooth_dt = (now - last_manual_window_smoothscroll_time_ref.current) / 1000;
                let is_first_smooth_scroll = smooth_dt === dt;
                let ignore = dt < 1 && (is_first_smooth_scroll || smooth_dt < 0.2);
                if (ignore) {
                    // then this must have been a browser-initiated smooth scroll event
                    last_manual_window_smoothscroll_time_ref.current = now;
                    // console.log("ignoring scroll", { ignore, dt, smooth_dt, e })
                }

                if (!ignore) {
                    if (following_scroll_ref.current) {
                        console.warn("Manual scroll detected, no longer following playback scroll", { dt, smooth_dt, e });

                        if (audio_element_ref.current != null) {
                            was_playing_before_scrollout_ref.current = !audio_element_ref.current.paused;
                            audio_element_ref.current.pause();
                        }
                        set_following_scroll(false);
                    }
                }
            };

            document.fonts.ready.then(() => {
                window.addEventListener("scroll", on_scroll, { passive: true });
            });
            return () => {
                // @ts-ignore
                window.removeEventListener("scroll", on_scroll, { passive: true });
            }
        }
    }, [initializing, recording_url]);

    let frame = html`<div
        style=${{
            opacity: following_scroll ? 0.0 : 1,
            top: `${current_scrollY ?? 0}px`,
        }}
        class="outline-frame playback"
    ></div>`;

    return html`
        ${recording_url
            ? html`${!following_scroll
                      ? html` <div class="outline-frame-actions-container">
                            <div class="overlay-button playback">
                                <button
                                    onclick=${() => {
                                        scroll_window(current_scrollY, true);
                                        set_following_scroll(true);
                                        if (was_playing_before_scrollout_ref.current && audio_element_ref.current) audio_element_ref.current.play();
                                    }}
                                >
                                    <span>Back to <b>recording</b> <span class="follow-recording-icon pluto-icon"></span></span>
                                </button>
                            </div>
                        </div>`
                      : null}
                  ${frame} <${AudioPlayer} audio_element_ref=${audio_element_ref} src=${recording_audio_url} loaded_recording=${loaded_recording} />`
            : null}
    `
};

/**
 * Time flies when you're building Pluto...
 * At one moment you self-assignee to issue number #1, next moment we're approaching issue #2000...
 *
 * We can't just put `<base target="_blank">` in the `<head>`, because this also opens hash links
 * like `#id` in a new tab...
 *
 * This components takes every click event on an <a> that points to another origin (i.e. not `#id`)
 * and sneakily puts in a `target="_blank"` attribute so it opens in a new tab.
 *
 * Fixes https://github.com/fonsp/Pluto.jl/issues/1
 * Based on https://stackoverflow.com/a/12552017/2681964
 */
let HijackExternalLinksToOpenInNewTab = () => {
    useEventListener(
        document,
        "click",
        (event) => {
            if (event.defaultPrevented) return

            const origin = event.target.closest(`a`);

            if (origin && !origin.hasAttribute("target")) {
                let as_url = new URL(origin.href);
                if (as_url.origin !== window.location.origin) {
                    origin.target = "_blank";
                }
            }
        },
        []
    );

    return null
};

const transparent_svg = "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E";

const str_to_degree = (s) => ([...s].reduce((a, b) => a + b.charCodeAt(0), 0) * 79) % 360;

/**
 * @param {{
 *  source_manifest?: import("./Featured.js").SourceManifest,
 *  entry: import("./Featured.js").SourceManifestNotebookEntry,
 *  direct_html_links: boolean,
 *  disable_links: boolean,
 *  image_loading?: string,
 * }} props
 */
const FeaturedCard = ({ entry, source_manifest, direct_html_links, disable_links, image_loading }) => {
    const title = entry.frontmatter?.title;

    const { source_url } = source_manifest ?? {};

    const u = (/** @type {string | null | undefined} */ x) =>
        source_url == null
            ? _.isEmpty(x)
                ? null
                : x
            : x == null
            ? null
            : // URLs are relative to the source URL...
              new URL(
                  x,
                  // ...and the source URL is relative to the current location
                  new URL(source_url, window.location.href)
              ).href;

    // `direct_html_links` means that we will navigate you directly to the exported HTML file. Otherwise, we use our local editor, with the exported state as parameters. This lets users run the featured notebooks locally.
    const href = disable_links
        ? "#"
        : direct_html_links
        ? u(entry.html_path)
        : with_query_params(`edit`, {
              statefile: u(entry.statefile_path),
              notebookfile: u(entry.notebookfile_path),
              notebookfile_integrity: entry.hash == null ? null : `sha256-${base64url_to_base64(entry.hash)}`,
              disable_ui: `true`,
              name: title == null ? null : `sample ${title}`,
              pluto_server_url: `.`,
              // Little monkey patch because we don't want to use the slider server when for the CDN source, only for the featured.plutojl.org source. But both sources have the same pluto_export.json so this is easiest.
              slider_server_url: source_url?.includes("cdn.jsdelivr.net/gh/JuliaPluto/featured") ? null : u(source_manifest?.slider_server_url),
          });

    const author = author_info(entry.frontmatter);

    return html`
        <featured-card style=${`--card-color-hue: ${str_to_degree(entry.id)}deg;`}>
            <a class="banner" href=${href}><img src=${u(entry?.frontmatter?.image) ?? transparent_svg} loading=${image_loading} /></a>
            ${author?.name == null
                ? null
                : html`
                      <div class="author">
                          <img src=${author.image ?? transparent_svg} loading=${image_loading} />
                          <span>
                              <a href=${author.url}>${author.name}</a>
                              ${author.has_coauthors ? html` and others` : null}
                          </span>
                      </div>
                  `}
            <h3><a href=${href} title=${entry?.frontmatter?.title}>${entry?.frontmatter?.title ?? entry.id}</a></h3>
            <p title=${entry?.frontmatter?.description}>${entry?.frontmatter?.description}</p>
        </featured-card>
    `
};

/**
 * @typedef AuthorInfo
 * @type {{
 * name: string?,
 * url: string?,
 * image: string?,
 * has_coauthors?: boolean,
 * }}
 */

/**
 * @returns {AuthorInfo?}
 */
const author_info = (frontmatter) =>
    author_info_item(frontmatter.author) ??
    author_info_item({
        name: frontmatter.author_name,
        url: frontmatter.author_url,
        image: frontmatter.author_image,
    });

/**
 * @returns {AuthorInfo?}
 */
const author_info_item = (x) => {
    if (x instanceof Array) {
        const first = author_info_item(x[0]);
        if (first?.name) {
            const has_coauthors = x.length > 1;
            return { ...first, has_coauthors }
        }
    } else if (typeof x === "string") {
        return {
            name: x,
            url: null,
            image: null,
        }
    } else if (x instanceof Object) {
        let { name, image, url } = x;

        if (image == null && !_.isEmpty(url)) {
            image = url + ".png?size=48";
        }

        return {
            name,
            url,
            image,
        }
    }
    return null
};

/**
 * @param {{
 *  filename: String,
 *  remote_frontmatter: Record<String,any>?,
 *  set_remote_frontmatter: (newval: Record<String,any>) => Promise<void>,
 * }} props
 * */
const FrontMatterInput = ({ filename, remote_frontmatter, set_remote_frontmatter }) => {
    const [frontmatter, set_frontmatter] = hooks_pin_v113_target_es2020.useState(remote_frontmatter ?? {});

    hooks_pin_v113_target_es2020.useEffect(() => {
        set_frontmatter(remote_frontmatter ?? {});
    }, [remote_frontmatter]);

    const fm_setter = (key) => (value) =>
        set_frontmatter(
            immer((fm) => {
                _.set(fm, key, value);
            })
        );

    const [dialog_ref, open, close, _toggle] = useDialog();

    const cancel = () => {
        set_frontmatter(remote_frontmatter ?? {});
        close();
    };

    const set_remote_frontmatter_ref = hooks_pin_v113_target_es2020.useRef(set_remote_frontmatter);
    set_remote_frontmatter_ref.current = set_remote_frontmatter;

    const submit = hooks_pin_v113_target_es2020.useCallback(() => {
        set_remote_frontmatter_ref
            .current(clean_data(frontmatter) ?? {})
            .then(() => alert("Frontmatter synchronized ✔\n\nThese parameters will be used in future exports."));
        close();
    }, [clean_data, frontmatter, close]);

    useEventListener(window, "open pluto frontmatter", open);

    useEventListener(
        window,
        "keydown",
        (e) => {
            if (dialog_ref.current != null) if (dialog_ref.current.contains(e.target)) if (e.key === "Enter" && has_ctrl_or_cmd_pressed(e)) submit();
        },
        [submit]
    );

    const frontmatter_with_defaults = {
        title: null,
        description: null,
        date: null,
        tags: [],
        author: [{}],
        ...frontmatter,
    };

    const show_entry = ([key, value]) => !((_.isArray(value) && field_type(key) !== "tags") || _.isPlainObject(value));

    const entries_input = (data, base_path) => {
        return html`
            ${Object.entries(data)
                .filter(show_entry)
                .map(([key, value]) => {
                    let path = `${base_path}${key}`;
                    let id = `fm-${path}`;
                    return html`
                        <label for=${id}>${key}</label>
                        <${Input} type=${field_type(key)} id=${id} value=${value} on_value=${fm_setter(path)} />
                        <button
                            class="deletefield"
                            title="Delete field"
                            aria-label="Delete field"
                            onClick=${() => {
                                //  TODO
                                set_frontmatter(
                                    immer((fm) => {
                                        _.unset(fm, path);
                                    })
                                );
                            }}
                        >
                            ✕
                        </button>
                    `
                })}
            <button
                class="addentry"
                onClick=${() => {
                    const fieldname = prompt("Field name:");
                    if (fieldname) {
                        set_frontmatter(
                            immer((fm) => {
                                _.set(fm, `${base_path}${fieldname}`, null);
                            })
                        );
                    }
                }}
            >
                Add entry +
            </button>
        `
    };

    return html`<dialog ref=${dialog_ref} class="pluto-frontmatter">
        <h1>Frontmatter</h1>
        <p>
            If you are publishing this notebook on the web, you can set the parameters below to provide HTML metadata. This is useful for search engines and
            social media.
        </p>
        <div class="card-preview" aria-hidden="true">
            <h2>Preview</h2>
            <${FeaturedCard}
                entry=${
                    /** @type {import("./welcome/Featured.js").SourceManifestNotebookEntry} */ ({
                        id: filename.replace(/\.jl$/, ""),
                        hash: "xx",
                        frontmatter: clean_data(frontmatter) ?? {},
                    })
                }
                image_loading=${"lazy"}
                disable_links=${true}
            />
        </div>
        <div class="fm-table">
            ${entries_input(frontmatter_with_defaults, ``)}
            ${!_.isArray(frontmatter_with_defaults.author)
                ? null
                : frontmatter_with_defaults.author.map((author, i) => {
                      let author_with_defaults = {
                          name: null,
                          url: null,
                          ...author,
                      };

                      return html`
                          <fieldset class="fm-table">
                              <legend>Author ${i + 1}</legend>

                              ${entries_input(author_with_defaults, `author[${i}].`)}
                          </fieldset>
                      `
                  })}
            ${!_.isArray(frontmatter_with_defaults.author)
                ? null
                : html`<button
                      class="addentry"
                      onClick=${() => {
                          set_frontmatter((fm) => ({ ...fm, author: [...(fm?.author ?? []), {}] }));
                      }}
                  >
                      Add author +
                  </button>`}
        </div>

        <div class="final"><button onClick=${cancel}>Cancel</button><button onClick=${submit}>Save</button></div>
    </dialog>`
};

const clean_data = (obj) => {
    let a = _.isPlainObject(obj)
        ? Object.fromEntries(
              Object.entries(obj)
                  .map(([key, val]) => [key, clean_data(val)])
                  .filter(([key, val]) => val != null)
          )
        : _.isArray(obj)
        ? obj.map(clean_data).filter((x) => x != null)
        : obj;

    return !_.isNumber(a) && _.isEmpty(a) ? null : a
};

let test = clean_data({ a: 1, b: "", c: null, d: [], e: [1, "", null, 2], f: {}, g: [{}], h: [{ z: "asdf" }] });

console.assert(
    _.isEqual(test, {
        a: 1,
        e: [1, 2],
        h: [{ z: "asdf" }],
    }),
    test
);

const special_field_names = ["tags", "date", "license", "url", "color"];

const field_type = (name) => {
    for (const t of special_field_names) {
        if (name === t || name.endsWith(`_${t}`)) {
            return t
        }
    }
    return "text"
};

const Input = ({ value, on_value, type, id }) => {
    const input_ref = hooks_pin_v113_target_es2020.useRef(/** @type {HTMLInputElement?} */ (null));

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!input_ref.current) return
        input_ref.current.value = value;
    }, [input_ref.current, value]);

    hooks_pin_v113_target_es2020.useLayoutEffect(() => {
        if (!input_ref.current) return
        const listener = (e) => {
            if (!input_ref.current) return
            on_value(input_ref.current.value);
        };

        input_ref.current.addEventListener("input", listener);
        return () => {
            input_ref.current?.removeEventListener("input", listener);
        }
    }, [input_ref.current]);

    const placeholder = type === "url" ? "https://..." : undefined;

    return type === "tags"
        ? html`<rbl-tag-input id=${id} ref=${input_ref} />`
        : type === "license"
        ? LicenseInput({ ref: input_ref, id })
        : html`<input type=${type} id=${id} ref=${input_ref} placeholder=${placeholder} />`
};

// https://choosealicense.com/licenses/
// and check https://github.com/sindresorhus/spdx-license-list/blob/HEAD/spdx-simple.json
const code_licenses = ["AGPL-3.0", "GPL-3.0", "LGPL-3.0", "MPL-2.0", "Apache-2.0", "MIT", "BSL-1.0", "Unlicense"];

// https://creativecommons.org/about/cclicenses/
// and check https://github.com/sindresorhus/spdx-license-list/blob/HEAD/spdx-simple.json
const creative_licenses = ["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC-BY-ND-4.0", "CC-BY-NC-ND-4.0", "CC0-1.0"];

const licenses = [...code_licenses, ...creative_licenses];

const LicenseInput = ({ ref, id }) => {
    return html`
        <input ref=${ref} id=${id} type="text" list="oss-licenses" />
        <datalist id="oss-licenses">${licenses.map((name) => html`<option>${name}</option>`)}</datalist>
    `
};

// This file is very similar to `start_binder` in Binder.js

/**
 *
 * @param {{
 *  launch_params: import("../components/Editor.js").LaunchParameters,
 *  setStatePromise: any,
 *  connect: () => Promise<void>,
 * }} props
 */
const start_local = async ({ setStatePromise, connect, launch_params }) => {
    try {
        if (launch_params.pluto_server_url == null || launch_params.notebookfile == null) throw Error("Invalid launch parameters for starting locally.")

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.backend_launch_phase = BackendLaunchPhase.responded;
                state.disable_ui = false;
                // Clear the Status of the process that generated the HTML
                state.notebook.status_tree = null;
            })
        );

        const with_token = (x) => String(x);
        const binder_session_url = new URL(launch_params.pluto_server_url, window.location.href);

        let open_response;

        // We download the notebook file contents, and then upload them to the Pluto server.
        const notebook_contents = await (
            await fetch(new Request(launch_params.notebookfile, { integrity: launch_params.notebookfile_integrity ?? undefined }))
        ).arrayBuffer();

        open_response = await fetch(
            with_token(
                with_query_params(new URL("notebookupload", binder_session_url), {
                    name: new URLSearchParams(window.location.search).get("name"),
                    clear_frontmatter: "yesplease",
                    execution_allowed: "yepperz",
                })
            ),
            {
                method: "POST",
                body: notebook_contents,
            }
        );

        if (!open_response.ok) {
            let b = await open_response.blob();
            window.location.href = URL.createObjectURL(b);
            return
        }

        const new_notebook_id = await open_response.text();
        const edit_url = with_query_params(new URL("edit", binder_session_url), { id: new_notebook_id });
        console.info("notebook_id:", new_notebook_id);

        window.history.replaceState({}, "", edit_url);

        await setStatePromise(
            immer((/** @type {import("../components/Editor.js").EditorState} */ state) => {
                state.notebook.notebook_id = new_notebook_id;
                state.backend_launch_phase = BackendLaunchPhase.notebook_running;
            })
        );
        console.log("Connecting WebSocket");

        const connect_promise = connect();
        await timeout_promise(connect_promise, 20_000).catch((e) => {
            console.error("Failed to establish connection within 20 seconds. Navigating to the edit URL directly.", e);

            window.parent.location.href = with_token(edit_url);
        });
    } catch (err) {
        console.error("Failed to initialize binder!", err);
        alert("Something went wrong! 😮\n\nWe failed to open this notebook. Please try again with a different browser, or come back later.");
    }
};

const EditorLaunchBackendButton = ({ editor, launch_params, status }) => {
    try {
        const EnvRun = hooks_pin_v113_target_es2020.useMemo(
            // @ts-ignore
            () => window?.pluto_injected_environment?.environment?.({ client: editor.client, editor, imports: { immer, preact } })?.custom_run_or_edit,
            [editor.client, editor]
        );
        // @ts-ignore
        if (window?.pluto_injected_environment?.provides_backend) {
            // @ts-ignore
            return html`<${EnvRun} editor=${editor} backend_phases=${BackendLaunchPhase} launch_params=${launch_params} />`
            // Don't allow a misconfigured environment to stop offering other backends
        }
    } catch (e) {}
    if (status == null) return null
    if (status.offer_local)
        return html`<${RunLocalButton}
            start_local=${() =>
                start_local({
                    setStatePromise: editor.setStatePromise,
                    connect: editor.connect,
                    launch_params: launch_params,
                })}
        />`

    if (status.offer_binder)
        return html`<${BinderButton}
            offer_binder=${status.offer_binder}
            start_binder=${() =>
                start_binder({
                    setStatePromise: editor.setStatePromise,
                    connect: editor.connect,
                    launch_params: launch_params,
                })}
            notebookfile=${launch_params.notebookfile == null ? null : new URL(launch_params.notebookfile, window.location.href).href}
            notebook=${editor.state.notebook}
        />`

    return null
};

const get_environment = async (client) => {
    let environment; // Draal this is for you
    // @ts-ignore
    if (!window.pluto_injected_environment) {
        const { default: env } = await import(client.session_options.server.injected_javascript_data_url);
        environment = env;
    } else {
        // @ts-ignore
        environment = window.pluto_injected_environment.environment;
    }
    return environment
};

const ProcessStatus = {
    ready: "ready",
    starting: "starting",
    no_process: "no_process",
    waiting_to_restart: "waiting_to_restart",
    waiting_for_permission: "waiting_for_permission",
};

// This is imported asynchronously - uncomment for development
// import environment from "../common/Environment.js"

const default_path = "";

// Be sure to keep this in sync with DEFAULT_CELL_METADATA in Cell.jl
/** @type {CellMetaData} */
const DEFAULT_CELL_METADATA$2 = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
};

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4$1 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

/**
 * @typedef {import('../imports/immer').Patch} Patch
 * */

const Main = ({ children }) => {
    return html`<main>${children}</main>`
};

/**
 * Map of status => Bool. In order of decreasing priority.
 */
const statusmap = (/** @type {EditorState} */ state, /** @type {LaunchParameters} */ launch_params) => ({
    disconnected: !(state.connected || state.initializing || state.static_preview),
    loading:
        (state.backend_launch_phase != null &&
            BackendLaunchPhase.wait_for_user < state.backend_launch_phase &&
            state.backend_launch_phase < BackendLaunchPhase.ready) ||
        state.initializing ||
        state.moving_file,
    process_waiting_for_permission: state.notebook.process_status === ProcessStatus.waiting_for_permission && !state.initializing,
    process_restarting: state.notebook.process_status === ProcessStatus.waiting_to_restart,
    process_dead: state.notebook.process_status === ProcessStatus.no_process || state.notebook.process_status === ProcessStatus.waiting_to_restart,
    nbpkg_restart_required: state.notebook.nbpkg?.restart_required_msg != null,
    nbpkg_restart_recommended: state.notebook.nbpkg?.restart_recommended_msg != null,
    nbpkg_disabled: state.notebook.nbpkg?.enabled === false || state.notebook.nbpkg?.waiting_for_permission_but_probably_disabled === true,
    static_preview: state.static_preview,
    bonds_disabled: !(
        state.initializing ||
        // connected to regular pluto server
        state.connected ||
        // connected to slider server
        (launch_params.slider_server_url != null && (state.slider_server?.connecting || state.slider_server?.interactive))
    ),
    offer_binder: state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.binder_url != null,
    offer_local: state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.pluto_server_url != null,
    binder: launch_params.binder_url != null && state.backend_launch_phase != null,
    code_differs: state.notebook.cell_order.some(
        (cell_id) => state.cell_inputs_local[cell_id] != null && state.notebook.cell_inputs[cell_id].code !== state.cell_inputs_local[cell_id].code
    ),
    recording_waiting_to_start: state.recording_waiting_to_start,
    is_recording: state.is_recording,
    isolated_cell_view: launch_params.isolated_cell_ids != null && launch_params.isolated_cell_ids.length > 0,
    sanitize_html: state.notebook.process_status === ProcessStatus.waiting_for_permission,
});

const first_true_key = (obj) => {
    for (let [k, v] of Object.entries(obj)) {
        if (v) {
            return k
        }
    }
};

/**
 * @typedef CellMetaData
 * @type {{
 *    disabled: boolean,
 *    show_logs: boolean,
 *    skip_as_script: boolean
 *  }}
 *
 * @typedef CellInputData
 * @type {{
 *  cell_id: string,
 *  code: string,
 *  code_folded: boolean,
 *  metadata: CellMetaData,
 * }}
 */

/**
 * @typedef LogEntryData
 * @type {{
 *   level: number,
 *   msg: string,
 *   file: string,
 *   line: number,
 *   kwargs: Object,
 * }}
 */

/**
 * @typedef StatusEntryData
 * @type {{
 *   name: string,
 *   success?: boolean,
 *   started_at: number?,
 *   finished_at: number?,
 *   timing?: "remote" | "local",
 *   subtasks: Record<string,StatusEntryData>,
 * }}
 */

/**
 * @typedef CellResultData
 * @type {{
 *  cell_id: string,
 *  queued: boolean,
 *  running: boolean,
 *  errored: boolean,
 *  runtime: number?,
 *  downstream_cells_map: { [variable: string]: [string]},
 *  upstream_cells_map: { [variable: string]: [string]},
 *  precedence_heuristic: number?,
 *  depends_on_disabled_cells: boolean,
 *  depends_on_skipped_cells: boolean,
 *  output: {
 *      body: string | Object,
 *      persist_js_state: boolean,
 *      last_run_timestamp: number,
 *      mime: string,
 *      rootassignee: string?,
 *      has_pluto_hook_features: boolean,
 *  },
 *  logs: Array<LogEntryData>,
 *  published_object_keys: [string],
 * }}
 */

/**
 * @typedef CellDependencyData
 * @property {string} cell_id
 * @property {Record<string, Array<string>>} downstream_cells_map A map where the keys are the variables *defined* by this cell, and a value is the list of cell IDs that reference a variable.
 * @property {Record<string, Array<string>>} upstream_cells_map A map where the keys are the variables *referenced* by this cell, and a value is the list of cell IDs that define a variable.
 * @property {number} precedence_heuristic
 */

/**
 * @typedef CellDependencyGraph
 * @type {{ [uuid: string]: CellDependencyData }}
 */

/**
 * @typedef NotebookPkgData
 * @type {{
 *  enabled: boolean,
 *  waiting_for_permission: boolean?,
 *  waiting_for_permission_but_probably_disabled: boolean?,
 *  restart_recommended_msg: string?,
 *  restart_required_msg: string?,
 *  installed_versions: { [pkg_name: string]: string },
 *  terminal_outputs: { [pkg_name: string]: string },
 *  install_time_ns: number?,
 *  busy_packages: string[],
 *  instantiated: boolean,
 * }}
 */

/**
 * @typedef LaunchParameters
 * @type {{
 *  notebook_id: string?,
 *  statefile: string?,
 *  statefile_integrity: string?,
 *  notebookfile: string?,
 *  notebookfile_integrity: string?,
 *  disable_ui: boolean,
 *  preamble_html: string?,
 *  isolated_cell_ids: string[]?,
 *  binder_url: string?,
 *  pluto_server_url: string?,
 *  slider_server_url: string?,
 *  recording_url: string?,
 *  recording_url_integrity: string?,
 *  recording_audio_url: string?,
 * }}
 */

/**
 * @typedef BondValueContainer
 * @type {{ value: any }}
 */

/**
 * @typedef BondValuesDict
 * @type {{ [name: string]: BondValueContainer }}
 */

/**
 * @typedef NotebookData
 * @type {{
 *  pluto_version?: string,
 *  notebook_id: string,
 *  path: string,
 *  shortpath: string,
 *  in_temp_dir: boolean,
 *  process_status: string,
 *  last_save_time: number,
 *  last_hot_reload_time: number,
 *  cell_inputs: { [uuid: string]: CellInputData },
 *  cell_results: { [uuid: string]: CellResultData },
 *  cell_dependencies: CellDependencyGraph,
 *  cell_order: Array<string>,
 *  cell_execution_order: Array<string>,
 *  published_objects: { [objectid: string]: any},
 *  bonds: BondValuesDict,
 *  nbpkg: NotebookPkgData?,
 *  metadata: object,
 *  status_tree: StatusEntryData?,
 * }}
 */

const url_logo_big = get_included_external_source("pluto-logo-big")?.href;
const url_logo_small = get_included_external_source("pluto-logo-small")?.href;

/**
 * @typedef EditorProps
 * @type {{
 * launch_params: LaunchParameters,
 * initial_notebook_state: NotebookData,
 * preamble_element: preact.ReactElement?,
 * pluto_editor_element: HTMLElement,
 * }}
 */

/**
 * @typedef EditorState
 * @type {{
 * notebook: NotebookData,
 * cell_inputs_local: { [uuid: string]: { code: String } },
 * unsumbitted_global_definitions: { [uuid: string]: String[] }
 * desired_doc_query: ?String,
 * recently_deleted: ?Array<{ index: number, cell: CellInputData }>,
 * recently_auto_disabled_cells: Record<string,[string,string]>,
 * last_update_time: number,
 * disable_ui: boolean,
 * static_preview: boolean,
 * backend_launch_phase: ?number,
 * backend_launch_logs: ?string,
 * binder_session_url: ?string,
 * binder_session_token: ?string,
 * refresh_target: ?string,
 * connected: boolean,
 * initializing: boolean,
 * moving_file: boolean,
 * scroller: {
 * up: boolean,
 * down: boolean,
 * },
 * export_menu_open: boolean,
 * last_created_cell: ?string,
 * selected_cells: Array<string>,
 * extended_components: any,
 * is_recording: boolean,
 * recording_waiting_to_start: boolean,
 * slider_server: { connecting: boolean, interactive: boolean },
 * }}
 */

/**
 * @augments Component<EditorProps,EditorState>
 */
class Editor extends preact_10_13_2_pin_v113_target_es2020.Component {
    constructor(/** @type {EditorProps} */ props) {
        super(props);

        const { launch_params, initial_notebook_state } = this.props;

        /** @type {EditorState} */
        this.state = {
            notebook: initial_notebook_state,
            cell_inputs_local: {},
            unsumbitted_global_definitions: {},
            desired_doc_query: null,
            recently_deleted: [],
            recently_auto_disabled_cells: {},
            last_update_time: 0,

            disable_ui: launch_params.disable_ui,
            static_preview: launch_params.statefile != null,
            backend_launch_phase:
                launch_params.notebookfile != null && (launch_params.binder_url != null || launch_params.pluto_server_url != null)
                    ? BackendLaunchPhase.wait_for_user
                    : null,
            backend_launch_logs: null,
            binder_session_url: null,
            binder_session_token: null,
            refresh_target: null,
            connected: false,
            initializing: true,

            moving_file: false,
            scroller: {
                up: false,
                down: false,
            },
            export_menu_open: false,

            last_created_cell: null,
            selected_cells: [],

            extended_components: {
                CustomHeader: null,
            },

            is_recording: false,
            recording_waiting_to_start: false,

            slider_server: {
                connecting: false,
                interactive: false,
            },
        };

        this.setStatePromise = (fn) => new Promise((r) => this.setState(fn, r));

        // these are things that can be done to the local notebook
        this.real_actions = {
            get_notebook: () => this?.state?.notebook ?? {},
            get_session_options: () => this.client.session_options,
            get_launch_params: () => this.props.launch_params,
            send: (message_type, ...args) => this.client.send(message_type, ...args),
            get_published_object: (objectid) => this.state.notebook.published_objects[objectid],
            //@ts-ignore
            update_notebook: (...args) => this.update_notebook(...args),
            set_doc_query: (query) => this.setState({ desired_doc_query: query }),
            set_local_cell: (cell_id, new_val) => {
                return this.setStatePromise(
                    immer((/** @type {EditorState} */ state) => {
                        state.cell_inputs_local[cell_id] = {
                            code: new_val,
                        };
                        state.selected_cells = [];
                    })
                )
            },
            set_unsubmitted_global_definitions: (cell_id, new_val) => {
                return this.setStatePromise(
                    immer((/** @type {EditorState} */ state) => {
                        state.unsumbitted_global_definitions[cell_id] = new_val;
                    })
                )
            },
            get_unsubmitted_global_definitions: () => _.pick(this.state.unsumbitted_global_definitions, this.state.notebook.cell_order),
            focus_on_neighbor: (cell_id, delta, line = delta === -1 ? Infinity : -1, ch = 0) => {
                const i = this.state.notebook.cell_order.indexOf(cell_id);
                const new_i = i + delta;
                if (new_i >= 0 && new_i < this.state.notebook.cell_order.length) {
                    window.dispatchEvent(
                        new CustomEvent("cell_focus", {
                            detail: {
                                cell_id: this.state.notebook.cell_order[new_i],
                                line: line,
                                ch: ch,
                            },
                        })
                    );
                }
            },
            add_deserialized_cells: async (data, index_or_id, deserializer = deserialize_cells) => {
                let new_codes = deserializer(data);
                /** @type {Array<CellInputData>} Create copies of the cells with fresh ids */
                let new_cells = new_codes.map((code) => ({
                    cell_id: uuidv4$1(),
                    code: code,
                    code_folded: false,
                    metadata: {
                        ...DEFAULT_CELL_METADATA$2,
                    },
                }));

                let index;

                if (typeof index_or_id === "number") {
                    index = index_or_id;
                } else {
                    /* if the input is not an integer, try interpreting it as a cell id */
                    index = this.state.notebook.cell_order.indexOf(index_or_id);
                    if (index !== -1) {
                        /* Make sure that the cells are pasted after the current cell */
                        index += 1;
                    }
                }

                if (index === -1) {
                    index = this.state.notebook.cell_order.length;
                }

                /** Update local_code. Local code doesn't force CM to update it's state
                 * (the usual flow is keyboard event -> cm -> local_code and not the opposite )
                 * See ** 1 **
                 */
                this.setState(
                    immer((/** @type {EditorState} */ state) => {
                        // Deselect everything first, to clean things up
                        state.selected_cells = [];

                        for (let cell of new_cells) {
                            state.cell_inputs_local[cell.cell_id] = cell;
                        }
                        state.last_created_cell = new_cells[0]?.cell_id;
                    })
                );

                /**
                 * Create an empty cell in the julia-side.
                 * Code will differ, until the user clicks 'run' on the new code
                 */
                await update_notebook((notebook) => {
                    for (const cell of new_cells) {
                        notebook.cell_inputs[cell.cell_id] = {
                            ...cell,
                            // Fill the cell with empty code remotely, so it doesn't run unsafe code
                            code: "",
                            metadata: {
                                ...DEFAULT_CELL_METADATA$2,
                            },
                        };
                    }
                    notebook.cell_order = [
                        ...notebook.cell_order.slice(0, index),
                        ...new_cells.map((x) => x.cell_id),
                        ...notebook.cell_order.slice(index, Infinity),
                    ];
                });
            },
            wrap_remote_cell: async (cell_id, block_start = "begin", block_end = "end") => {
                const cell = this.state.notebook.cell_inputs[cell_id];
                const new_code = `${block_start}\n\t${cell.code.replace(/\n/g, "\n\t")}\n${block_end}`;

                await this.setStatePromise(
                    immer((/** @type {EditorState} */ state) => {
                        state.cell_inputs_local[cell_id] = {
                            code: new_code,
                        };
                    })
                );
                await this.actions.set_and_run_multiple([cell_id]);
            },
            split_remote_cell: async (cell_id, boundaries, submit = false) => {
                const cell = this.state.notebook.cell_inputs[cell_id];

                const old_code = cell.code;
                const padded_boundaries = [0, ...boundaries];
                /** @type {Array<String>} */
                const parts = boundaries.map((b, i) => slice_utf8(old_code, padded_boundaries[i], b).trim()).filter((x) => x !== "");
                /** @type {Array<CellInputData>} */
                const cells_to_add = parts.map((code) => {
                    return {
                        cell_id: uuidv4$1(),
                        code: code,
                        code_folded: false,
                        metadata: {
                            ...DEFAULT_CELL_METADATA$2,
                        },
                    }
                });

                this.setState(
                    immer((/** @type {EditorState} */ state) => {
                        for (let cell of cells_to_add) {
                            state.cell_inputs_local[cell.cell_id] = cell;
                        }
                    })
                );
                await update_notebook((notebook) => {
                    // delete the old cell
                    delete notebook.cell_inputs[cell_id];

                    // add the new ones
                    for (let cell of cells_to_add) {
                        notebook.cell_inputs[cell.cell_id] = cell;
                    }
                    notebook.cell_order = notebook.cell_order.flatMap((c) => {
                        if (cell_id === c) {
                            return cells_to_add.map((x) => x.cell_id)
                        } else {
                            return [c]
                        }
                    });
                });

                if (submit) {
                    await this.actions.set_and_run_multiple(cells_to_add.map((x) => x.cell_id));
                }
            },
            interrupt_remote: (cell_id) => {
                // TODO Make this cooler
                // set_notebook_state((prevstate) => {
                //     return {
                //         cells: prevstate.cells.map((c) => {
                //             return { ...c, errored: c.errored || c.running || c.queued }
                //         }),
                //     }
                // })
                this.client.send("interrupt_all", {}, { notebook_id: this.state.notebook.notebook_id }, false);
            },
            move_remote_cells: (cell_ids, new_index) => {
                return update_notebook((notebook) => {
                    new_index = Math.max(0, new_index);
                    let before = notebook.cell_order.slice(0, new_index).filter((x) => !cell_ids.includes(x));
                    let after = notebook.cell_order.slice(new_index, Infinity).filter((x) => !cell_ids.includes(x));
                    notebook.cell_order = [...before, ...cell_ids, ...after];
                })
            },
            add_remote_cell_at: async (index, code = "") => {
                let id = uuidv4$1();
                this.setState({ last_created_cell: id });
                await update_notebook((notebook) => {
                    notebook.cell_inputs[id] = {
                        cell_id: id,
                        code,
                        code_folded: false,
                        metadata: { ...DEFAULT_CELL_METADATA$2 },
                    };
                    notebook.cell_order = [...notebook.cell_order.slice(0, index), id, ...notebook.cell_order.slice(index, Infinity)];
                });
                await this.client.send("run_multiple_cells", { cells: [id] }, { notebook_id: this.state.notebook.notebook_id });
                return id
            },
            add_remote_cell: async (cell_id, before_or_after, code) => {
                const index = this.state.notebook.cell_order.indexOf(cell_id);
                const delta = before_or_after == "before" ? 0 : 1;
                return await this.actions.add_remote_cell_at(index + delta, code)
            },
            confirm_delete_multiple: async (verb, cell_ids) => {
                if (cell_ids.length <= 1 || confirm(`${verb} ${cell_ids.length} cells?`)) {
                    if (cell_ids.some((cell_id) => this.state.notebook.cell_results[cell_id].running || this.state.notebook.cell_results[cell_id].queued)) {
                        if (confirm("This cell is still running - would you like to interrupt the notebook?")) {
                            this.actions.interrupt_remote(cell_ids[0]);
                        }
                    } else {
                        this.setState(
                            immer((/** @type {EditorState} */ state) => {
                                state.recently_deleted = cell_ids.map((cell_id) => {
                                    return {
                                        index: this.state.notebook.cell_order.indexOf(cell_id),
                                        cell: this.state.notebook.cell_inputs[cell_id],
                                    }
                                });
                                state.selected_cells = [];
                                for (let c of cell_ids) {
                                    delete state.unsumbitted_global_definitions[c];
                                }
                            })
                        );
                        await update_notebook((notebook) => {
                            for (let cell_id of cell_ids) {
                                delete notebook.cell_inputs[cell_id];
                            }
                            notebook.cell_order = notebook.cell_order.filter((cell_id) => !cell_ids.includes(cell_id));
                        });
                        await this.client.send("run_multiple_cells", { cells: [] }, { notebook_id: this.state.notebook.notebook_id });
                    }
                }
            },
            fold_remote_cells: async (cell_ids, new_value) => {
                await update_notebook((notebook) => {
                    for (let cell_id of cell_ids) {
                        notebook.cell_inputs[cell_id].code_folded = new_value ?? !notebook.cell_inputs[cell_id].code_folded;
                    }
                });
            },
            set_and_run_all_changed_remote_cells: () => {
                const changed = this.state.notebook.cell_order.filter(
                    (cell_id) =>
                        this.state.cell_inputs_local[cell_id] != null &&
                        this.state.notebook.cell_inputs[cell_id].code !== this.state.cell_inputs_local[cell_id]?.code
                );
                this.actions.set_and_run_multiple(changed);
                return changed.length > 0
            },
            set_and_run_multiple: async (cell_ids) => {
                // TODO: this function is called with an empty list sometimes, where?
                if (cell_ids.length > 0) {
                    window.dispatchEvent(
                        new CustomEvent("set_waiting_to_run_smart", {
                            detail: {
                                cell_ids,
                            },
                        })
                    );

                    await update_notebook((notebook) => {
                        for (let cell_id of cell_ids) {
                            if (this.state.cell_inputs_local[cell_id]) {
                                notebook.cell_inputs[cell_id].code = this.state.cell_inputs_local[cell_id].code;
                            }
                        }
                    });
                    await this.setStatePromise(
                        immer((/** @type {EditorState} */ state) => {
                            for (let cell_id of cell_ids) {
                                delete state.unsumbitted_global_definitions[cell_id];
                                // This is a "dirty" trick, as this should actually be stored in some shared request_status => status state
                                // But for now... this is fine 😼
                                if (state.notebook.cell_results[cell_id] != null) {
                                    state.notebook.cell_results[cell_id].queued = this.is_process_ready();
                                }
                            }
                        })
                    );
                    const result = await this.client.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: this.state.notebook.notebook_id });
                    const { disabled_cells } = result.message;
                    if (Object.entries(disabled_cells).length > 0) {
                        await this.setStatePromise({
                            recently_auto_disabled_cells: disabled_cells,
                        });
                    }
                }
            },
            /**
             *
             * @param {string} name name of bound variable
             * @param {*} value value (not in wrapper object)
             */
            set_bond: async (name, value) => {
                await update_notebook((notebook) => {
                    // Wrap the bond value in an object so immer assumes it is changed
                    let new_bond = { value: value };
                    notebook.bonds[name] = new_bond;
                });
            },
            reshow_cell: (cell_id, objectid, dim) =>
                this.client.send(
                    "reshow_cell",
                    {
                        objectid,
                        dim,
                        cell_id,
                    },
                    { notebook_id: this.state.notebook.notebook_id },
                    false
                ),
            request_js_link_response: (cell_id, link_id, input) => {
                return this.client
                    .send(
                        "request_js_link_response",
                        {
                            cell_id,
                            link_id,
                            input,
                        },
                        { notebook_id: this.state.notebook.notebook_id }
                    )
                    .then((r) => r.message)
            },
            /** This actions avoids pushing selected cells all the way down, which is too heavy to handle! */
            get_selected_cells: (cell_id, /** @type {boolean} */ allow_other_selected_cells) =>
                allow_other_selected_cells ? this.state.selected_cells : [cell_id],
            get_avaible_versions: async ({ package_name, notebook_id }) => {
                const { message } = await this.client.send("nbpkg_available_versions", { package_name: package_name }, { notebook_id: notebook_id });
                return message
            },
        };
        this.actions = { ...this.real_actions };

        const apply_notebook_patches = (patches, /** @type {NotebookData?} */ old_state = null, get_reverse_patches = false) =>
            new Promise((resolve) => {
                if (patches.length !== 0) {
                    const should_ignore_patch_error = (/** @type {string} */ failing_path) => failing_path.startsWith("status_tree");

                    let _copy_of_patches,
                        reverse_of_patches = [];
                    this.setState(
                        immer((/** @type {EditorState} */ state) => {
                            let new_notebook;
                            try {
                                // To test this, uncomment the lines below:
                                // if (Math.random() < 0.25) {
                                //     throw new Error(`Error: [Immer] minified error nr: 15 '${patches?.[0]?.path?.join("/")}'    .`)
                                // }

                                if (get_reverse_patches) {
                                    ;[new_notebook, _copy_of_patches, reverse_of_patches] = immer.produceWithPatches(old_state ?? state.notebook, (state) => {
                                        immer.applyPatches(state, patches);
                                    });
                                    // TODO: why was `new_notebook` not updated?
                                    // this is why the line below is also called when `get_reverse_patches === true`
                                }
                                new_notebook = immer.applyPatches(old_state ?? state.notebook, patches);
                            } catch (exception) {
                                /** @type {String} Example: `"a.b[2].c"` */
                                const failing_path = String(exception).match(".*'(.*)'.*")?.[1].replace(/\//gi, ".") ?? exception;
                                const path_value = _.get(this.state.notebook, failing_path, "Not Found");
                                console.log(String(exception).match(".*'(.*)'.*")?.[1].replace(/\//gi, ".") ?? exception, failing_path, typeof failing_path);
                                const ignore = should_ignore_patch_error(failing_path)

                                ;(ignore ? console.log : console.error)(
                                    `#######################**************************########################
PlutoError: StateOutOfSync: Failed to apply patches.
Please report this: https://github.com/fonsp/Pluto.jl/issues adding the info below:
failing path: ${failing_path}
notebook previous value: ${path_value}
patch: ${JSON.stringify(
                                        patches?.find(({ path }) => path.join("") === failing_path),
                                        null,
                                        1
                                    )}
all patches: ${JSON.stringify(patches, null, 1)}
#######################**************************########################`,
                                    exception
                                );

                                let parts = failing_path.split(".");
                                for (let i = 0; i < parts.length; i++) {
                                    let path = parts.slice(0, i).join(".");
                                    console.log(path, _.get(this.state.notebook, path, "Not Found"));
                                }

                                if (ignore) {
                                    console.info("Safe to ignore this patch failure...");
                                } else if (this.state.connected) {
                                    console.error("Trying to recover: Refetching notebook...");
                                    this.client.send(
                                        "reset_shared_state",
                                        {},
                                        {
                                            notebook_id: this.state.notebook.notebook_id,
                                        },
                                        false
                                    );
                                } else if (this.state.static_preview && launch_params.slider_server_url != null) {
                                    open_pluto_popup({
                                        type: "warn",
                                        body: html`Something went wrong while updating the notebook state. Please refresh the page to try again.`,
                                    });
                                } else {
                                    console.error("Trying to recover: reloading...");
                                    window.parent.location.href = this.state.refresh_target ?? window.location.href;
                                }
                                return
                            }

                            let cells_stuck_in_limbo = new_notebook.cell_order.filter((cell_id) => new_notebook.cell_inputs[cell_id] == null);
                            if (cells_stuck_in_limbo.length !== 0) {
                                console.warn(`cells_stuck_in_limbo:`, cells_stuck_in_limbo);
                                new_notebook.cell_order = new_notebook.cell_order.filter((cell_id) => new_notebook.cell_inputs[cell_id] != null);
                            }
                            this.on_patches_hook(patches);
                            state.notebook = new_notebook;
                        }),
                        () => resolve(reverse_of_patches)
                    );
                } else {
                    resolve([]);
                }
            });

        this.apply_notebook_patches = apply_notebook_patches;
        // these are update message that are _not_ a response to a `send(*, *, {create_promise: true})`
        this.last_update_counter = -1;
        const check_update_counter = (new_val) => {
            if (new_val <= this.last_update_counter) {
                console.error("State update out of order", new_val, this.last_update_counter);
                alert("Oopsie!! please refresh your browser and everything will be alright!");
            }
            this.last_update_counter = new_val;
        };

        const on_update = (update, by_me) => {
            if (this.state.notebook.notebook_id === update.notebook_id) {
                const show_debugs = launch_params.binder_url != null;
                if (show_debugs) console.debug("on_update", update, by_me);
                const message = update.message;
                switch (update.type) {
                    case "notebook_diff":
                        check_update_counter(message?.counter);
                        let apply_promise = Promise.resolve();
                        if (message?.response?.from_reset) {
                            console.log("Trying to reset state after failure");
                            apply_promise = apply_notebook_patches(
                                message.patches,
                                empty_notebook_state({ notebook_id: this.state.notebook.notebook_id })
                            ).catch((e) => {
                                alert("Oopsie!! please refresh your browser and everything will be alright!");
                                throw e
                            });
                        } else if (message.patches.length !== 0) {
                            apply_promise = apply_notebook_patches(message.patches);
                        }

                        const set_waiting = () => {
                            let from_update = message?.response?.update_went_well != null;
                            let is_just_acknowledgement = from_update && message.patches.length === 0;
                            let is_relevant_for_bonds = message.patches.some(({ path }) => path.length === 0 || path[0] !== "status_tree");

                            // console.debug("Received patches!", is_just_acknowledgement, is_relevant_for_bonds, message.patches, message.response)

                            if (!is_just_acknowledgement && is_relevant_for_bonds) {
                                this.waiting_for_bond_to_trigger_execution = false;
                            }
                        };
                        apply_promise.finally(set_waiting).then(() => {
                            this.maybe_send_queued_bond_changes();
                        });

                        break
                    default:
                        console.error("Received unknown update type!", update);
                        // alert("Something went wrong 🙈\n Try clearing your browser cache and refreshing the page")
                        break
                }
                if (show_debugs) console.debug("on_update done");
            }
        };

        const on_establish_connection = async (client) => {
            // nasty
            Object.assign(this.client, client);
            try {
                const environment = await get_environment(client);
                const { custom_editor_header_component, custom_non_cell_output } = environment({ client, editor: this, imports: { preact } });
                this.setState({
                    extended_components: {
                        ...this.state.extended_components,
                        CustomHeader: custom_editor_header_component,
                        NonCellOutputComponents: custom_non_cell_output,
                    },
                });
            } catch (e) {}

            if (this.props.launch_params.disable_ui !== true) check_access(this.client);

            // @ts-ignore
            window.version_info = this.client.version_info; // for debugging
            // @ts-ignore
            window.kill_socket = this.client.kill; // for debugging

            if (!client.notebook_exists) {
                console.error("Notebook does not exist. Not connecting.");
                return
            }
            console.debug("Sending update_notebook request...");
            await this.client.send("update_notebook", { updates: [] }, { notebook_id: this.state.notebook.notebook_id }, false);
            console.debug("Received update_notebook request");

            this.setState({
                initializing: false,
                static_preview: false,
                backend_launch_phase: this.state.backend_launch_phase == null ? null : BackendLaunchPhase.ready,
            });

            this.client.send("complete", { query: "sq" }, { notebook_id: this.state.notebook.notebook_id });
            this.client.send("complete", { query: "\\sq" }, { notebook_id: this.state.notebook.notebook_id });

            setTimeout(init_feedback, 2 * 1000); // 2 seconds - load feedback a little later for snappier UI
        };

        const on_connection_status = (val, hopeless) => {
            this.setState({ connected: val });
            if (hopeless) {
                // https://github.com/fonsp/Pluto.jl/issues/55
                // https://github.com/fonsp/Pluto.jl/issues/2398
                open_pluto_popup({
                    type: "warn",
                    body: html`<p>A new server was started - this notebook session is no longer running.</p>
                        <p>Would you like to go back to the main menu?</p>
                        <br />
                        <a href="./">Go back</a>
                        <br />
                        <a
                            href="#"
                            onClick=${(e) => {
                                e.preventDefault();
                                window.dispatchEvent(new CustomEvent("close pluto popup"));
                            }}
                            >Stay here</a
                        >`,
                    should_focus: false,
                });
            }
        };

        const on_reconnect = async () => {
            console.warn("Reconnected! Checking states");

            await this.client.send(
                "reset_shared_state",
                {},
                {
                    notebook_id: this.state.notebook.notebook_id,
                },
                false
            );

            return true
        };

        this.export_url = (/** @type {string} */ u) =>
            this.state.binder_session_url == null
                ? `./${u}?id=${this.state.notebook.notebook_id}`
                : `${this.state.binder_session_url}${u}?id=${this.state.notebook.notebook_id}&token=${this.state.binder_session_token}`;

        /** @type {import('../common/PlutoConnection').PlutoConnection} */
        this.client = /** @type {import('../common/PlutoConnection').PlutoConnection} */ ({});

        this.connect = (/** @type {string | undefined} */ ws_address = undefined) =>
            create_pluto_connection({
                ws_address: ws_address,
                on_unrequested_update: on_update,
                on_connection_status: on_connection_status,
                on_reconnect: on_reconnect,
                connect_metadata: { notebook_id: this.state.notebook.notebook_id },
            }).then(on_establish_connection);

        this.on_disable_ui = () => {
            set_disable_ui_css(this.state.disable_ui, props.pluto_editor_element);

            // Pluto has three modes of operation:
            // 1. (normal) Connected to a Pluto notebook.
            // 2. Static HTML with PlutoSliderServer. All edits are ignored, but bond changes are processes by the PlutoSliderServer.
            // 3. Static HTML without PlutoSliderServer. All interactions are ignored.
            //
            // To easily support all three with minimal changes to the source code, we sneakily swap out the `this.actions` object (`pluto_actions` in other source files) with a different one:
            Object.assign(
                this.actions,
                // if we have no pluto server...
                this.state.disable_ui || (launch_params.slider_server_url != null && !this.state.connected)
                    ? // then use a modified set of actions
                      launch_params.slider_server_url != null
                        ? slider_server_actions({
                              setStatePromise: this.setStatePromise,
                              actions: this.actions,
                              launch_params: launch_params,
                              apply_notebook_patches,
                              get_original_state: () => this.props.initial_notebook_state,
                              get_current_state: () => this.state.notebook,
                          })
                        : nothing_actions({
                              actions: this.actions,
                          })
                    : // otherwise, use the real actions
                      this.real_actions
            );
        };
        this.on_disable_ui();

        setInterval(() => {
            if (!this.state.static_preview && document.visibilityState === "visible") {
                // view stats on https://stats.plutojl.org/
                //@ts-ignore
                count_stat(`editing/${window?.version_info?.pluto ?? this.state.notebook.pluto_version ?? "unknown"}${window.plutoDesktop ? "-desktop" : ""}`);
            }
        }, 1000 * 15 * 60);
        setInterval(() => {
            if (!this.state.static_preview && document.visibilityState === "visible") {
                update_stored_recent_notebooks(this.state.notebook.path);
            }
        }, 1000 * 5);

        // Not completely happy with this yet, but it will do for now - DRAL
        /** Patches that are being delayed until all cells have finished running. */
        this.bond_changes_to_apply_when_done = [];
        this.maybe_send_queued_bond_changes = () => {
            if (this.notebook_is_idle() && this.bond_changes_to_apply_when_done.length !== 0) {
                // console.log("Applying queued bond changes!", this.bond_changes_to_apply_when_done)
                let bonds_patches = this.bond_changes_to_apply_when_done;
                this.bond_changes_to_apply_when_done = [];
                this.update_notebook((notebook) => {
                    immer.applyPatches(notebook, bonds_patches);
                });
            }
        };
        /** This tracks whether we just set a bond value which will trigger a cell to run, but we are still waiting for the server to process the bond value (and run the cell). During this time, we won't send new bond values. See https://github.com/fonsp/Pluto.jl/issues/1891 for more info. */
        this.waiting_for_bond_to_trigger_execution = false;
        /** Number of local updates that have not yet been applied to the server's state. */
        this.pending_local_updates = 0;
        /**
         * User scripts that are currently running (possibly async).
         * @type {SetWithEmptyCallback<HTMLElement>}
         */
        this.js_init_set = new SetWithEmptyCallback(() => {
            // console.info("All scripts finished!")
            this.maybe_send_queued_bond_changes();
        });

        // @ts-ignore This is for tests
        document.body._js_init_set = this.js_init_set;

        /** Is the notebook ready to execute code right now? (i.e. are no cells queued or running?) */
        this.notebook_is_idle = () => {
            return !(
                this.waiting_for_bond_to_trigger_execution ||
                this.pending_local_updates > 0 ||
                // a cell is running:
                Object.values(this.state.notebook.cell_results).some((cell) => cell.running || cell.queued) ||
                // a cell is initializing JS:
                !_.isEmpty(this.js_init_set) ||
                !this.is_process_ready()
            )
        };
        this.is_process_ready = () =>
            this.state.notebook.process_status === ProcessStatus.starting || this.state.notebook.process_status === ProcessStatus.ready;

        const bond_will_trigger_evaluation = (/** @type {string|PropertyKey} */ sym) =>
            Object.entries(this.state.notebook.cell_dependencies).some(([cell_id, deps]) => {
                // if the other cell depends on the variable `sym`...
                if (deps.upstream_cells_map.hasOwnProperty(sym)) {
                    // and the cell is not disabled
                    const running_disabled = this.state.notebook.cell_inputs[cell_id].metadata.disabled;
                    // or indirectly disabled
                    const indirectly_disabled = this.state.notebook.cell_results[cell_id].depends_on_disabled_cells;
                    return !(running_disabled || indirectly_disabled)
                }
            });

        /**
         * We set `waiting_for_bond_to_trigger_execution` to `true` if it is *guaranteed* that this bond change will trigger something to happen (i.e. a cell to run). See https://github.com/fonsp/Pluto.jl/pull/1892 for more info about why.
         *
         * This is guaranteed if there is a cell in the notebook that references the bound variable. We use our copy of the notebook's toplogy to check this.
         *
         * # Gotchas:
         * 1. We (the frontend) might have an out-of-date copy of the notebook's topology: this bond might have dependents *right now*, but the backend might already be processing a code change that removes that dependency.
         *
         *     However, this change in topology will result in a patch, which will set `waiting_for_bond_to_trigger_execution` back to `false`.
         *
         * 2. The backend has a "first value" mechanism: if bond values are being set for the first time *and* this value is already set on the backend, then the value will be skipped. See https://github.com/fonsp/Pluto.jl/issues/275. If all bond values are skipped, then we might get zero patches back (because no cells will run).
         *
         *     A bond value is considered a "first value" if it is sent using an `"add"` patch. This is why we require `x.op === "replace"`.
         */
        const bond_patch_will_trigger_evaluation = (/** @type {Patch} */ x) =>
            x.op === "replace" && x.path.length >= 1 && bond_will_trigger_evaluation(x.path[1]);

        let last_update_notebook_task = Promise.resolve();
        /** @param {(notebook: NotebookData) => void} mutate_fn */
        let update_notebook = (mutate_fn) => {
            const new_task = last_update_notebook_task.then(async () => {
                // if (this.state.initializing) {
                //     console.error("Update notebook done during initializing, strange")
                //     return
                // }

                let [new_notebook, changes, inverseChanges] = immer.produceWithPatches(this.state.notebook, (notebook) => {
                    mutate_fn(notebook);
                });

                // If "notebook is not idle" we seperate and store the bonds updates,
                // to send when the notebook is idle. This delays the updating of the bond for performance,
                // but when the server can discard bond updates itself (now it executes them one by one, even if there is a newer update ready)
                // this will no longer be necessary
                let is_idle = this.notebook_is_idle();
                let changes_involving_bonds = changes.filter((x) => x.path[0] === "bonds");
                if (!is_idle) {
                    this.bond_changes_to_apply_when_done = [...this.bond_changes_to_apply_when_done, ...changes_involving_bonds];
                    changes = changes.filter((x) => x.path[0] !== "bonds");
                }
                for (let change of changes) {
                    if (change.path.some((x) => typeof x === "number")) {
                        throw new Error("This sounds like it is editing an array...")
                    }
                }

                if (changes.length === 0) {
                    return
                }
                if (is_idle) {
                    this.waiting_for_bond_to_trigger_execution =
                        this.waiting_for_bond_to_trigger_execution || changes_involving_bonds.some(bond_patch_will_trigger_evaluation);
                }
                this.pending_local_updates++;
                this.on_patches_hook(changes);
                try {
                    // console.log("Sending changes to server:", changes)
                    await Promise.all([
                        this.client.send("update_notebook", { updates: changes }, { notebook_id: this.state.notebook.notebook_id }, false).then((response) => {
                            if (response.message?.response?.update_went_well === "👎") {
                                // We only throw an error for functions that are waiting for this
                                // Notebook state will already have the changes reversed
                                throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
                            }
                        }),
                        this.setStatePromise({
                            notebook: new_notebook,
                            last_update_time: Date.now(),
                        }),
                    ]);
                } finally {
                    this.pending_local_updates--;
                    // this property is used to tell our frontend tests that the updates are done
                    //@ts-ignore
                    document.body._update_is_ongoing = this.pending_local_updates > 0;
                }
            });
            last_update_notebook_task = new_task.catch(console.error);
            return new_task
        };
        this.update_notebook = update_notebook;
        //@ts-ignore
        window.shutdownNotebook = this.close = () => {
            this.client.send(
                "shutdown_notebook",
                {
                    keep_in_session: false,
                },
                {
                    notebook_id: this.state.notebook.notebook_id,
                },
                false
            );
        };
        this.submit_file_change = async (new_path, reset_cm_value) => {
            const old_path = this.state.notebook.path;
            if (old_path === new_path) {
                return
            }
            if (!this.state.notebook.in_temp_dir) {
                if (!confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + new_path)) {
                    throw new Error("Declined by user")
                }
            }

            this.setState({ moving_file: true });

            try {
                await update_notebook((notebook) => {
                    notebook.in_temp_dir = false;
                    notebook.path = new_path;
                });
                // @ts-ignore
                document.activeElement?.blur();
            } catch (error) {
                alert("Failed to move file:\n\n" + error.message);
            } finally {
                this.setState({ moving_file: false });
            }
        };

        this.desktop_submit_file_change = async () => {
            this.setState({ moving_file: true });
            /**
             * `window.plutoDesktop?.ipcRenderer` is basically what allows the
             * frontend to communicate with the electron side. It is an IPC
             * bridge between render process and main process. More info
             * [here](https://www.electronjs.org/docs/latest/api/ipc-renderer).
             *
             * "PLUTO-MOVE-NOTEBOOK" is an event triggered in the main process
             * once the move is complete, we listen to it using `once`.
             * More info [here](https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendereroncechannel-listener)
             */
            window.plutoDesktop?.ipcRenderer.once("PLUTO-MOVE-NOTEBOOK", async (/** @type {string?} */ loc) => {
                if (!!loc)
                    await this.setStatePromise(
                        immer((/** @type {EditorState} */ state) => {
                            state.notebook.in_temp_dir = false;
                            state.notebook.path = loc;
                        })
                    );
                this.setState({ moving_file: false });
                // @ts-ignore
                document.activeElement?.blur();
            });

            // ask the electron backend to start moving the notebook. The event above will be fired once it is done.
            window.plutoDesktop?.fileSystem.moveNotebook();
        };

        this.delete_selected = (verb) => {
            if (this.state.selected_cells.length > 0) {
                this.actions.confirm_delete_multiple(verb, this.state.selected_cells);
                return true
            }
        };

        this.run_selected = () => {
            return this.actions.set_and_run_multiple(this.state.selected_cells)
        };
        this.fold_selected = (new_val) => {
            if (_.isEmpty(this.state.selected_cells)) return
            return this.actions.fold_remote_cells(this.state.selected_cells, new_val)
        };
        this.move_selected = (/** @type {KeyboardEvent} */ e, /** @type {1|-1} */ delta) => {
            if (this.state.selected_cells.length > 0) {
                const current_indices = this.state.selected_cells.map((id) => this.state.notebook.cell_order.indexOf(id));
                const new_index = (delta > 0 ? Math.max : Math.min)(...current_indices) + (delta === -1 ? -1 : 2);

                e.preventDefault();
                return this.actions.move_remote_cells(this.state.selected_cells, new_index).then(
                    // scroll into view
                    () => {
                        document.getElementById((delta > 0 ? _.last : _.first)(this.state.selected_cells) ?? "")?.scrollIntoView({ block: "nearest" });
                    }
                )
            }
        };

        this.serialize_selected = (/** @type {string?} */ cell_id = null) => {
            const cells_to_serialize = cell_id == null || this.state.selected_cells.includes(cell_id) ? this.state.selected_cells : [cell_id];
            if (cells_to_serialize.length) {
                return serialize_cells(cells_to_serialize.map((id) => this.state.notebook.cell_inputs[id]))
            }
        };

        this.patch_listeners = [];
        this.on_patches_hook = (patches) => {
            this.patch_listeners.forEach((f) => f(patches));
        };

        let ctrl_down_last_val = { current: false };
        const set_ctrl_down = (value) => {
            if (value !== ctrl_down_last_val.current) {
                ctrl_down_last_val.current = value;
                document.body.querySelectorAll("[data-pluto-variable], [data-cell-variable]").forEach((el) => {
                    el.setAttribute("data-ctrl-down", value ? "true" : "false");
                });
            }
        };

        document.addEventListener("keyup", (e) => {
            set_ctrl_down(has_ctrl_or_cmd_pressed(e));
        });
        document.addEventListener("visibilitychange", (e) => {
            set_ctrl_down(false);
            setTimeout(() => {
                set_ctrl_down(false);
            }, 100);
        });

        document.addEventListener("keydown", (e) => {
            set_ctrl_down(has_ctrl_or_cmd_pressed(e));
            // if (e.defaultPrevented) {
            //     return
            // }
            if (e.key?.toLowerCase() === "q" && has_ctrl_or_cmd_pressed(e)) {
                // This one can't be done as cmd+q on mac, because that closes chrome - Dral
                if (Object.values(this.state.notebook.cell_results).some((c) => c.running || c.queued)) {
                    this.actions.interrupt_remote();
                }
                e.preventDefault();
            } else if (e.key?.toLowerCase() === "s" && has_ctrl_or_cmd_pressed(e)) {
                this.actions.set_and_run_all_changed_remote_cells();
                e.preventDefault();
            } else if (["BracketLeft", "BracketRight"].includes(e.code) && (is_mac_keyboard ? e.altKey && e.metaKey : e.ctrlKey && e.shiftKey)) {
                this.fold_selected(e.code === "BracketLeft");
            } else if (e.key === "Backspace" || e.key === "Delete") {
                if (this.delete_selected("Delete")) {
                    e.preventDefault();
                }
            } else if (e.key === "Enter" && e.shiftKey) {
                this.run_selected();
            } else if (e.key === "ArrowUp" && e.altKey) {
                this.move_selected(e, -1);
            } else if (e.key === "ArrowDown" && e.altKey) {
                this.move_selected(e, 1);
            } else if ((e.key === "?" && has_ctrl_or_cmd_pressed(e)) || e.key === "F1") {
                // On mac "cmd+shift+?" is used by chrome, so that is why this needs to be ctrl as well on mac
                // Also pressing "ctrl+shift" on mac causes the key to show up as "/", this madness
                // I hope we can find a better solution for this later - Dral

                const fold_prefix = is_mac_keyboard ? `⌥${and}⌘` : `Ctrl${and}Shift`;

                alert(
                    `
⇧${and}Enter:   run cell
${ctrl_or_cmd_name}${and}Enter:   run cell and add cell below
${ctrl_or_cmd_name}${and}S:   submit all changes
Delete or Backspace:   delete empty cell

PageUp or fn${and}↑:   jump to cell above
PageDown or fn${and}↓:   jump to cell below
${control_name}${and}click:   jump to definition
${alt_or_options_name}${and}↑:   move line/cell up
${alt_or_options_name}${and}↓:   move line/cell down

${control_name}${and}/:   toggle comment
${control_name}${and}M:   toggle markdown
${fold_prefix}${and}[:   hide cell code
${fold_prefix}${and}]:   show cell code
${ctrl_or_cmd_name}${and}Q:   interrupt notebook

Select multiple cells by dragging a selection box from the space between cells.
${ctrl_or_cmd_name}${and}C:   copy selected cells
${ctrl_or_cmd_name}${and}X:   cut selected cells
${ctrl_or_cmd_name}${and}V:   paste selected cells

The notebook file saves every time you run a cell.`
                );
                e.preventDefault();
            } else if (e.key === "Escape") {
                this.setState({
                    recording_waiting_to_start: false,
                    selected_cells: [],
                    export_menu_open: false,
                });
            }

            if (this.state.disable_ui && this.state.backend_launch_phase === BackendLaunchPhase.wait_for_user) {
                // const code = e.key?.charCodeAt(0)
                if (e.key === "Enter" || e.key?.length === 1) {
                    if (!document.body.classList.contains("wiggle_binder")) {
                        document.body.classList.add("wiggle_binder");
                        setTimeout(() => {
                            document.body.classList.remove("wiggle_binder");
                        }, 1000);
                    }
                }
            }
        });

        document.addEventListener("copy", (e) => {
            if (!in_textarea_or_input()) {
                const serialized = this.serialize_selected();
                if (serialized) {
                    e.preventDefault();
                    // wait one frame to get transient user activation
                    requestAnimationFrame(() =>
                        navigator.clipboard.writeText(serialized).catch((err) => {
                            console.error("Error copying cells", e, err, navigator.userActivation);
                            alert(`Error copying cells: ${err?.message ?? err}`);
                        })
                    );
                }
            }
        });

        document.addEventListener("cut", (e) => {
            // Disabled because we don't want to accidentally delete cells
            // or we can enable it with a prompt
            // Even better would be excel style: grey out until you paste it. If you paste within the same notebook, then it is just a move.
            // if (!in_textarea_or_input()) {
            //     const serialized = this.serialize_selected()
            //     if (serialized) {
            //         navigator.clipboard
            //             .writeText(serialized)
            //             .then(() => this.delete_selected("Cut"))
            //             .catch((err) => {
            //                 alert(`Error cutting cells: ${e}`)
            //             })
            //     }
            // }
        });

        document.addEventListener("paste", async (e) => {
            const topaste = e.clipboardData?.getData("text/plain");
            if (topaste) {
                const deserializer = detect_deserializer(topaste);
                if (deserializer != null) {
                    this.actions.add_deserialized_cells(topaste, -1, deserializer);
                    e.preventDefault();
                }
            }
        });

        window.addEventListener("beforeunload", (event) => {
            const unsaved_cells = this.state.notebook.cell_order.filter(
                (id) => this.state.cell_inputs_local[id] && this.state.notebook.cell_inputs[id].code !== this.state.cell_inputs_local[id].code
            );
            const first_unsaved = unsaved_cells[0];
            if (first_unsaved != null) {
                window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved } }));
                // } else if (this.state.notebook.in_temp_dir) {
                //     window.scrollTo(0, 0)
                //     // TODO: focus file picker
                console.log("Preventing unload");
                event.stopImmediatePropagation();
                event.preventDefault();
                event.returnValue = "";
            } else {
                console.warn("unloading 👉 disconnecting websocket");
                // and don't prevent the unload
            }
        });
    }

    componentDidMount() {
        const lp = this.props.launch_params;
        if (this.state.static_preview) {
            this.setState({
                initializing: false,
            });

            // view stats on https://stats.plutojl.org/
            count_stat(
                lp.pluto_server_url != null
                    ? // record which featured notebook was viewed, e.g. basic/Markdown.jl
                      `featured-view${lp.notebookfile != null ? new URL(lp.notebookfile).pathname : ""}`
                    : // @ts-ignore
                      `article-view/${window?.version_info?.pluto ?? this.state.notebook.pluto_version ?? "unknown"}`
            );
        } else {
            this.connect(lp.pluto_server_url ? ws_address_from_base(lp.pluto_server_url) : undefined);
        }
    }

    componentDidUpdate(/** @type {EditorProps} */ old_props, /** @type {EditorState} */ old_state) {
        //@ts-ignore
        window.editor_state = this.state;
        //@ts-ignore
        window.editor_state_set = this.setStatePromise;

        const new_state = this.state;

        if (old_state?.notebook?.path !== new_state.notebook.path) {
            update_stored_recent_notebooks(new_state.notebook.path, old_state?.notebook?.path);
        }
        if (old_state?.notebook?.shortpath !== new_state.notebook.shortpath) {
            if (!is_editor_embedded_inside_editor(old_props.pluto_editor_element)) document.title = "🎈 " + new_state.notebook.shortpath + " — Pluto.jl";
        }

        this.maybe_send_queued_bond_changes();

        if (old_state.backend_launch_phase !== this.state.backend_launch_phase && this.state.backend_launch_phase != null) {
            const phase = Object.entries(BackendLaunchPhase).find(([k, v]) => v == this.state.backend_launch_phase)?.[0];
            console.info(`Binder phase: ${phase} at ${new Date().toLocaleTimeString()}`);
        }

        if (old_state.disable_ui !== this.state.disable_ui || old_state.connected !== this.state.connected) {
            this.on_disable_ui();
        }
        if (!this.state.initializing) {
            setup_mathjax();
        }

        if (old_state.notebook.nbpkg?.restart_recommended_msg !== new_state.notebook.nbpkg?.restart_recommended_msg) {
            console.warn(`New restart recommended message: ${new_state.notebook.nbpkg?.restart_recommended_msg}`);
        }
        if (old_state.notebook.nbpkg?.restart_required_msg !== new_state.notebook.nbpkg?.restart_required_msg) {
            console.warn(`New restart required message: ${new_state.notebook.nbpkg?.restart_required_msg}`);
        }
    }

    componentWillUpdate(new_props, new_state) {
        this.cached_status = statusmap(new_state, this.props.launch_params);

        Object.entries(this.cached_status).forEach(([k, v]) => {
            new_props.pluto_editor_element.classList.toggle(k, v === true);
        });
    }

    render() {
        const { launch_params } = this.props;
        let { export_menu_open, notebook } = this.state;

        const status = this.cached_status ?? statusmap(this.state, launch_params);
        const statusval = first_true_key(status);

        if (status.isolated_cell_view) {
            return html`
                <${PlutoActionsContext.Provider} value=${this.actions}>
                    <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                        <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                            <${ProgressBar$1} notebook=${this.state.notebook} backend_launch_phase=${this.state.backend_launch_phase} status=${status}/>
                            <div style="width: 100%">
                                ${this.state.notebook.cell_order.map(
                                    (cell_id, i) => html`
                                        <${IsolatedCell}
                                            cell_input=${notebook.cell_inputs[cell_id]}
                                            cell_result=${this.state.notebook.cell_results[cell_id]}
                                            hidden=${!launch_params.isolated_cell_ids?.includes(cell_id)}
                                            sanitize_html=${status.sanitize_html}
                                        />
                                    `
                                )}
                            </div>
                        </${PlutoJSInitializingContext.Provider}>
                    </${PlutoBondsContext.Provider}>
                </${PlutoActionsContext.Provider}>
            `
        }
        const warn_about_untrusted_code = this.client.session_options?.security?.warn_about_untrusted_code ?? true;

        const restart = async (maybe_confirm = false) => {
            let source = notebook.metadata?.risky_file_source;
            if (
                !warn_about_untrusted_code ||
                !maybe_confirm ||
                source == null ||
                confirm(`⚠️ Danger! Are you sure that you trust this file? \n\n${source}\n\nA malicious notebook can steal passwords and data.`)
            ) {
                await this.actions.update_notebook((notebook) => {
                    delete notebook.metadata.risky_file_source;
                });
                await this.client.send(
                    "restart_process",
                    {},
                    {
                        notebook_id: notebook.notebook_id,
                    }
                );
            }
        };

        const restart_button = (text, maybe_confirm = false) =>
            html`<a href="#" id="restart-process-button" onClick=${() => restart(maybe_confirm)}>${text}</a>`;

        return html`
            ${this.state.disable_ui === false && html`<${HijackExternalLinksToOpenInNewTab} />`}
            <${PlutoActionsContext.Provider} value=${this.actions}>
                <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                    <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                    ${
                        status.static_preview && status.offer_local
                            ? html`<button
                                  title="Go back"
                                  onClick=${() => {
                                      history.back();
                                  }}
                                  class="floating_back_button"
                              >
                                  <span></span>
                              </button>`
                            : null
                    }
                    <${Scroller} active=${this.state.scroller} />
                    <${ProgressBar$1} notebook=${this.state.notebook} backend_launch_phase=${this.state.backend_launch_phase} status=${status}/>
                    <header id="pluto-nav" className=${export_menu_open ? "show_export" : ""}>
                        <${ExportBanner}
                            notebook_id=${this.state.notebook.notebook_id}
                            print_title=${
                                this.state.notebook.metadata?.frontmatter?.title ??
                                new URLSearchParams(window.location.search).get("name") ??
                                this.state.notebook.shortpath
                            }
                            notebookfile_url=${this.export_url("notebookfile")}
                            notebookexport_url=${this.export_url("notebookexport")}
                            open=${export_menu_open}
                            onClose=${() => this.setState({ export_menu_open: false })}
                            start_recording=${() => this.setState({ recording_waiting_to_start: true })}
                        />
                        ${
                            status.binder
                                ? html`<div id="binder_spinners">
                                      <binder-spinner id="ring_1"></binder-spinner>
                                      <binder-spinner id="ring_2"></binder-spinner>
                                      <binder-spinner id="ring_3"></binder-spinner>
                                  </div>`
                                : null
                        }
                        <nav id="at_the_top">
                            <a href=${
                                this.state.binder_session_url != null ? `${this.state.binder_session_url}?token=${this.state.binder_session_token}` : "./"
                            }>
                                <h1><img id="logo-big" src=${url_logo_big} alt="Pluto.jl" /><img id="logo-small" src=${url_logo_small} /></h1>
                            </a>
                            ${
                                this.state.extended_components.CustomHeader &&
                                html`<${this.state.extended_components.CustomHeader} notebook_id=${this.state.notebook.notebook_id} />`
                            }
                            <div class="flex_grow_1"></div>
                            ${
                                this.state.extended_components.CustomHeader == null &&
                                (status.binder
                                    ? html`<pluto-filepicker><a href=${this.export_url("notebookfile")} target="_blank">Save notebook...</a></pluto-filepicker>`
                                    : html`<${FilePicker}
                                          client=${this.client}
                                          value=${notebook.in_temp_dir ? "" : notebook.path}
                                          on_submit=${this.submit_file_change}
                                          on_desktop_submit=${this.desktop_submit_file_change}
                                          clear_on_blur=${true}
                                          suggest_new_file=${{
                                              base: this.client.session_options?.server?.notebook_path_suggestion ?? "",
                                          }}
                                          placeholder="Save notebook..."
                                          button_label=${notebook.in_temp_dir ? "Choose" : "Move"}
                                      />`)
                            }
                            <div class="flex_grow_2"></div>
                            <div id="process_status">${
                                status.binder && status.loading
                                    ? "Loading binder..."
                                    : statusval === "disconnected"
                                    ? "Reconnecting..."
                                    : statusval === "loading"
                                    ? "Loading..."
                                    : statusval === "nbpkg_restart_required"
                                    ? html`${restart_button("Restart notebook")}${" (required)"}`
                                    : statusval === "nbpkg_restart_recommended"
                                    ? html`${restart_button("Restart notebook")}${" (recommended)"}`
                                    : statusval === "process_restarting"
                                    ? "Process exited — restarting..."
                                    : statusval === "process_dead"
                                    ? html`${"Process exited — "}${restart_button("restart")}`
                                    : statusval === "process_waiting_for_permission"
                                    ? html`${restart_button("Run notebook code", true)}`
                                    : null
                            }</div>
                            <button class="toggle_export" title="Export..." onClick=${() => {
                                this.setState({ export_menu_open: !export_menu_open });
                            }}><span></span></button>
                        </nav>
                    </header>
                    
                    <${SafePreviewUI}
                        process_waiting_for_permission=${status.process_waiting_for_permission}
                        risky_file_source=${notebook.metadata?.risky_file_source}
                        restart=${restart}
                        warn_about_untrusted_code=${warn_about_untrusted_code}
                    />
                    
                    <${RecordingUI} 
                        notebook_name=${notebook.shortpath}
                        recording_waiting_to_start=${this.state.recording_waiting_to_start}
                        set_recording_states=${({ is_recording, recording_waiting_to_start }) => this.setState({ is_recording, recording_waiting_to_start })}
                        is_recording=${this.state.is_recording}
                        patch_listeners=${this.patch_listeners}
                        export_url=${this.export_url}
                    />
                    <${RecordingPlaybackUI} 
                        launch_params=${launch_params}
                        initializing=${this.state.initializing}
                        apply_notebook_patches=${this.apply_notebook_patches}
                        reset_notebook_state=${() =>
                            this.setStatePromise(
                                immer((/** @type {EditorState} */ state) => {
                                    state.notebook = this.props.initial_notebook_state;
                                })
                            )}
                    />
                    <${EditorLaunchBackendButton} editor=${this} launch_params=${launch_params} status=${status} />
                    <${FrontMatterInput}
                        filename=${notebook.shortpath}
                        remote_frontmatter=${notebook.metadata?.frontmatter} 
                        set_remote_frontmatter=${(newval) =>
                            this.actions.update_notebook((nb) => {
                                nb.metadata["frontmatter"] = newval;
                            })} 
                    />
                    ${this.props.preamble_element}
                    <${Main}>
                        <${Preamble}
                            last_update_time=${this.state.last_update_time}
                            any_code_differs=${status.code_differs}
                            last_hot_reload_time=${notebook.last_hot_reload_time}
                            connected=${this.state.connected}
                        />
                        <${Notebook}
                            notebook=${notebook}
                            cell_inputs_local=${this.state.cell_inputs_local}
                            disable_input=${this.state.disable_ui || !this.state.connected /* && this.state.backend_launch_phase == null*/}
                            last_created_cell=${this.state.last_created_cell}
                            selected_cells=${this.state.selected_cells}
                            is_initializing=${this.state.initializing}
                            is_process_ready=${this.is_process_ready()}
                            process_waiting_for_permission=${status.process_waiting_for_permission}
                            sanitize_html=${status.sanitize_html}
                        />
                        <${DropRuler} 
                            actions=${this.actions}
                            selected_cells=${this.state.selected_cells}
                            set_scroller=${(enabled) => this.setState({ scroller: enabled })}
                            serialize_selected=${this.serialize_selected}
                            pluto_editor_element=${this.props.pluto_editor_element}
                        />
                        <${NonCellOutput} 
                            notebook_id=${this.state.notebook.notebook_id} 
                            environment_component=${this.state.extended_components.NonCellOutputComponents} />
                    </${Main}>
                    ${
                        this.state.disable_ui ||
                        html`<${SelectionArea}
                            cell_order=${this.state.notebook.cell_order}
                            set_scroller=${(enabled) => {
                                this.setState({ scroller: enabled });
                            }}
                            on_selection=${(selected_cell_ids) => {
                                // @ts-ignore
                                if (
                                    selected_cell_ids.length !== this.state.selected_cells.length ||
                                    _.difference(selected_cell_ids, this.state.selected_cells).length !== 0
                                ) {
                                    this.setState({
                                        selected_cells: selected_cell_ids,
                                    });
                                }
                            }}
                        />`
                    }
                    <${BottomRightPanel}
                        desired_doc_query=${this.state.desired_doc_query}
                        on_update_doc_query=${this.actions.set_doc_query}
                        connected=${this.state.connected}
                        backend_launch_phase=${this.state.backend_launch_phase}
                        backend_launch_logs=${this.state.backend_launch_logs}
                        notebook=${this.state.notebook}
                        sanitize_html=${status.sanitize_html}
                    />
                    <${Popup} 
                        notebook=${this.state.notebook}
                        disable_input=${this.state.disable_ui || !this.state.connected /* && this.state.backend_launch_phase == null*/}
                    />
                    <${RecentlyDisabledInfo} 
                        recently_auto_disabled_cells=${this.state.recently_auto_disabled_cells}
                        notebook=${this.state.notebook}
                    />
                    <${UndoDelete}
                        recently_deleted=${this.state.recently_deleted}
                        on_click=${() => {
                            const rd = this.state.recently_deleted;
                            if (rd == null) return
                            this.update_notebook((notebook) => {
                                for (let { index, cell } of rd) {
                                    notebook.cell_inputs[cell.cell_id] = cell;
                                    notebook.cell_order = [...notebook.cell_order.slice(0, index), cell.cell_id, ...notebook.cell_order.slice(index, Infinity)];
                                }
                            }).then(() => {
                                this.actions.set_and_run_multiple(rd.map(({ cell }) => cell.cell_id));
                            });
                        }}
                    />
                    <${SlideControls} />
                    <footer>
                        <div id="info">
                            <a href="https://github.com/fonsp/Pluto.jl/wiki" target="_blank">FAQ</a>
                            <span style="flex: 1"></span>
                            <form id="feedback" action="#" method="post">
                                <label for="opinion">🙋 How can we make <a href="https://plutojl.org/" target="_blank">Pluto.jl</a> better?</label>
                                <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />
                                <button>Send</button>
                            </form>
                        </div>
                    </footer>
                </${PlutoJSInitializingContext.Provider}>
                </${PlutoBondsContext.Provider}>
            </${PlutoActionsContext.Provider}>
        `
    }
}

const check_access = (/** @type {import("../common/PlutoConnection.js").PlutoConnection} */ client) => {
    // 2028 is the current domain expiry date for fonsp.com
    if (new Date().getFullYear() < 2028 && window.location.hostname === "localhost") {
        fetch("https://pluto-available.fonsp.com/", { priority: "low", headers: { "x-pluto-version": client.version_info.pluto } })
            .then((res) => res.json())
            .then(({ blocked, message }) => {
                if (blocked) {
                    document.body.innerHTML = "";
                    client.kill(false);
                }
                if (message) alert(message);
            })
            .catch(() => {});
    }
};

/* LOCALSTORAGE NOTEBOOKS LIST */

// TODO This is now stored locally, lets store it somewhere central 😈
const update_stored_recent_notebooks = (recent_path, /** @type {string | undefined} */ also_delete = undefined) => {
    if (recent_path != null && recent_path !== default_path) {
        const stored_string = localStorage.getItem("recent notebooks");
        const stored_list = stored_string != null ? JSON.parse(stored_string) : [];
        const oldpaths = stored_list;

        const newpaths = [recent_path, ...oldpaths.filter((path) => path !== recent_path && path !== also_delete)];
        if (!_.isEqual(oldpaths, newpaths)) {
            localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)));
        }
    }
};

const read_Uint8Array_with_progress = async (/** @type {Response} */ response, on_progress) => {
    if (response.body != null) {
        const length_str = response.headers.get("Content-Length");
        const length = length_str == null ? null : Number(length_str);

        const reader = response.body.getReader();

        let receivedLength = 0;
        let chunks = [];
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break
            }

            chunks.push(value);
            receivedLength += value.length;

            if (length != null) {
                on_progress(Math.min(1, receivedLength / length));
            } else {
                // fake progress: 50% at 1MB, 67% at 2MB, 75% at 3MB, etc.
                const z = 1e6;
                on_progress(1.0 - z / (receivedLength - z));
            }
            console.log({ receivedLength });
        }

        on_progress(1);

        const buffer = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks) {
            buffer.set(chunk, position);
            position += chunk.length;
        }
        return buffer
    } else {
        return new Uint8Array(await response.arrayBuffer())
    }
};

const FetchProgress = ({ progress }) =>
    progress == null || progress === 1
        ? null
        : html`<progress class="statefile-fetch-progress" max="100" value=${progress === "indeterminate" ? undefined : Math.round(progress * 100)}>
              ${progress === "indeterminate" ? null : Math.round(progress * 100)}%
          </progress>`;

/**
 *
 * @return {import("../components/Editor.js").LaunchParameters}
 */
const parse_launch_params = () => {
    const url_params = new URLSearchParams(window.location.search);

    return {
        //@ts-ignore
        notebook_id: url_params.get("id") ?? window.pluto_notebook_id,
        //@ts-ignore
        statefile: url_params.get("statefile") ?? window.pluto_statefile,
        //@ts-ignore
        statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
        //@ts-ignore
        notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
        //@ts-ignore
        notebookfile_integrity: url_params.get("notebookfile_integrity") ?? window.pluto_notebookfile_integrity,
        //@ts-ignore
        disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
        //@ts-ignore
        preamble_html: url_params.get("preamble_html") ?? window.pluto_preamble_html,
        //@ts-ignore
        isolated_cell_ids: url_params.has("isolated_cell_id") ? url_params.getAll("isolated_cell_id") : window.pluto_isolated_cell_ids,
        //@ts-ignore
        binder_url: url_params.get("binder_url") ?? window.pluto_binder_url,
        //@ts-ignore
        pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_pluto_server_url,
        //@ts-ignore
        slider_server_url: url_params.get("slider_server_url") ?? window.pluto_slider_server_url,
        //@ts-ignore
        recording_url: url_params.get("recording_url") ?? window.pluto_recording_url,
        //@ts-ignore
        recording_url_integrity: url_params.get("recording_url_integrity") ?? window.pluto_recording_url_integrity,
        //@ts-ignore
        recording_audio_url: url_params.get("recording_audio_url") ?? window.pluto_recording_audio_url,
    }
};

const url_params = new URLSearchParams(window.location.search);
const set_disable_ui_css = (/** @type {boolean} */ val, /** @type {HTMLElement} */ element) => {
    element.classList.toggle("disable_ui", val);
};
const is_editor_embedded_inside_editor = (/** @type {HTMLElement} */ element) => element.parentElement?.closest("pluto-editor") != null;

/////////////
// the rest:

const launch_params = parse_launch_params();

const truthy = (x) => x === "" || x === "true";
const falsey = (x) => x === "false";

const from_attribute = (element, name) => {
    const val = element.getAttribute(name) ?? element.getAttribute(name.replaceAll("_", "-"));
    if (name === "disable_ui") {
        return truthy(val) ? true : falsey(val) ? false : null
    } else if (name === "isolated_cell_id") {
        return val == null ? null : val.split(",")
    } else {
        return val
    }
};

const preamble_html_comes_from_url_params = url_params.has("preamble_url");

/**
 *
 * @returns {import("./components/Editor.js").NotebookData}
 */
const empty_notebook_state = ({ notebook_id }) => ({
    metadata: {},
    notebook_id: notebook_id,
    path: default_path,
    shortpath: "",
    in_temp_dir: true,
    process_status: ProcessStatus.starting,
    last_save_time: 0.0,
    last_hot_reload_time: 0.0,
    cell_inputs: {},
    cell_results: {},
    cell_dependencies: {},
    cell_order: [],
    cell_execution_order: [],
    published_objects: {},
    bonds: {},
    nbpkg: null,
    status_tree: null,
});

/**
 *
 * @param {import("./components/Editor.js").NotebookData} state
 * @returns {import("./components/Editor.js").NotebookData}
 */
const without_path_entries = (state) => ({ ...state, path: default_path, shortpath: "" });

/**
 * Fetches the statefile (usually a async resource) in launch_params.statefile
 * and makes it available for consuming by `pluto-editor`
 * To add custom logic instead, see use Environment.js
 *
 * @param {import("./components/Editor.js").LaunchParameters} launch_params
 * @param {{current: import("./components/Editor.js").EditorState}} initial_notebook_state_ref
 * @param {Function} set_ready_for_editor
 * @param {Function} set_statefile_download_progress
 */

const get_statefile =
    // @ts-ignore
    window?.pluto_injected_environment?.custom_get_statefile?.(read_Uint8Array_with_progress, without_path_entries, unpack) ??
    (async (launch_params, set_statefile_download_progress) => {
        set_statefile_download_progress("indeterminate");
        const r = await fetch(new Request(launch_params.statefile, { integrity: launch_params.statefile_integrity ?? undefined }), {
            // @ts-ignore
            priority: "high",
        });
        set_statefile_download_progress(0.2);
        const data = await read_Uint8Array_with_progress(r, (x) => set_statefile_download_progress(x * 0.8 + 0.2));
        const state = without_path_entries(unpack(data));
        return state
    });
/**
 *
 * @param {{
 *  launch_params: import("./components/Editor.js").LaunchParameters,
 *  pluto_editor_element: HTMLElement,
 * }} props
 */
const EditorLoader = ({ launch_params, pluto_editor_element }) => {
    const { statefile, statefile_integrity } = launch_params;
    const static_preview = statefile != null;

    const [statefile_download_progress, set_statefile_download_progress] = hooks_pin_v113_target_es2020.useState(null);

    const initial_notebook_state_ref = hooks_pin_v113_target_es2020.useRef(empty_notebook_state(launch_params));
    const [error_banner, set_error_banner] = hooks_pin_v113_target_es2020.useState(/** @type {import("./imports/Preact.js").ReactElement?} */ (null));
    const [ready_for_editor, set_ready_for_editor] = hooks_pin_v113_target_es2020.useState(!static_preview);

    hooks_pin_v113_target_es2020.useEffect(() => {
        if (!ready_for_editor && static_preview) {
            get_statefile(launch_params, set_statefile_download_progress)
                .then((state) => {
                    console.log({ state });
                    initial_notebook_state_ref.current = state;
                    set_ready_for_editor(true);
                })
                .catch((e) => {
                    console.error(e);
                    set_error_banner(html`
                        <main style="font-family: system-ui, sans-serif;">
                            <h2>Failed to load notebook</h2>
                            <p>The statefile failed to download. Original error message:</p>
                            <pre style="overflow: auto;"><code>${e.toString()}</code></pre>
                            <p>Launch parameters:</p>
                            <pre style="overflow: auto;"><code>${JSON.stringify(launch_params, null, 2)}</code></pre>
                        </main>
                    `);
                });
        }
    }, [ready_for_editor, static_preview, statefile]);

    hooks_pin_v113_target_es2020.useEffect(() => {
        set_disable_ui_css(launch_params.disable_ui, pluto_editor_element);
    }, [launch_params.disable_ui]);

    const preamble_element = launch_params.preamble_html
        ? html`<${RawHTMLContainer} body=${launch_params.preamble_html} className=${"preamble"} sanitize_html=${preamble_html_comes_from_url_params} />`
        : null;

    return error_banner != null
        ? error_banner
        : ready_for_editor
        ? html`<${Editor}
              initial_notebook_state=${initial_notebook_state_ref.current}
              launch_params=${launch_params}
              preamble_element=${preamble_element}
              pluto_editor_element=${pluto_editor_element}
          />`
        : // todo: show preamble html
          html`
              ${preamble_element}
              <${FetchProgress} progress=${statefile_download_progress} />
          `
};

// Create a web component for EditorLoader that takes in additional launch parameters as attributes
// possible attribute names are `Object.keys(launch_params)`

// This means that you can do stuff like:
/* 
<pluto-editor disable_ui notebookfile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.jl" statefile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.plutostate"  ></pluto-editor>
        
<pluto-editor disable_ui notebookfile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.jl" statefile="https://juliapluto.github.io/weekly-call-notes/2022/02-10/notes.plutostate"  ></pluto-editor> 
*/

// or:

/* 
<pluto-editor notebook_id="fcc1b498-a141-11ec-342a-593db1016648"></pluto-editor>

<pluto-editor notebook_id="21ebc942-a1ed-11ec-2505-7b242b18daf3"></pluto-editor>

TODO: Make this self-contained (currently depends on various stuff being on window.*, e.g. observablehq library, lodash etc)
*/

class PlutoEditorComponent extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        if (this.hasAttribute("skip-custom-element")) return

        /** Web components only support text attributes. We deserialize into js here */
        const new_launch_params = Object.fromEntries(Object.entries(launch_params).map(([k, v]) => [k, from_attribute(this, k) ?? v]));
        console.log("Launch parameters: ", new_launch_params);

        document.querySelector(".delete-me-when-live")?.remove();
        preact_10_13_2_pin_v113_target_es2020.render(html`<${EditorLoader} launch_params=${new_launch_params} pluto_editor_element=${this} />`, this);
    }
}
customElements.define("pluto-editor", PlutoEditorComponent);

/**
 * @fileoverview PlutoNotebookAPI - Programmatic Interface for Pluto Notebooks
 *
 * This module provides a JavaScript API for interacting with Pluto notebooks
 * without requiring the full Editor UI. It's designed for:
 *
 * - Automated notebook execution
 * - Testing and CI/CD pipelines
 * - Custom notebook interfaces
 * - Headless Pluto workflows
 *
 * The API maintains compatibility with Pluto's internal state structures
 * and uses the same WebSocket protocol as the Editor.js component.
 *
 * ## Basic Usage
 *
 * ```javascript
 * import { Pluto } from './PlutoNotebookAPI.js';
 *
 * // Connect to Pluto server
 * const pluto = new Pluto("http://localhost:1234");
 *
 * // Create a new notebook
 * const notebook = await pluto.createNotebook("x = 1 + 1");
 *
 * // Add and run cells
 * const cellId = await notebook.addCell(0, "println(x)");
 *
 * // Listen for updates
 * notebook.onUpdate((event) => {
 *   console.log("Update:", event.type, event.data);
 * });
 * ```
 *
 * ## State Compatibility
 *
 * The notebook state structure matches Editor.js exactly:
 * - `notebook_state.cell_order` - Array of cell IDs in execution order
 * - `notebook_state.cell_inputs` - Map of cell IDs to input data
 * - `notebook_state.cell_results` - Map of cell IDs to execution results
 * - `notebook_state.status_tree` - Execution status hierarchy
 *
 * @author Pluto.jl Team
 * @version 1.0.0
 */


/**
 * @typedef CellData
 * @type {{
 *  input: import("../components/Editor.js").CellInputData,
 *  results: import("../components/Editor.js").CellResultData,
 * }}
 */

// Be sure to keep this in sync with DEFAULT_CELL_METADATA in Cell.jl
const DEFAULT_CELL_METADATA$1 = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
};

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4 = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

/**
 * Pluto - Main class for connecting to a Pluto server and managing notebooks
 *
 * This class provides high-level operations for interacting with a Pluto server:
 * - Discovering running notebooks
 * - Creating new notebooks from text content
 * - Managing PlutoNotebook instances
 *
 * @example
 * const pluto = new Pluto("http://localhost:1234");
 * const notebooks = await pluto.getRunningNotebooks();
 * const notebook = await pluto.createNotebook(``);
 */
class Pluto {
    /**
     * Create a new Pluto instance
     * @param {string} [server_url="http://localhost:1234"] - Pluto server URL
     */
    constructor(server_url = "http://localhost:1234") {
        /** @type {string} */
        this.server_url = server_url;
        /** @type {string} */
        this.ws_address = ws_address_from_base(server_url);
        /** @type {Map<string, PlutoNotebook>} */
        this._notebooks = new Map();
    }

    /**
     * Get list of currently running notebooks on the server
     * @returns {Promise<Array<PlutoNotebook>>} Array of notebook information objects
     * @throws {Error} If connection to server fails
     */
    async getRunningNotebooks() {
        try {
            // Create a temporary connection to get server info
            const temp_client = await create_pluto_connection({
                ws_address: this.ws_address,
                on_unrequested_update: () => {},
                on_connection_status: () => {},
                on_reconnect: async () => true,
            });

            // Request server status to get running notebooks
            const response = await temp_client.send("get_all_notebooks", {}, {}, false);
            temp_client.kill();

            return response.message?.notebooks || []
        } catch (error) {
            console.error("Failed to get running notebooks:", error);
            return []
        }
    }

    /**
     * Get or create a PlutoNotebook instance for the given notebook ID
     *
     * This method implements a cache pattern - multiple calls with the same
     * notebook_id will return the same PlutoNotebook instance.
     *
     * @param {string} notebook_id - Notebook UUID
     * @returns {PlutoNotebook} PlutoNotebook instance (may be cached)
     */
    notebook(notebook_id) {
        if (!this._notebooks.has(notebook_id)) {
            this._notebooks.set(notebook_id, new PlutoNotebook(this.ws_address, notebook_id));
        }
        return this._notebooks.get(notebook_id)
    }

    /**
     * Create a new notebook from text content
     *
     * This method uploads notebook content to the server via /notebookupload,
     * creates a PlutoNotebook instance, connects to it, and restarts it for
     * proper initialization.
     *
     * @param {string} notebook_text - Pluto notebook text content (.jl format)
     * @returns {Promise<PlutoNotebook>} Connected and initialized PlutoNotebook instance
     * @throws {Error} If upload fails, connection fails, or restart fails
     *
     * @example
     * const notebook = await pluto.createNotebook(`
     *   ### A Pluto.jl notebook ###
     *   # v0.19.40
     *
     *   x = 1 + 1
     * `);
     */
    async createNotebook(notebook_text) {
        try {
            // Upload notebook text to server using /notebookupload endpoint
            const response = await fetch(`${this.server_url}/notebookupload`, {
                method: "POST",
                body: notebook_text,
            });

            if (!response.ok) {
                throw new Error(`Failed to upload notebook: ${response.status} ${response.statusText}`)
            }

            // Get the notebook ID from the response
            const notebook_id = await response.text();

            // Create and connect to the new notebook
            const notebook = this.notebook(notebook_id);
            if (!notebook) {
                throw new Error(`Notebook ${notebook_id} could not be created properly`)
            }
            const connected = await notebook.connect();

            if (!connected) {
                throw new Error("Failed to connect to newly created notebook")
            }

            // Restart the notebook to ensure proper initialization
            await notebook.restart();

            return notebook
        } catch (error) {
            console.error("Failed to create notebook:", error);
            throw error
        }
    }

    /**
     * Remove a notebook instance from memory
     *
     * This is called internally when a notebook is shut down.
     * You typically don't need to call this manually.
     *
     * @param {string} notebook_id - Notebook UUID
     * @private
     */
    _removeNotebook(notebook_id) {
        this._notebooks.delete(notebook_id);
    }
}

/**
 * PlutoNotebook - A programmatic interface to interact with a specific Pluto notebook
 * without the full Editor UI component.
 *
 * This class provides the core functionality of the Editor.js component:
 * 1. Connection management to Pluto backend via WebSocket
 * 2. Notebook state management (mirroring Editor.js state structure)
 * 3. Cell code updates and execution
 * 4. Real-time state synchronization
 *
 * The state management is designed to be compatible with Editor.js:
 * - Uses the same notebook state structure
 * - Handles patches the same way
 * - Maintains the same cell lifecycle
 *
 * @example
 * const notebook = pluto.notebook("notebook-uuid");
 * await notebook.connect();
 *
 * // Add and run a cell
 * const cellId = await notebook.addCell(0, "x = 1 + 1");
 *
 * // Update cell code
 * await notebook.updateCellCode(cellId, "x = 2 + 2");
 *
 * // Listen for updates
 * const unsubscribe = notebook.onUpdate((event) => {
 *   console.log("Notebook updated:", event);
 * });
 */
class PlutoNotebook {
    /**
     * Create a new PlutoNotebook instance
     *
     * Note: This constructor only creates the instance. You must call connect()
     * to establish the WebSocket connection and initialize the notebook state.
     *
     * @param {string} ws_address - WebSocket address to connect to
     * @param {string} notebook_id - Specific notebook ID to connect to
     */
    constructor(ws_address, notebook_id) {
        /** @type {string} */
        this.ws_address = ws_address;
        /** @type {string} */
        this.notebook_id = notebook_id;
        /** @type {boolean} */
        this.connected = false;
        /** @type {boolean} */
        this.initializing = true;
        /** @type {*} */
        this.notebook_status = null;

        /** @type {Record<string, import("../components/Editor.js").CellInputData>} */
        this.cell_inputs_local = {};

        /** @type {import("../components/Editor.js").NotebookData*/
        this.notebook_state = empty_notebook_state({
            notebook_id: this.notebook_id,
        });

        /** @type {number} */
        this.last_update_time = 0;
        /** @type {number} */
        this.pending_local_updates = 0;
        /** @type {number} */
        this.last_update_counter = -1;
        /** @type {import("../common/PlutoConnection.js").PlutoConnection | null} */
        this.client = null;

        /** @type {Set<Function>} */
        this._update_handlers = new Set();
        /** @type {Set<Function>} */
        this._connection_status_handlers = new Set();
        /** @type {Promise<void>} */
        this._update_queue_promise = Promise.resolve();

        // Initialize notebook state
        this.cell_inputs_local = {};
        this.last_update_time = 0;
    }

    /**
     * Connect to the Pluto backend WebSocket for this notebook
     *
     * This method establishes the WebSocket connection, initializes the notebook
     * state, and syncs with the server. Must be called before other operations.
     *
     * @returns {Promise<boolean>} True if connection and initialization successful
     * @throws {Error} If connection fails or notebook doesn't exist
     */
    async connect() {
        if (this.connected) {
            return true
        }

        try {
            this.client = await create_pluto_connection({
                ws_address: this.ws_address,
                on_unrequested_update: this._handle_update.bind(this),
                on_connection_status: this._handle_connection_status.bind(this),
                on_reconnect: this._handle_reconnect.bind(this),
                connect_metadata: { notebook_id: this.notebook_id },
            });

            // Initialize notebook state
            if (this.client.notebook_exists) {
                this.notebook_state = empty_notebook_state({
                    notebook_id: this.notebook_id,
                });

                // Ensure required structures exist for patches
                if (!this.notebook_state.cell_results) {
                    this.notebook_state.cell_results = {};
                }
                if (!this.notebook_state.status_tree) {
                    this.notebook_state.status_tree = { subtasks: {}, finished_at: 0, name: "noop", started_at: Date.now(), success: true, timing: "local" };
                }
            }

            if (!this.client.notebook_exists) {
                console.error("Notebook does not exist. Not connecting.");
                return false
            }

            // Send initial update_notebook request to sync state
            console.debug("Sending update_notebook request...");
            const response = await this.client.send("update_notebook", { updates: [] }, { notebook_id: this.notebook_id }, false);
            console.debug({ response });
            console.debug("Received update_notebook request");

            this.initializing = false;

            return true
        } catch (error) {
            console.error("Failed to connect to Pluto backend:", error);
            return false
        }
    }

    /**
     * Close the connection to this notebook
     */
    close() {
        if (this.client && this.client.kill) {
            this.client.kill();
        }
        this.connected = false;
        this.client = null;
        this.notebook_state = empty_notebook_state();
        this._update_handlers.clear();
        this._connection_status_handlers.clear();
    }

    /**
     * Shutdown the running notebook on the server
     *
     * This terminates the notebook process and removes it from the server.
     * After shutdown, the notebook instance becomes unusable and should be discarded.
     *
     * @returns {Promise<boolean>} True if shutdown successful
     * @throws {Error} If not connected to notebook
     */
    async shutdown() {
        if (!this.client) {
            throw new Error("Not connected to notebook")
        }

        try {
            // Send shutdown command to the server
            await this.client.send("shutdown_notebook", {}, { notebook_id: this.notebook_id }, false);

            // Close the local connection
            this.close();

            return true
        } catch (error) {
            console.error("Failed to shutdown notebook:", error);
            return false
        }
    }

    /**
     * Restart the notebook process
     *
     * This clears risky file metadata and sends a restart_process command to the server.
     * All cell execution state is reset, but cell code is preserved.
     *
     * @param {boolean} [maybe_confirm=false] - Whether to require confirmation for risky files (unused in API context)
     * @returns {Promise<void>}
     * @throws {Error} If not connected to notebook or restart fails
     */
    async restart(maybe_confirm = false) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        try {
            // Clear risky file metadata if present
            await this._update_notebook_state((nb) => {
                if (nb.metadata?.risky_file_source) {
                    delete nb.metadata.risky_file_source;
                }
            });

            // Send restart command to server
            // Awaiting this is futile, I think (@pankgeorg, 2/8/2025)
            this.client.send(
                "restart_process",
                {},
                {
                    notebook_id: this.notebook_id,
                }
            );

            this._notify_update("notebook_restarted", {
                notebook_id: this.notebook_id,
            });
        } catch (error) {
            console.error("Failed to restart notebook:", error);
            throw error
        }
    }

    /**
     * Execute a function within the Julia context
     *
     * @param {string} symbol - Function symbol to execute
     * @param {Array<any>} [arguments=[]] - Arguments to pass to the function
     * @returns {Promise<any>} Function result
     * @throws {Error} Not implemented
     */
    async execute(input) {
        const cell_id = "00000000-0000-0208-1991-000000000000";
        try {
            if (!this.notebook_state.cell_results[cell_id]) {
                console.log();
                throw new Error(`
# REPL cell not installed. Try including the following cell, with id "00000000-0000-0208-1991-000000000000"
begin
	function eval_in_pluto(x::String)
		id = PlutoRunner.moduleworkspace_count[]
		new_workspace_name = Symbol("workspace#", id)
		Core.eval(getproperty(Main, new_workspace_name), Meta.parse(x))
	end
	AbstractPlutoDingetjes.Display.with_js_link(eval_in_pluto)
end
`)
            }
            const link_id = this.notebook_state.cell_results[cell_id].output.body.split('", "')[1].substr(0, 16);
            return this.client
                .send(
                    "request_js_link_response",
                    {
                        cell_id,
                        link_id,
                        input,
                    },
                    { notebook_id: this.notebook_id }
                )
                .then((r) => r.message)
        } catch (ex) {
            console.error(ex);
            throw ex
        }
    }

    /**
     * Get the current notebook state (equivalent to Editor.js this.state.notebook)
     *
     * Returns the complete notebook state structure including cell_inputs,
     * cell_results, cell_order, and metadata. This matches the structure
     * used by Editor.js.
     *
     * @returns {NotebookData|null} Current notebook state, or null if not connected
     */
    getNotebookState() {
        return this.notebook_state
    }

    /**
     * Get specific cell data
     *
     * @param {string} cell_id - Cell UUID
     * @returns {CellData|null} Cell data object with input, result, and local state
     */
    getCell(cell_id) {
        if (!this.notebook_state) return null

        return {
            input: this.notebook_state.cell_inputs?.[cell_id],
            result: this.notebook_state.cell_results?.[cell_id],
        }
    }

    /**
     * Get all cells in order
     *
     * Returns cells in the order specified by cell_order, with complete
     * input and result data for each cell.
     *
     * @returns {Array<{cell_id: string} & CellData>} Array of cell data objects in execution order
     */
    getCells() {
        if (!this.notebook_state || !this.notebook_state.cell_order) return []

        return this.notebook_state.cell_order.map((cell_id) => ({
            cell_id,
            ...this.getCell(cell_id),
        }))
    }

    /**
     * Update cell code and optionally run it
     *
     * This updates the cell's code and optionally triggers execution.
     * The change is first stored locally, then sent to the server.
     *
     * @param {string} cell_id - Cell UUID
     * @param {string} code - New cell code
     * @param {boolean} [run=true] - Whether to run the cell after updating
     * @param {Object} [metadata={}] - Additional cell metadata
     * @returns {Promise<Object|undefined>} Response from backend if run=true
     * @throws {Error} If not connected to notebook
     */
    async updateCellCode(cell_id, code, run = true, metadata = {}) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        // Update local state
        this.cell_inputs_local[cell_id] = { ...this.cell_inputs_local[cell_id], code, metadata: { ...this.cell_inputs_local[cell_id]?.metadata, ...metadata } };
        this._notify_update("cell_local_update", { cell_id, code });

        if (run) {
            return await this.setCellsAndRun([cell_id], { cell_id: metadata })
        }
    }

    /**
     * Submit local cell changes to backend and run cells
     * @param {Array<string>} cell_ids - Array of cell UUIDs to update and run
     * @param {Record<string, Object>} metadata_record - Metadata for each cell
     * @returns {Promise<Object>} - Response from backend
     */
    async setCellsAndRun(cell_ids, metadata_record) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        if (cell_ids.length === 0) {
            return { disabled_cells: {} }
        }

        const new_task = this._update_queue_promise.then(async () => {
            // Create patches for the cell code changes
            const [new_notebook, changes] = immer.produceWithPatches(this.notebook_state, (notebook) => {
                for (let cell_id of cell_ids) {
                    if (this.cell_inputs_local[cell_id]) {
                        notebook.cell_inputs[cell_id] = {
                            ...notebook.cell_inputs[cell_id],
                            code: this.cell_inputs_local[cell_id].code,
                            metadata: { ...notebook.cell_inputs[cell_id].metadata, ...metadata_record[cell_id] },
                        };
                    }
                }
            });

            if (changes.length === 0) {
                return { disabled_cells: {} }
            }

            this.pending_local_updates++;

            try {
                // Send the update to the backend
                const response = await this.client.send("update_notebook", { updates: changes }, { notebook_id: this.notebook_id }, false);

                if (response.message?.response?.update_went_well === "👎") {
                    throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
                }

                // Update local state
                this.notebook_state = new_notebook;
                this.last_update_time = Date.now();

                // Clear local changes for updated cells
                for (let cell_id of cell_ids) {
                    delete this.cell_inputs_local[cell_id];
                }

                // Run the cells
                const run_response = await this.client.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: this.notebook_id });

                this._notify_update("cells_updated", {
                    cell_ids,
                    response: run_response,
                });

                return run_response.message
            } finally {
                this.pending_local_updates--;
            }
        });

        this._update_queue_promise = new_task.catch(console.error);
        return await new_task
    }

    /**
     * Add a new cell to the notebook
     *
     * Creates a new cell with a generated UUID, inserts it at the specified
     * position, and immediately runs it. The cell is added to both cell_inputs
     * and cell_results with appropriate initial state.
     *
     * @param {number} [index=0] - Position to insert the cell (0-based)
     * @param {string} [code=""] - Initial cell code
     * @param {Object} [metadata={}] - Additional cell metadata
     * @returns {Promise<CellId>} UUID of the newly created cell
     * @throws {Error} If not connected to notebook
     *
     * @example
     * const cellId = await notebook.addCell(0, "println(\"Hello World\")");
     */
    async addCell(index = 0, code = "", metadata = {}) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        const cell_id = uuidv4();
        await this._update_notebook_state((notebook) => {
            notebook.cell_inputs[cell_id] = {
                cell_id: cell_id,
                code,
                code_folded: false,
                metadata: { ...DEFAULT_CELL_METADATA$1, ...metadata },
            };

            // Add to cell_order
            notebook.cell_order = [...notebook.cell_order.slice(0, index), cell_id, ...notebook.cell_order.slice(index, Infinity)];
        });

        // Wait for the server to confirm the cell addition
        await this.client.send("run_multiple_cells", { cells: [cell_id] }, { notebook_id: this.notebook_id });

        // Update local state to match server response
        // this.notebook_state = new_notebook;

        this._notify_update("cell_added", { cell_id, index });

        return cell_id
    }

    /**
     * Delete cells from the notebook
     * @param {Array<string>} cell_ids - Array of cell UUIDs to delete
     * @returns {Promise<void>}
     */
    async deleteCells(cell_ids) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        await this._update_notebook_state((notebook) => {
            for (let cell_id of cell_ids) {
                delete notebook.cell_inputs[cell_id];
            }
            notebook.cell_order = notebook.cell_order.filter((cell_id) => !cell_ids.includes(cell_id));
        });

        // Clear local state for deleted cells
        for (let cell_id of cell_ids) {
            delete this.cell_inputs_local[cell_id];
        }

        // Run empty cells array to trigger dependency updates
        await this.client.send("run_multiple_cells", { cells: [] }, { notebook_id: this.notebook_id });

        this._notify_update("cells_deleted", { cell_ids });
    }

    /**
     * Interrupt notebook execution
     * @returns {Promise<void>}
     */
    async interrupt() {
        if (!this.client) {
            throw new Error("Not connected to notebook")
        }

        await this.client.send("interrupt_all", {}, { notebook_id: this.notebook_id }, false);
    }

    /**
     * Register a callback for updates from the WebSocket
     *
     * This callback will be called every time a state update comes from the websocket.
     * Use this to react to cell execution results, notebook state changes, etc.
     *
     * @param {function(UpdateEvent): void} callback - Function to call on updates
     * @returns {function(): void} Unsubscribe function to stop receiving updates
     *
     * @example
     * const unsubscribe = notebook.onUpdate((event) => {
     *   if (event.type === 'notebook_updated') {
     *     console.log('Notebook state changed');
     *   }
     * });
     *
     * // Later, stop listening
     * unsubscribe();
     */
    onUpdate(callback) {
        this._update_handlers.add(callback);
        return () => this._update_handlers.delete(callback)
    }

    /**
     * Register a handler for connection status changes
     * @param {Function} handler - Function to call on connection status changes
     * @returns {function(): void} Unsubscribe function
     */
    onConnectionStatus(handler) {
        this._connection_status_handlers.add(handler);
        return () => this._connection_status_handlers.delete(handler)
    }

    /**
     * Check if notebook is currently idle (not running any cells)
     *
     * A notebook is considered idle when:
     * - No local updates are pending
     * - No cells are currently running or queued
     *
     * @returns {boolean} True if notebook is idle
     */
    isIdle() {
        if (!this.notebook_state) return true

        return !(this.pending_local_updates > 0 || Object.values(this.notebook_state.cell_results).some((cell) => cell.running || cell.queued))
    }

    // Private methods

    /**
     * Handle update from WebSocket
     * @param {Object} update - Update object from server
     * @param {boolean} by_me - Whether update was triggered by this client
     * @private
     */
    _handle_update(update, by_me) {
        if (this.notebook_state?.notebook_id === update.notebook_id) {
            const message = update.message;
            switch (update.type) {
                case "notebook_diff":
                    this._handle_notebook_diff(message);
                    break
                default:
                    console.warn("Received unknown update type!", update);
                    break
            }
        }
    }

    /**
     * Handle notebook diff message
     * @param {Object} message - Notebook diff message
     * @private
     */
    _handle_notebook_diff(message) {
        if (message?.counter != null) {
            if (message.counter <= this.last_update_counter) {
                console.error("State update out of order", message.counter, this.last_update_counter);
                return
            }
            this.last_update_counter = message.counter;
        }

        if (message.patches && message.patches.length > 0) {
            this._apply_patches(message.patches);
        }
    }

    /**
     * Apply patches to notebook state
     * @param {Array} patches - Array of patches to apply
     * @private
     */
    _apply_patches(patches) {
        try {
            // Ensure we have a valid notebook state before applying patches
            if (!this.notebook_state) {
                console.warn("No notebook state available, skipping patch application");
                return
            }

            // Validate patches before applying
            if (!Array.isArray(patches) || patches.length === 0) {
                console.warn("Invalid or empty patches, skipping application");
                return
            }

            let new_notebook = immer.applyPatches(this.notebook_state, patches);

            this.notebook_state = new_notebook;
            this.last_update_time = Date.now();

            this._notify_update("notebook_updated", {
                patches,
                notebook: new_notebook,
            });
        } catch (exception) {
            console.error("Failed to apply patches:", exception);
            console.error("Notebook state:", this.notebook_state);
            console.error("Patches:", patches);

            // Request state reset from server
            if (this.client && this.connected) {
                console.info("Resetting state");
                this.client.send("reset_shared_state", {}, { notebook_id: this.notebook_id }, false);
            }
        }
    }

    /**
     * Handle connection status change
     * @param {boolean} connected - Whether connection is active
     * @param {boolean} hopeless - Whether connection is hopeless
     * @private
     */
    _handle_connection_status(connected, hopeless) {
        this.connected = connected;
        this._notify_connection_status_change(connected, hopeless);
    }

    /**
     * Handle reconnect event
     * @returns {Promise<boolean>} Whether reconnect was successful
     * @private
     */
    async _handle_reconnect() {
        console.warn("Reconnected! Checking states");

        if (this.client) {
            await this.client.send("reset_shared_state", {}, { notebook_id: this.notebook_id }, false);
        }

        return true
    }

    /**
     * Update notebook state using a mutate function
     * @param {Function} mutate_fn - Function to mutate the notebook state
     * @returns {Promise<void>}
     * @private
     */
    async _update_notebook_state(mutate_fn) {
        if (!this.notebook_state) return

        const [notebook, changes] = immer.produceWithPatches(this.notebook_state, (notebook) => {
            mutate_fn(notebook);
        });

        if (changes.length === 0) return

        this.pending_local_updates++;

        try {
            // The changes to be sent should already exist locally
            // because patches are going to be diffed against that
            this.notebook_state = notebook;
            const response = await this.client.send("update_notebook", { updates: changes }, { notebook_id: this.notebook_id }, false);

            if (response.message?.response?.update_went_well === "👎") {
                throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
            }
            this.last_update_time = Date.now();
            console.log({ state: notebook });
        } finally {
            this.pending_local_updates--;
        }
    }

    /**
     * Notify update handlers
     * @param {string} event_type - Type of event
     * @param {*} data - Event data
     * @private
     */
    _notify_update(event_type, data) {
        this._update_handlers.forEach((handler) => {
            try {
                handler({ type: event_type, data, timestamp: Date.now(), notebook: this.notebook_state });
            } catch (error) {
                console.error("Error in update handler:", error);
            }
        });
    }

    /**
     * Notify connection status handlers
     * @param {boolean} connected - Whether connection is active
     * @param {boolean} hopeless - Whether connection is hopeless
     * @private
     */
    _notify_connection_status_change(connected, hopeless) {
        this._connection_status_handlers.forEach((handler) => {
            try {
                handler({ connected, hopeless, timestamp: Date.now() });
            } catch (error) {
                console.error("Error in connection status handler:", error);
            }
        });
    }
}

/**
 * Pluto Notebook Parser
 *
 * Parses Pluto notebook (.jl) files and extracts NotebookData structure
 * compatible with the frontend Editor component.
 */

const NOTEBOOK_HEADER = "### A Pluto.jl notebook ###";
const CELL_ID_DELIMITER = "# ╔═╡ ";
const CELL_METADATA_PREFIX = "# ╠═╡ ";
const ORDER_DELIMITER = "# ╠═";
const ORDER_DELIMITER_FOLDED = "# ╟─";
const CELL_SUFFIX = "\n\n";
const DISABLED_PREFIX = "#=╠═╡\n";
const DISABLED_SUFFIX = "\n  ╠═╡ =#";

// Special cell IDs for package info
const PTOML_CELL_ID = "00000000-0000-0000-0000-000000000001";
const MTOML_CELL_ID = "00000000-0000-0000-0000-000000000002";

/**
 * Default cell metadata structure
 */
const DEFAULT_CELL_METADATA = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
};

/**
 * Parse a Pluto notebook file content and return NotebookData structure
 * @param {string} content - The raw content of the .jl notebook file
 * @param {string} [path=""] - The file path for the notebook
 * @returns {Object} NotebookData structure compatible with Pluto frontend
 */
function parseNotebook(content, path = "") {
    const lines = content.split("\n");

    // Validate header
    if (lines[0] !== NOTEBOOK_HEADER) {
        throw new Error("Invalid Pluto notebook file - missing header")
    }

    // Extract version (line 1 starts with "# ")
    const versionLine = lines[1] || "";
    const plutoVersion = versionLine.startsWith("# ") ? versionLine.slice(2) : "unknown";

    // Parse notebook metadata and find first cell delimiter
    const { notebookMetadata, firstCellIndex, hasBindMacro } = parseHeader(lines);

    if (firstCellIndex === -1) {
        throw new Error("No cells found in notebook")
    }

    // Parse cells (this gives us cells in their file order - topological order)
    const { cellInputs, cellResults, topologicalOrder, packageCells } = parseCells(lines, firstCellIndex);

    // Parse cell order (this gives us the display order)
    const cellOrder = parseCellOrder(lines, cellInputs);

    // Generate a notebook ID (in real usage, this would come from the server)
    const notebookId = generateUUID();

    // Create NotebookData structure
    /** @type import("../components/Editor").NotebookData  */
    const notebookData = {
        pluto_version: plutoVersion,
        notebook_id: notebookId,
        path: path,
        shortpath: path.split("/").pop() || "notebook.jl",
        in_temp_dir: false,
        process_status: "no_process",
        last_save_time: Date.now(),
        last_hot_reload_time: 0,
        cell_inputs: cellInputs,
        cell_results: cellResults,
        cell_dependencies: {},
        cell_order: cellOrder,
        cell_execution_order: [],
        published_objects: {},
        bonds: {},
        nbpkg: null,
        metadata: notebookMetadata,
        status_tree: null,
        // Store additional data needed for serialization
        _topological_order: topologicalOrder,
        _has_bind_macro: hasBindMacro,
        _package_cells: packageCells,
    };

    return notebookData
}

/**
 * Parse header section and extract notebook metadata
 * @param {string[]} lines - Array of file lines
 * @returns {Object} Object with notebookMetadata, firstCellIndex, and hasBindMacro
 */
function parseHeader(lines) {
    let notebookMetadata = {};
    let firstCellIndex = -1;
    let hasBindMacro = false;

    // Look for notebook metadata (lines starting with #>) and first cell
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith(CELL_ID_DELIMITER)) {
            firstCellIndex = i;
            break
        }

        // Check if this line mentions @bind (crude check for now)
        if (line.includes("@bind")) {
            hasBindMacro = true;
        }
    }

    // Extract notebook metadata lines (simple approach - could be enhanced)
    const metadataLines = [];
    for (let i = 2; i < (firstCellIndex === -1 ? lines.length : firstCellIndex); i++) {
        const line = lines[i];
        if (line.startsWith("#> ")) {
            metadataLines.push(line.slice(3)); // Remove "#> " prefix
        }
    }

    // Store raw metadata for serialization
    if (metadataLines.length > 0) {
        notebookMetadata._raw_metadata_lines = metadataLines;
    }

    return { notebookMetadata, firstCellIndex, hasBindMacro }
}

/**
 * Create default cell result structure
 * @param {string} cellId - Cell ID
 * @returns {Object} Default cell result object
 */
function createDefaultCellResult(cellId) {
    return {
        cell_id: cellId,
        queued: false,
        running: false,
        errored: false,
        runtime: null,
        downstream_cells_map: {},
        upstream_cells_map: {},
        precedence_heuristic: null,
        depends_on_disabled_cells: false,
        depends_on_skipped_cells: false,
        output: {
            body: "",
            persist_js_state: false,
            last_run_timestamp: 0,
            mime: "text/plain",
            rootassignee: null,
            has_pluto_hook_features: false,
        },
        logs: [],
        published_object_keys: [],
    }
}

/**
 * Parse cell metadata from lines
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Starting index
 * @returns {{metadata: Object, hasExplicitDisabledMetadata: boolean, endIndex: number}}
 */
function parseCellMetadata(lines, startIndex) {
    const metadata = { ...DEFAULT_CELL_METADATA };
    let hasExplicitDisabledMetadata = false;
    let i = startIndex;

    while (i < lines.length && lines[i].startsWith(CELL_METADATA_PREFIX)) {
        const metadataLine = lines[i].slice(CELL_METADATA_PREFIX.length);

        if (metadataLine.includes("disabled = true")) {
            metadata.disabled = true;
            hasExplicitDisabledMetadata = true;
        }
        if (metadataLine.includes("show_logs = false")) {
            metadata.show_logs = false;
        }
        if (metadataLine.includes("skip_as_script = true")) {
            metadata.skip_as_script = true;
        }
        i++;
    }

    return { metadata, hasExplicitDisabledMetadata, endIndex: i }
}

/**
 * Collect lines until the next cell delimiter
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Starting index
 * @returns {{code: string, endIndex: number}}
 */
function collectCellCode(lines, startIndex) {
    const codeLines = [];
    let i = startIndex;

    while (i < lines.length && !lines[i].startsWith(CELL_ID_DELIMITER)) {
        codeLines.push(lines[i]);
        i++;
    }

    let code = codeLines.join("\n");
    if (code.endsWith(CELL_SUFFIX)) {
        code = code.slice(0, -CELL_SUFFIX.length);
    }

    return { code: code.trimEnd(), endIndex: i }
}

/**
 * Parse cells from notebook content
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Index where cells start
 * @returns {Object} Object with cellInputs, cellResults, and topologicalOrder
 */
function parseCells(lines, startIndex) {
    const cellInputs = {};
    const cellResults = {};
    const topologicalOrder = []; // Track the order cells appear in the file
    const packageCells = {}; // Store package management cells separately

    let i = startIndex;

    while (i < lines.length) {
        const line = lines[i];

        // Check for cell order section
        if (line === CELL_ID_DELIMITER + "Cell order:") {
            break
        }

        // Check for cell delimiter
        if (line.startsWith(CELL_ID_DELIMITER)) {
            const cellIdStr = line.slice(CELL_ID_DELIMITER.length);
            i++; // Move past cell delimiter

            // Handle special package cells differently
            if (cellIdStr === PTOML_CELL_ID || cellIdStr === MTOML_CELL_ID) {
                const { code, endIndex } = collectCellCode(lines, i);
                packageCells[cellIdStr] = code;
                i = endIndex;
                continue
            }

            // Parse cell metadata (optional)
            const { metadata, hasExplicitDisabledMetadata, endIndex: metadataEndIndex } = parseCellMetadata(lines, i);
            i = metadataEndIndex;

            // Collect cell code
            const { code: rawCode, endIndex } = collectCellCode(lines, i);
            i = endIndex;

            // Handle disabled cells
            let code = rawCode;
            const trimmedCode = rawCode.trim();
            const isDisabledByWrapper = trimmedCode.startsWith(DISABLED_PREFIX.trim()) && trimmedCode.endsWith(DISABLED_SUFFIX.trim());
            if (isDisabledByWrapper) {
                code = rawCode.slice(rawCode.indexOf(DISABLED_PREFIX.trim()) + DISABLED_PREFIX.length, rawCode.lastIndexOf(DISABLED_SUFFIX.trim()));
                metadata.disabled = true;
                // If there was no explicit disabled metadata, this is an implicit disabled cell
                if (!hasExplicitDisabledMetadata) {
                    metadata._implicit_disabled = true;
                }
            }

            // Create cell input data
            cellInputs[cellIdStr] = {
                cell_id: cellIdStr,
                code: code,
                code_folded: false, // Will be set during order parsing
                metadata: metadata,
            };

            // Create corresponding cell result data
            cellResults[cellIdStr] = createDefaultCellResult(cellIdStr);

            // Track topological order
            topologicalOrder.push(cellIdStr);
        } else {
            i++;
        }
    }

    return { cellInputs, cellResults, topologicalOrder, packageCells }
}

/**
 * Parse cell order from notebook content
 * @param {string[]} lines - Array of file lines
 * @param {Object} cellInputs - Cell inputs map to update folded state
 * @returns {string[]} Array of cell IDs in order
 */
function parseCellOrder(lines, cellInputs) {
    const cellOrder = [];

    // Find cell order section
    let orderStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === CELL_ID_DELIMITER + "Cell order:") {
            orderStartIndex = i + 1;
            break
        }
    }

    if (orderStartIndex === -1) {
        // If no explicit order, use the order cells appeared in file
        return Object.keys(cellInputs)
    }

    // Parse order lines
    for (let i = orderStartIndex; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith(ORDER_DELIMITER) || line.startsWith(ORDER_DELIMITER_FOLDED)) {
            // Extract cell ID (last 36 characters should be the UUID)
            if (line.length >= 36) {
                const cellId = line.slice(-36);

                // Skip special package cells
                if (cellId === PTOML_CELL_ID || cellId === MTOML_CELL_ID) {
                    continue
                }

                // Check if cell exists
                if (cellInputs[cellId]) {
                    // Set folded state
                    cellInputs[cellId].code_folded = line.startsWith(ORDER_DELIMITER_FOLDED);
                    cellOrder.push(cellId);
                }
            }
        }
    }

    return cellOrder
}

/**
 * Generate a simple UUID (not cryptographically secure, for demo purposes)
 * @returns {string} UUID string
 */
function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16)
    })
}

/**
 * Generate @bind macro lines
 * @returns {string[]} Array of lines for the @bind macro
 */
function generateBindMacro() {
    return [
        "",
        "# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).",
        "macro bind(def, element)",
        "    quote",
        '        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end',
        "        local el = $(esc(element))",
        "        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)",
        "        el",
        "    end",
        "end",
    ]
}

/**
 * Serialize cell metadata to lines
 * @param {Object} metadata - Cell metadata object
 * @returns {string[]} Array of metadata lines
 */
function serializeCellMetadata(metadata) {
    const lines = [];

    // Only serialize non-default values
    if (metadata.disabled && !metadata._implicit_disabled) {
        lines.push(CELL_METADATA_PREFIX + "disabled = true");
    }
    if (metadata.show_logs !== undefined && metadata.show_logs !== DEFAULT_CELL_METADATA.show_logs) {
        lines.push(CELL_METADATA_PREFIX + `show_logs = ${metadata.show_logs}`);
    }
    if (metadata.skip_as_script !== undefined && metadata.skip_as_script !== DEFAULT_CELL_METADATA.skip_as_script) {
        lines.push(CELL_METADATA_PREFIX + `skip_as_script = ${metadata.skip_as_script}`);
    }
    return [
        ...lines,
        ...Object.entries(metadata)
            .filter(([name, entry]) => {
                return ["skip_as_script", "show_logs", "disabled"].includes(name)
            })
            .map(([name, entry]) => `${CELL_METADATA_PREFIX}${name} = ${entry}`),
    ]
}

/**
 * Serialize NotebookData back to Pluto notebook file format
 * @param {Object} notebookData - NotebookData structure
 * @returns {string} Notebook file content
 */
function serializeNotebook(notebookData) {
    const lines = [];

    // Header
    lines.push(NOTEBOOK_HEADER);
    lines.push(`# ${notebookData.pluto_version || "v0.20.10"}`);
    lines.push("");

    // Notebook metadata
    if (notebookData.metadata && notebookData.metadata._raw_metadata_lines) {
        for (const metadataLine of notebookData.metadata._raw_metadata_lines) {
            lines.push("#> " + metadataLine);
        }
        lines.push("");
    }

    // Standard imports
    lines.push("using Markdown");
    lines.push("using InteractiveUtils");

    // Add @bind macro if needed
    if (notebookData._has_bind_macro) {
        lines.push(...generateBindMacro());
    }

    lines.push("");

    // Serialize cells in topological order (file order), not display order
    const topologicalOrder = notebookData._topological_order || notebookData.cell_order || [];
    const cellInputs = notebookData.cell_inputs || {};

    for (const cellId of topologicalOrder) {
        const cellInput = cellInputs[cellId];
        if (!cellInput) continue

        // Cell delimiter
        lines.push(CELL_ID_DELIMITER + cellId);

        // Cell metadata (if not default)
        const metadata = cellInput.metadata || {};
        const metadataLines = serializeCellMetadata(metadata);
        lines.push(...metadataLines);

        // Cell code
        let code = cellInput.code || "";

        // Handle disabled cells - only add wrapper if not already present
        if (metadata.disabled && !code.startsWith(DISABLED_PREFIX)) {
            code = DISABLED_PREFIX + code + DISABLED_SUFFIX;
        }

        // Add code and suffix
        lines.push(code);
        lines.push("");
    }

    // Add package cells if they exist
    const packageCells = notebookData._package_cells || {};
    if (packageCells[PTOML_CELL_ID]) {
        lines.push(CELL_ID_DELIMITER + PTOML_CELL_ID);
        lines.push(packageCells[PTOML_CELL_ID]);
        lines.push("");
    }
    if (packageCells[MTOML_CELL_ID]) {
        lines.push(CELL_ID_DELIMITER + MTOML_CELL_ID);
        lines.push(packageCells[MTOML_CELL_ID]);
        lines.push("");
    }

    // Cell order section (display order)
    lines.push(CELL_ID_DELIMITER + "Cell order:");

    const cellOrder = notebookData.cell_order || [];
    for (const cellId of cellOrder) {
        const cellInput = cellInputs[cellId];
        if (!cellInput) continue

        const delimiter = cellInput.code_folded ? ORDER_DELIMITER_FOLDED : ORDER_DELIMITER;
        lines.push(delimiter + cellId);
    }

    // Add package cells to order if they exist
    if (packageCells[PTOML_CELL_ID]) {
        lines.push(ORDER_DELIMITER_FOLDED + PTOML_CELL_ID);
    }
    if (packageCells[MTOML_CELL_ID]) {
        lines.push(ORDER_DELIMITER_FOLDED + MTOML_CELL_ID);
    }

    return lines.join("\n") + "\n"
}

exports.DEFAULT_CELL_METADATA = DEFAULT_CELL_METADATA;
exports.MTOML_CELL_ID = MTOML_CELL_ID;
exports.PTOML_CELL_ID = PTOML_CELL_ID;
exports.Pluto = Pluto;
exports.PlutoNotebook = PlutoNotebook;
exports.parseNotebook = parseNotebook;
exports.serializeNotebook = serializeNotebook;
//# sourceMappingURL=index.js.map
