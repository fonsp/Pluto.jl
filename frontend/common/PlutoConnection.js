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
    ping(on_success, onFailure) {
        fetch("ping", {
            method: "GET",
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
                if (response == "OK!") {
                    on_success(response)
                } else {
                    onFailure(response)
                }
            })
            .catch(onFailure)
    }

    wait_for_online() {
        this.on_connection_status(false)

        setTimeout(() => {
            this.ping(
                () => {
                    if (this.psocket.readyState !== WebSocket.OPEN) {
                        this.wait_for_online()
                    } else {
                        this.on_connection_status(true)
                    }
                },
                () => {
                    this.wait_for_online()
                }
            )
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

        var toSend = {
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

        this.psocket.send(JSON.stringify(toSend) + this.MSG_DELIM)

        return p
    }

    async handle_message(event) {
        try {
            const update = await event.data.text().then(JSON.parse)
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

    start_socket_connection(on_success, connect_metadata) {
        this.psocket = new WebSocket(
            document.location.protocol.replace("http", "ws") + "//" + document.location.host + document.location.pathname.replace("/edit", "/")
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

                        this.start_socket_connection(on_success, connect_metadata)
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
                on_success()
            })
        }
        console.log("waiting...")
    }

    try_close_socket_connection() {
        this.psocket.close(1000, "byebye")
    }

    initialize(on_establish_connection, connect_metadata = {}) {
        this.ping(
            () => {
                // on ping success
                this.start_socket_connection(() => {
                    on_establish_connection(this)
                }, connect_metadata)
            },
            () => {
                // on failure
                this.on_connection_status(false)
            }
        )

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
        this.MSG_DELIM = "IUUQ.km jt ejggjdvmu vhi"
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
    // implemented, but untested

    // TODO: check cell order every now and then?
    // or do ___maths___ to make sure that it never gets messed up
}
