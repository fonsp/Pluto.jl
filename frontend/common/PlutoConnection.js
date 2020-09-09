import { pack, unpack } from "./MsgPack.js"
import "./Polyfill.js"

// https://github.com/denysdovhan/wtfjs/issues/61
const different_Infinity_because_js_is_yuck = 2147483646

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
        new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error("Promise timed out."))
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
 * @returns {{current: Promise<any>, resolve: Function}}
 */
export const resolvable_promise = () => {
    let resolve = () => {}
    const p = new Promise((r) => {
        resolve = r
    })
    return {
        current: p,
        resolve: resolve,
    }
}

const do_all = async (queue) => {
    const next = queue[0]
    await next()
    queue.shift()
    if (queue.length > 0) {
        await do_all(queue)
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
 * We append this after every message to say that the message is complete. This is necessary for sending WS messages larger than 1MB or something, since HTTP.jl splits those into multiple messages :(
 */
const MSG_DELIM = new TextEncoder().encode("IUUQ.km jt ejggjdvmu vhi")

/**
 * Open a 'raw' websocket connection to an API with MessagePack serialization. The method is asynchonous, and resolves to a @see WebsocketConnection when the connection is established.
 * @typedef {{socket: WebSocket, send: Function, kill: Function}} WebsocketConnection
 * @param {string} address The WebSocket URL
 * @param {{on_message: Function, on_socket_close:Function}} callbacks
 * @return {Promise<WebsocketConnection>}
 */
const create_ws_connection = (address, { on_message, on_socket_close }, timeout_ms = 60000) => {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(address)
        const task_queue = []

        var has_been_open = false

        const timeout_handle = setTimeout(() => {
            console.warn("Creating websocket timed out", new Date().toLocaleTimeString())
            try_close_socket_connection(socket)
            reject("Socket timeout")
        }, timeout_ms)

        const send_encoded = (message) => {
            const encoded = pack(message)
            const to_send = new Uint8Array(encoded.length + MSG_DELIM.length)
            to_send.set(encoded, 0)
            to_send.set(MSG_DELIM, encoded.length)
            socket.send(to_send)
        }
        socket.onmessage = (event) => {
            // we read and deserialize the incoming messages asynchronously
            // they arrive in order (WS guarantees this), i.e. this socket.onmessage event gets fired with the message events in the right order
            // but some message are read and deserialized much faster than others, because of varying sizes, so _after_ async read & deserialization, messages are no longer guaranteed to be in order
            //
            // the solution is a task queue, where each task includes the deserialization and the update handler
            task_queue.push(async () => {
                try {
                    const buffer = await event.data.arrayBuffer()
                    const buffer_sliced = buffer.slice(0, buffer.byteLength - MSG_DELIM.length)
                    const update = unpack(new Uint8Array(buffer_sliced))

                    on_message(update)
                } catch (ex) {
                    console.error("Failed to process update!", ex)
                    console.log(event)

                    alert(
                        `Something went wrong!\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${ex}\n\n${event}`
                    )
                }
            })
            if (task_queue.length == 1) {
                do_all(task_queue)
            }
        }
        socket.onerror = async (e) => {
            console.error(`SOCKET DID AN OOPSIE - ${e.type}`, new Date().toLocaleTimeString())
            console.error(e)

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
            console.error(`SOCKET DID AN OOPSIE - ${e.type}`, new Date().toLocaleTimeString())
            console.error(e)
            console.assert(has_been_open)

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
                kill: () => {
                    socket.onclose = undefined
                    try_close_socket_connection(socket)
                },
            })
        }
        console.log("Waiting for socket to open...", new Date().toLocaleTimeString())
    })
}

/**
 * Open a connection with Pluto, that supports a question-response mechanism. The method is asynchonous, and resolves to a @see PlutoConnection when the connection is established.
 *
 * The server can also send messages to all clients, without being requested by them. These end up in the @see on_unrequested_update callback.
 *
 * @typedef {{plutoENV: Object, send: Function, kill: Function, pluto_version: String, julia_version: String, secret: String}} PlutoConnection
 * @param {{on_unrequested_update: Function, on_reconnect: Function, on_connection_status: Function, connect_metadata?: Object}} callbacks
 * @return {Promise<PlutoConnection>}
 */
export const create_pluto_connection = async ({ on_unrequested_update, on_reconnect, on_connection_status, connect_metadata = {} }) => {
    var ws_connection = null // will be defined later i promise
    const client = {
        send: null,
        kill: null,
        plutoENV: null,
        secret: null,
        pluto_version: "unknown",
        julia_version: "unknown",
    } // same

    const client_id = get_unique_short_id()
    const sent_requests = {}

    const handle_update = (update) => {
        const by_me = "initiator_id" in update && update.initiator_id == client_id
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
    }

    /**
     * Send a message to the Pluto backend, and return a promise that resolves when the backend sends a response. Not all messages receive a response.
     * @param {string} message_type
     * @param {Object} body
     * @param {{notebook_id?: string, cell_id?: string}} metadata
     * @param {boolean} create_promise If true, returns a Promise that resolves with the server response. If false, the response will go through the on_update method of this instance.
     * @returns {(undefined|Promise<Object>)}
     */
    const send = (message_type, body = {}, metadata = {}, create_promise = true) => {
        const request_id = get_unique_short_id()

        const message = {
            type: message_type,
            client_id: client_id,
            request_id: request_id,
            body: body,
            ...metadata,
        }

        var p = undefined

        if (create_promise) {
            const rp = resolvable_promise()
            p = rp.current

            sent_requests[request_id] = rp.resolve
        }

        ws_connection.send(message)
        return p
    }

    const connect = async () => {
        const secret = await (
            await fetch("websocket_url_please", {
                method: "GET",
                cache: "no-cache",
                redirect: "follow",
                referrerPolicy: "no-referrer",
            })
        ).text()
        client.secret = secret
        const ws_address =
            document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret

        try {
            ws_connection = await create_ws_connection(
                ws_address,
                {
                    on_message: handle_update,
                    on_socket_close: async () => {
                        on_connection_status(false)

                        console.log(`Starting new websocket`, new Date().toLocaleTimeString())
                        await connect() // reconnect!

                        console.log(`Starting state sync`, new Date().toLocaleTimeString())
                        const accept = on_reconnect()
                        console.log(`State sync ${accept ? "" : "not "}succesful`, new Date().toLocaleTimeString())
                        on_connection_status(accept)
                        if (!accept) {
                            alert("Connection out of sync 😥\n\nRefresh the page to continue")
                        }
                    },
                },
                10000
            )

            console.log(ws_connection)

            // let's say hello
            console.log("Hello?")
            const u = await send("connect", {}, connect_metadata)
            console.log("Hello!")
            client.plutoENV = u.message.ENV

            if (connect_metadata.notebook_id != null && !u.message.notebook_exists) {
                // https://github.com/fonsp/Pluto.jl/issues/55
                if (confirm("A new server was started - this notebook session is no longer running.\n\nWould you like to go back to the main menu?")) {
                    document.location.href = "./"
                }
                on_connection_status(false)
                return {}
            }
            on_connection_status(true)

            return u.message
        } catch (ex) {
            console.error("connect() failed")
            console.error(ex)
            return await connect()
        }
    }
    await connect()

    client.send = send
    client.kill = ws_connection.kill

    return client
}

export const fetch_pluto_versions = (client) => {
    const github_promise = fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    })
        .then((response) => {
            return response.json()
        })
        .then((response) => {
            return response[0].tag_name
        })

    const pluto_promise = client.send("get_version").then((u) => {
        client.pluto_version = u.message.pluto
        client.julia_version = u.message.julia
        return client.pluto_version
    })

    return Promise.all([github_promise, pluto_promise])
}
