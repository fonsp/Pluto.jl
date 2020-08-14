import { pack, unpack } from "./MsgPack.js"

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

export class PlutoConnection {
    async ping() {
        const response = await (
            await fetch("ping", {
                method: "GET",
                cache: "no-cache",
                redirect: "follow",
                referrerPolicy: "no-referrer",
            })
        ).text()
        if (response == "OK!") {
            return response
        } else {
            throw response
        }
    }

    wait_for_online() {
        this.on_connection_status(false)

        setTimeout(() => {
            this.ping()
                .then(() => {
                    if (this.psocket.readyState !== WebSocket.OPEN) {
                        this.wait_for_online()
                    } else {
                        this.on_connection_status(true)
                    }
                })
                .catch(() => {
                    this.wait_for_online()
                })
        }, 1000)
    }

    get_short_unqiue_id() {
        return crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
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
        const request_id = this.get_short_unqiue_id()

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
        const to_send = new Uint8Array(encoded.length + this.MSG_DELIM.length)
        to_send.set(encoded, 0)
        to_send.set(this.MSG_DELIM, encoded.length)
        this.psocket.send(to_send)

        return p
    }

    async handle_message(event) {
        try {
            const buffer = await new Response(event.data).arrayBuffer()
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
            if (update.type === "reload") {
                document.location = document.location
            }
            this.on_update(update, by_me)
        } catch (ex) {
            console.error("Failed to get update!", ex)
            console.log(event)

            this.wait_for_online()
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
                console.error("SOCKET ERROR", e)

                if (this.psocket.readyState != WebSocket.OPEN && this.psocket.readyState != WebSocket.CONNECTING) {
                    this.wait_for_online()
                    setTimeout(() => {
                        if (this.psocket.readyState != WebSocket.OPEN) {
                            this.try_close_socket_connection()

                            res(this.start_socket_connection(connect_metadata))
                        }
                    }, 500)
                }
            }
            this.psocket.onclose = (e) => {
                console.warn("SOCKET CLOSED")
                console.log(e)

                this.wait_for_online()
            }
            this.psocket.onopen = () => {
                console.log("socket opened")
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
            console.log("waiting...")
        })
    }

    try_close_socket_connection() {
        this.psocket.close(1000, "byebye")
    }

    initialize(on_establish_connection, connect_metadata = {}) {
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
        this.MSG_DELIM = new TextEncoder().encode("IUUQ.km jt ejggjdvmu vhi")
        this.client_id = this.get_short_unqiue_id()
        this.sent_requests = {}
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

    // TODO: reconnect with a delay if the last request went poorly
    // this would avoid hanging UI when the connection is lost maybe?
}
