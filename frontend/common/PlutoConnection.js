import { Promises } from "../common/SetupCellEnvironment.js"
import { pack, unpack } from "./MsgPack.js"
import "./Polyfill.js"

// https://github.com/denysdovhan/wtfjs/issues/61
const different_Infinity_because_js_is_yuck = 2147483646

const reconnect_after_close_delay = 500
const retry_after_connect_failure_delay = 5000

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
export const timeout_promise = (promise, time_ms) =>
    Promise.race([
        promise,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("Promise timed out."))
            }, time_ms)
        }),
    ])

/**
 * Keep calling @see f until it resolves, with a delay before each try.
 * @param {Function} f Function that returns a promise
 * @param {Number} time_ms Timeout for each call to @see f
 */
const retry_until_resolved = (f, time_ms) =>
    timeout_promise(f(), time_ms).catch((e) => {
        console.error(e)
        console.error("godverdomme")
        return retry_until_resolved(f, time_ms)
    })

/**
 * @template T
 * @returns {{current: Promise<T>, resolve: (value: T) => void, reject: (error: any) => void }}
 */
export const resolvable_promise = () => {
    let resolve = () => {}
    let reject = () => {}
    const p = new Promise((_resolve, _reject) => {
        //@ts-ignore
        resolve = _resolve
        reject = _reject
    })
    return {
        current: p,
        resolve: resolve,
        reject: reject,
    }
}

/**
 * @returns {string}
 */
const get_unique_short_id = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36)

const socket_is_alright = (socket) => socket.readyState == WebSocket.OPEN || socket.readyState == WebSocket.CONNECTING

const socket_is_alright_with_grace_period = (socket) =>
    new Promise((res) => {
        if (socket_is_alright(socket)) {
            res(true)
        } else {
            setTimeout(() => {
                res(socket_is_alright(socket))
            }, 1000)
        }
    })

const try_close_socket_connection = (socket) => {
    socket.onopen = () => {
        try_close_socket_connection(socket)
    }
    socket.onmessage = socket.onclose = socket.onerror = undefined
    try {
        socket.close(1000, "byebye")
    } catch (ex) {}
}

/**
 * Open a 'raw' websocket connection to an API with MessagePack serialization. The method is asynchonous, and resolves to a @see WebsocketConnection when the connection is established.
 * @typedef {{socket: WebSocket, send: Function}} WebsocketConnection
 * @param {string} address The WebSocket URL
 * @param {{on_message: Function, on_socket_close:Function}} callbacks
 * @return {Promise<WebsocketConnection>}
 */
const create_ws_connection = (address, { on_message, on_socket_close }, timeout_ms = 30 * 1000) => {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(address)

        var has_been_open = false

        const timeout_handle = setTimeout(() => {
            console.warn("Creating websocket timed out", new Date().toLocaleTimeString())
            try_close_socket_connection(socket)
            reject("Socket timeout")
        }, timeout_ms)

        const send_encoded = (message) => {
            const encoded = pack(message)
            socket.send(encoded)
        }

        let last_task = Promise.resolve()
        socket.onmessage = (event) => {
            // we read and deserialize the incoming messages asynchronously
            // they arrive in order (WS guarantees this), i.e. this socket.onmessage event gets fired with the message events in the right order
            // but some message are read and deserialized much faster than others, because of varying sizes, so _after_ async read & deserialization, messages are no longer guaranteed to be in order
            //
            // the solution is a task queue, where each task includes the deserialization and the update handler
            last_task = last_task.then(async () => {
                try {
                    const buffer = await event.data.arrayBuffer()
                    const message = unpack(new Uint8Array(buffer))

                    try {
                        on_message(message)
                    } catch (process_err) {
                        console.error("Failed to process message from websocket", process_err, { message })
                        // prettier-ignore
                        alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${process_err.message}\n\n${JSON.stringify(event)}`)
                    }
                } catch (unpack_err) {
                    console.error("Failed to unpack message from websocket", unpack_err, { event })

                    // prettier-ignore
                    alert(`Something went wrong! You might need to refresh the page.\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to unpack message\n${unpack_err}\n\n${JSON.stringify(event)}`)
                }
            })
        }

        socket.onerror = async (e) => {
            console.error(`Socket did an oopsie - ${e.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e)

            if (await socket_is_alright_with_grace_period(socket)) {
                console.log("The socket somehow recovered from an error?! Onbegrijpelijk")
                console.log(socket)
                console.log(socket.readyState)
            } else {
                if (has_been_open) {
                    on_socket_close()
                    try_close_socket_connection(socket)
                } else {
                    reject(e)
                }
            }
        }
        socket.onclose = async (e) => {
            console.error(`Socket did an oopsie - ${e.type}`, new Date().toLocaleTimeString(), "was open:", has_been_open, e)

            if (has_been_open) {
                on_socket_close()
                try_close_socket_connection(socket)
            } else {
                reject(e)
            }
        }
        socket.onopen = () => {
            console.log("Socket opened", new Date().toLocaleTimeString())
            clearInterval(timeout_handle)
            has_been_open = true
            resolve({
                socket: socket,
                send: send_encoded,
            })
        }
        console.log("Waiting for socket to open...", new Date().toLocaleTimeString())
    })
}

export const ws_address_from_base = (base_url) => {
    const ws_url = new URL("./", base_url)
    ws_url.protocol = ws_url.protocol.replace("http", "ws")
    return String(ws_url)
}

const default_ws_address = () => ws_address_from_base(window.location.href)

/**
 * @typedef PlutoConnection
 * @type {{
 *  session_options: Object,
 *  send: () => void,
 *  kill: () => void,
 *  version_info: {
 *      julia: string,
 *      pluto: string,
 *  },
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
 *  on_reconnect: () => boolean,
 *  on_connection_status: (connection_status: boolean) => void,
 *  connect_metadata?: Object,
 *  ws_address?: String,
 * }} options
 * @return {Promise<PlutoConnection>}
 */
export const create_pluto_connection = async ({
    on_unrequested_update,
    on_reconnect,
    on_connection_status,
    connect_metadata = {},
    ws_address = default_ws_address(),
}) => {
    var ws_connection = null // will be defined later i promise
    const client = {
        send: null,
        kill: null,
        session_options: null,
        version_info: {
            julia: "unknown",
            pluto: "unknown",
        },
    } // same

    const client_id = get_unique_short_id()
    const sent_requests = {}

    /**
     * Send a message to the Pluto backend, and return a promise that resolves when the backend sends a response. Not all messages receive a response.
     * @param {string} message_type
     * @param {Object} body
     * @param {{notebook_id?: string, cell_id?: string}} metadata
     * @param {boolean} no_broadcast if false, the message will be emitteed to on_update
     * @returns {(undefined|Promise<Object>)}
     */
    const send = (message_type, body = {}, metadata = {}, no_broadcast = true) => {
        const request_id = get_unique_short_id()

        const message = {
            type: message_type,
            client_id: client_id,
            request_id: request_id,
            body: body,
            ...metadata,
        }

        var p = resolvable_promise()

        sent_requests[request_id] = (response_message) => {
            p.resolve(response_message)
            if (no_broadcast === false) {
                on_unrequested_update(response_message, true)
            }
        }

        ws_connection.send(message)
        return p.current
    }
    client.send = send

    const connect = async () => {
        let update_url_with_binder_token = async () => {
            try {
                const url = new URL(window.location.href)
                const response = await fetch("possible_binder_token_please")
                if (!response.ok) {
                    return
                }
                const possible_binder_token = await response.text()
                if (possible_binder_token !== "" && url.searchParams.get("token") !== possible_binder_token) {
                    url.searchParams.set("token", possible_binder_token)
                    history.replaceState({}, "", url.toString())
                }
            } catch (error) {
                console.warn("Error while setting binder url:", error)
            }
        }
        update_url_with_binder_token()

        try {
            ws_connection = await create_ws_connection(String(ws_address), {
                on_message: (update) => {
                    const by_me = update.initiator_id == client_id
                    const request_id = update.request_id

                    if (by_me && request_id) {
                        const request = sent_requests[request_id]
                        if (request) {
                            request(update)
                            delete sent_requests[request_id]
                            return
                        }
                    }
                    on_unrequested_update(update, by_me)
                },
                on_socket_close: async () => {
                    on_connection_status(false)

                    console.log(`Starting new websocket`, new Date().toLocaleTimeString())
                    await Promises.delay(reconnect_after_close_delay)
                    await connect() // reconnect!

                    console.log(`Starting state sync`, new Date().toLocaleTimeString())
                    const accept = on_reconnect()
                    console.log(`State sync ${accept ? "" : "not "}successful`, new Date().toLocaleTimeString())
                    on_connection_status(accept)
                    if (!accept) {
                        alert("Connection out of sync 😥\n\nRefresh the page to continue")
                    }
                },
            })

            // let's say hello
            console.log("Hello?")
            const u = await send("connect", {}, connect_metadata)
            console.log("Hello!")
            client.session_options = u.message.options
            client.version_info = u.message.version_info

            console.log(client)

            if (connect_metadata.notebook_id != null && !u.message.notebook_exists) {
                // https://github.com/fonsp/Pluto.jl/issues/55
                if (confirm("A new server was started - this notebook session is no longer running.\n\nWould you like to go back to the main menu?")) {
                    window.location.href = "./"
                }
                on_connection_status(false)
                return {}
            }
            on_connection_status(true)

            const ping = () => {
                send("ping", {}, {})
                    .then(() => {
                        // Ping faster than timeout?
                        setTimeout(ping, 28 * 1000)
                    })
                    .catch()
            }
            ping()

            return u.message
        } catch (ex) {
            console.error("connect() failed", ex)
            await Promises.delay(retry_after_connect_failure_delay)
            return await connect()
        }
    }
    await connect()

    return client
}

export const fetch_latest_pluto_version = async () => {
    let response = await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    })
    let json = await response.json()
    return json[0].tag_name
}
