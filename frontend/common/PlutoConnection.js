import { pack, unpack } from "./MsgPack.js"
import "./Polyfill.js"

const do_next = async (queue) => {
    const next = queue[0]
    await next()
    queue.shift()
    if (queue.length > 0) {
        await do_next(queue)
    }
}

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

const get_unique_short_id = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36)

const socket_is_alright = (socket) => socket.readyState != WebSocket.OPEN && socket.readyState != WebSocket.CONNECTING

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
    try {
        socket.close(1000, "byebye")
    } catch (ex) {}
}

// start_socket_connection(connect_metadata) {
//     return new Promise(async (res) => {
//         const secret = await (
//             await fetch("websocket_url_please", {
//                 method: "GET",
//                 cache: "no-cache",
//                 redirect: "follow",
//                 referrerPolicy: "no-referrer",
//             })
//         ).text()
//         this.psocket = new WebSocket(
//             document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret
//         )
//         this.psocket.onmessage = (e) => {
//             this.task_queue.push(async () => {
//                 await this.handle_message(e)
//             })
//             if (this.task_queue.length == 1) {
//                 do_next(this.task_queue)
//             }
//         }
//         this.psocket.onerror = (e) => {
//             console.error("SOCKET ERROR", new Date().toLocaleTimeString())
//             console.error(e)

//             this.start_waiting_for_connection()
//         }
//         this.psocket.onclose = (e) => {
//             console.warn("SOCKET CLOSED", new Date().toLocaleTimeString())
//             console.log(e)

//             this.start_waiting_for_connection()
//         }
//         this.psocket.onopen = () => {
//             console.log("Socket opened", new Date().toLocaleTimeString())
//             this.send("connect", {}, connect_metadata).then((u) => {
//                 this.plutoENV = u.message.ENV
//                 // TODO: don't check this here
//                 if (connect_metadata.notebook_id && !u.message.notebook_exists) {
//                     // https://github.com/fonsp/Pluto.jl/issues/55
//                     document.location.href = "./"
//                     return
//                 }
//                 this.on_connection_status(true)
//                 res(this)
//             })
//         }
//         console.log("Waiting for socket to open...")
//     })
// }

const MSG_DELIM = new TextEncoder().encode("IUUQ.km jt ejggjdvmu vhi")





const create_ws_connection = (address, { on_message, on_socket_failure }) => {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(address)

        const send_encoded = (message) => {
            const encoded = pack(message)
            const to_send = new Uint8Array(encoded.length + MSG_DELIM.length)
            to_send.set(encoded, 0)
            to_send.set(MSG_DELIM, encoded.length)
            socket.send(to_send)
        }

        socket.onmessage = async (event) => {
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
        }
        socket.onerror = socket.onclose = async (e) => {
            console.error(`SOCKET DID AN OOPSIE - ${e.type}`, new Date().toLocaleTimeString())
            console.error(e)

            if (!(await socket_is_alright_with_grace_period(socket))) {
                on_socket_failure()
                try_close_socket_connection(socket)
                
                reject(e) // if it has not openened yet
            } else {
                console.log("The socket somehow recovered from an error! Onbegrijpelijk")
            }
        }
        socket.onopen = () => {
            console.log("Socket opened", new Date().toLocaleTimeString())
            resolve({
                socket: socket,
                send: send_encoded,
            })
        }
        console.log("Waiting for socket to open...")
    })
}







const pluto_connection = async ({on_unrequested_update, on_reconnect, on_connection_status}) => {
    const secret = await (
        await fetch("websocket_url_please", {
            method: "GET",
            cache: "no-cache",
            redirect: "follow",
            referrerPolicy: "no-referrer",
        })
    ).text()
    const websocket_address =
        document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret

    var ws_connection = null // will be defined later i promise

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
     *
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
        ws_connection = await create_ws_connection(websocket_address, {
            on_message: handle_update,
            on_socket_failure: () => {
                on_connection_status(false)

                connect() // reconnect!

                const accept = on_reconnect()
                on_connection_status(accept)
                if(!accept) {
                    alert("Connection out of sync 😥\n\nRefresh the page to continue")
                }
            }
        })
        ws_connection.send()
    }

    await connect()
}



// const pluto_connection = async () => {
//     const secret = await (
//         await fetch("websocket_url_please", {
//             method: "GET",
//             cache: "no-cache",
//             redirect: "follow",
//             referrerPolicy: "no-referrer",
//         })
//     ).text()
//     const websocket_address =
//         document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret

//     const client_id = get_unique_short_id()
//     const sent_requests = {}

//     const create_ws = (address, { on_unrequested_update, on_socket_failure }) => {
//         return new Promise((resolve_socket, reject_socket) => {

//             const socket = new WebSocket(address)

//             socket.onmessage = async (event) => {
//                 try {
//                     const buffer = await event.data.arrayBuffer()
//                     const buffer_sliced = buffer.slice(0, buffer.byteLength - MSG_DELIM.length)
//                     const update = unpack(new Uint8Array(buffer_sliced))

//                     const by_me = "initiator_id" in update && update.initiator_id == client_id
//                     const request_id = update.request_id

//                     if (by_me && request_id) {
//                         const request = sent_requests[request_id]
//                         if (request) {
//                             request(update)
//                             delete sent_requests[request_id]
//                             return
//                         }
//                     }
//                     on_unrequested_update(update, by_me)
//                 } catch (ex) {
//                     console.error("Failed to process update!", ex)
//                     console.log(event)

//                     alert(
//                         `Something went wrong!\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${ex}\n\n${event}`
//                     )
//                 }
//             }
//             socket.onerror = socket.onclose = async (e) => {
//                 console.error(`SOCKET DID AN OOPSIE - ${e.type}`, new Date().toLocaleTimeString())
//                 console.error(e)

//                 if (!(await socket_is_alright_with_grace_period(socket))) {
//                     on_socket_failure()
//                     try_close_socket_connection(socket)
                    
//                     reject_socket(e) // if it has not openened yet
//                 } else {
//                     console.log("The socket somehow recovered from an error! Onbegrijpelijk")
//                 }
//             }
//             socket.onopen = () => {
//                 console.log("Socket opened", new Date().toLocaleTimeString())
//                 resolve_socket(socket)
//             }
//             console.log("Waiting for socket to open...")
//         })
//     }

//     var psocket = null
//     const re
// }

const ping = async (address = "ping") => {
    const response = await fetch(address, {
        method: "GET",
        cache: "no-cache",
        redirect: "follow",
        referrerPolicy: "no-referrer",
    })
    if (response.status === 200) {
        return response
    } else {
        throw response
    }
}

export class PlutoConnection {
    start_waiting_for_connection() {
        if (!socket_is_alright(this.psocket)) {
            setTimeout(() => {
                if (!socket_is_alright(this.psocket)) {
                    // check twice with a 1sec interval because sometimes it just complains for a short while

                    const start_reconnecting = () => {
                        this.on_connection_status(false)
                        this.try_close_socket_connection()
                        // TODO
                    }

                    this.ping()
                        .then(() => {
                            if (this.psocket.readyState !== WebSocket.OPEN) {
                                start_reconnecting()
                            }
                        })
                        .catch(() => {
                            console.error("Ping failed")
                            start_reconnecting()
                        })
                }
            }, 1000)
        }
    }

    /**
     *
     * @param {string} message_type
     * @param {Object} body
     * @param {{notebook_id?: string, cell_id?: string}} metadata
     * @param {boolean} create_promise If true, returns a Promise that resolves with the server response. If false, the response will go through the on_update method of this instance.
     * @returns {(undefined|Promise<Object>)}
     */
    send(message_type, body = {}, metadata = {}, create_promise = true) {
        const request_id = get_unique_short_id()

        const message = {
            type: message_type,
            client_id: this.client_id,
            request_id: request_id,
            body: body,
            ...metadata,
        }

        var p = undefined

        if (create_promise) {
            const rp = resolvable_promise()
            p = rp.current

            this.sent_requests[request_id] = rp.resolve
        }

        const encoded = pack(message)
        const to_send = new Uint8Array(encoded.length + MSG_DELIM.length)
        to_send.set(encoded, 0)
        to_send.set(MSG_DELIM, encoded.length)
        this.psocket.send(to_send)

        return p
    }

    async handle_message(event) {
        try {
            const buffer = await event.data.arrayBuffer()
            const buffer_sliced = buffer.slice(0, buffer.byteLength - this.MSG_DELIM.length)
            const update = unpack(new Uint8Array(buffer_sliced))
            const by_me = "initiator_id" in update && update.initiator_id == this.client_id
            const request_id = update.request_id

            if (by_me && request_id) {
                const request = this.sent_requests[request_id]
                if (request) {
                    request(update)
                    delete this.sent_requests[request_id]
                    return
                }
            }
            this.on_update(update, by_me)
        } catch (ex) {
            console.error("Failed to process update!", ex)
            console.log(event)

            alert(
                `Something went wrong!\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${ex}\n\n${event}`
            )
        }
    }

    start_socket_connection(connect_metadata) {
        return new Promise(async (res) => {
            const secret = await (
                await fetch("websocket_url_please", {
                    method: "GET",
                    cache: "no-cache",
                    redirect: "follow",
                    referrerPolicy: "no-referrer",
                })
            ).text()
            this.psocket = new WebSocket(
                document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret
            )
            this.psocket.onmessage = (e) => {
                this.task_queue.push(async () => {
                    await this.handle_message(e)
                })
                if (this.task_queue.length == 1) {
                    do_next(this.task_queue)
                }
            }
            this.psocket.onerror = (e) => {
                console.error("SOCKET ERROR", new Date().toLocaleTimeString())
                console.error(e)

                this.start_waiting_for_connection()
            }
            this.psocket.onclose = (e) => {
                console.warn("SOCKET CLOSED", new Date().toLocaleTimeString())
                console.log(e)

                this.start_waiting_for_connection()
            }
            this.psocket.onopen = () => {
                console.log("Socket opened", new Date().toLocaleTimeString())
                this.send("connect", {}, connect_metadata).then((u) => {
                    this.plutoENV = u.message.ENV
                    // TODO: don't check this here
                    if (connect_metadata.notebook_id && !u.message.notebook_exists) {
                        // https://github.com/fonsp/Pluto.jl/issues/55
                        document.location.href = "./"
                        return
                    }
                    this.on_connection_status(true)
                    res(this)
                })
            }
            console.log("Waiting for socket to open...")
        })
    }

    try_close_socket_connection() {
        this.psocket.close(1000, "byebye")
    }

    initialize(on_establish_connection, connect_metadata = {}) {
        this.psocket = create_ws()
        this.ping()
            .then(async () => {
                await this.start_socket_connection(connect_metadata)
                on_establish_connection(this)
            })
            .catch(() => {
                this.on_connection_status(false)
            })

        window.addEventListener("beforeunload", (e) => {
            console.warn("unloading 👉 disconnecting websocket")
            this.psocket.onclose = undefined
            this.try_close_socket_connection()
        })
    }

    constructor(on_update, on_connection_status) {
        this.on_update = on_update
        this.on_connection_status = on_connection_status

        this.task_queue = []
        this.psocket = null
        this.pluto_version = "unknown"
        this.julia_version = "unknown"
    }

    fetch_pluto_versions() {
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

        const pluto_promise = this.send("get_version").then((u) => {
            this.pluto_version = u.message.pluto
            this.julia_version = u.message.julia
            return this.pluto_version
        })

        return Promise.all([github_promise, pluto_promise])
    }
}

// export class PlutoConnection {
//     async ping() {
//         const response = await (
//             await fetch("ping", {
//                 method: "GET",
//                 cache: "no-cache",
//                 redirect: "follow",
//                 referrerPolicy: "no-referrer",
//             })
//         ).text()
//         if (response == "OK!") {
//             return response
//         } else {
//             throw response
//         }
//     }

//     start_waiting_for_connection() {
//         if (!socket_is_alright(this.psocket)) {
//             setTimeout(() => {
//                 if (!socket_is_alright(this.psocket)) {
//                     // check twice with a 1sec interval because sometimes it just complains for a short while

//                     const start_reconnecting = () => {
//                         this.on_connection_status(false)
//                         this.try_close_socket_connection()
//                         // TODO
//                     }

//                     this.ping()
//                         .then(() => {
//                             if (this.psocket.readyState !== WebSocket.OPEN) {
//                                 start_reconnecting()
//                             }
//                         })
//                         .catch(() => {
//                             console.error("Ping failed")
//                             start_reconnecting()
//                         })
//                 }
//             }, 1000)
//         }
//     }

//     /**
//      *
//      * @param {string} message_type
//      * @param {Object} body
//      * @param {{notebook_id?: string, cell_id?: string}} metadata
//      * @param {boolean} create_promise If true, returns a Promise that resolves with the server response. If false, the response will go through the on_update method of this instance.
//      * @returns {(undefined|Promise<Object>)}
//      */
//     send(message_type, body = {}, metadata = {}, create_promise = true) {
//         const request_id = get_unique_short_id()

//         const message = {
//             type: message_type,
//             client_id: this.client_id,
//             request_id: request_id,
//             body: body,
//             ...metadata,
//         }

//         var p = undefined

//         if (create_promise) {
//             const rp = resolvable_promise()
//             p = rp.current

//             this.sent_requests[request_id] = rp.resolve
//         }

//         const encoded = pack(message)
//         const to_send = new Uint8Array(encoded.length + this.MSG_DELIM.length)
//         to_send.set(encoded, 0)
//         to_send.set(this.MSG_DELIM, encoded.length)
//         this.psocket.send(to_send)

//         return p
//     }

//     async handle_message(event) {
//         try {
//             const buffer = await event.data.arrayBuffer()
//             const buffer_sliced = buffer.slice(0, buffer.byteLength - this.MSG_DELIM.length)
//             const update = unpack(new Uint8Array(buffer_sliced))
//             const by_me = "initiator_id" in update && update.initiator_id == this.client_id
//             const request_id = update.request_id

//             if (by_me && request_id) {
//                 const request = this.sent_requests[request_id]
//                 if (request) {
//                     request(update)
//                     delete this.sent_requests[request_id]
//                     return
//                 }
//             }
//             this.on_update(update, by_me)
//         } catch (ex) {
//             console.error("Failed to process update!", ex)
//             console.log(event)

//             alert(
//                 `Something went wrong!\n\nPlease open an issue on https://github.com/fonsp/Pluto.jl with this info:\n\nFailed to process update\n${ex}\n\n${event}`
//             )
//         }
//     }

//     start_socket_connection(connect_metadata) {
//         return new Promise(async (res) => {
//             const secret = await (
//                 await fetch("websocket_url_please", {
//                     method: "GET",
//                     cache: "no-cache",
//                     redirect: "follow",
//                     referrerPolicy: "no-referrer",
//                 })
//             ).text()
//             this.psocket = new WebSocket(
//                 document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/") + secret
//             )
//             this.psocket.onmessage = (e) => {
//                 this.task_queue.push(async () => {
//                     await this.handle_message(e)
//                 })
//                 if (this.task_queue.length == 1) {
//                     do_next(this.task_queue)
//                 }
//             }
//             this.psocket.onerror = (e) => {
//                 console.error("SOCKET ERROR", new Date().toLocaleTimeString())
//                 console.error(e)

//                 this.start_waiting_for_connection()
//             }
//             this.psocket.onclose = (e) => {
//                 console.warn("SOCKET CLOSED", new Date().toLocaleTimeString())
//                 console.log(e)

//                 this.start_waiting_for_connection()
//             }
//             this.psocket.onopen = () => {
//                 console.log("Socket opened", new Date().toLocaleTimeString())
//                 this.send("connect", {}, connect_metadata).then((u) => {
//                     this.plutoENV = u.message.ENV
//                     // TODO: don't check this here
//                     if (connect_metadata.notebook_id && !u.message.notebook_exists) {
//                         // https://github.com/fonsp/Pluto.jl/issues/55
//                         document.location.href = "./"
//                         return
//                     }
//                     this.on_connection_status(true)
//                     res(this)
//                 })
//             }
//             console.log("Waiting for socket to open...")
//         })
//     }

//     try_close_socket_connection() {
//         this.psocket.close(1000, "byebye")
//     }

//     initialize(on_establish_connection, connect_metadata = {}) {
//         this.ping()
//             .then(async () => {
//                 await this.start_socket_connection(connect_metadata)
//                 on_establish_connection(this)
//             })
//             .catch(() => {
//                 this.on_connection_status(false)
//             })

//         window.addEventListener("beforeunload", (e) => {
//             console.warn("unloading 👉 disconnecting websocket")
//             this.psocket.onclose = undefined
//             this.try_close_socket_connection()
//         })
//     }

//     constructor(on_update, on_connection_status) {
//         this.on_update = on_update
//         this.on_connection_status = on_connection_status

//         this.task_queue = []
//         this.psocket = null
//         this.MSG_DELIM = new TextEncoder().encode("IUUQ.km jt ejggjdvmu vhi")
//         this.client_id = get_unique_short_id()
//         this.sent_requests = {}
//         this.pluto_version = "unknown"
//         this.julia_version = "unknown"
//     }

//     fetch_pluto_versions() {
//         const github_promise = fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
//             method: "GET",
//             mode: "cors",
//             cache: "no-cache",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             redirect: "follow",
//             referrerPolicy: "no-referrer",
//         })
//             .then((response) => {
//                 return response.json()
//             })
//             .then((response) => {
//                 return response[0].tag_name
//             })

//         const pluto_promise = this.send("get_version").then((u) => {
//             this.pluto_version = u.message.pluto
//             this.julia_version = u.message.julia
//             return this.pluto_version
//         })

//         return Promise.all([github_promise, pluto_promise])
//     }

//     // TODO: reconnect with a delay if the last request went poorly
//     // this would avoid hanging UI when the connection is lost maybe?
// }
