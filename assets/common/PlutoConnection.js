export class PlutoConnection {
    ping(onSucces, onFailure) {
        fetch("ping", {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
        }).then((response) => {
            return response.json()
        }).then((response) => {
            if (response == "OK!") {
                onSucces(response)
            } else {
                onFailure(response)
            }
        }).catch(onFailure)
    }

    waitForOnline() {
        this.currentlyConnected = false
        this.on_disconnect()

        setTimeout(() => {
            this.ping(() => {
                if (this.psocket.readyState != WebSocket.OPEN) {
                    this.waitForOnline()
                } else {
                    this.currentlyConnected = true
                    this.on_reconnect()
                }
            }, () => {
                this.waitForOnline()
            })
        }, 1000)
    }

    getUniqueShortID() {
        return crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    }

    send(messageType, body, cell_id = undefined, createPromise = false) {
        const requestID = this.getUniqueShortID()

        var toSend = {
            type: messageType,
            clientID: this.clientID,
            requestID: requestID,
            body: body,
        }
        if (this.notebook_id) {
            toSend.notebook_id = this.notebook_id
        }
        if (cell_id) {
            toSend.cell_id = cell_id
        }

        var p = undefined

        if (createPromise) {
            var resolve, reject;

            p = new Promise((res, rej) => {
                resolve = res
                reject = rej
            })

            this.sentRequests[requestID] = resolve
        }

        this.psocket.send(JSON.stringify(toSend) + this.MSG_DELIM)

        return p
    }

    sendreceive(messageType, body, cell_id = undefined) {
        return this.send(messageType, body, cell_id, true)
    }

    async handleMessage(event) {
        try {
            const update = await event.data.text().then(JSON.parse)
            // const forMe = !(("notebook_id" in update) && (update.notebook_id != this.notebook_id))
            // if (!forMe) {
            //     console.log("Update message not meant for this notebook")
            //     return
            // }
            const byMe = ("initiatorID" in update) && (update.initiatorID == this.clientID)
            const requestID = update.requestID

            if (byMe && requestID) {
                const request = this.sentRequests[requestID]
                if (request) {
                    request(update)
                    delete this.sentRequests[requestID]
                    return
                }
            }

            this.on_update(update, byMe)
        } catch(ex) {
            console.error("Failed to get update!", ex)
            console.log(event)

            this.waitForOnline()
        }
    }

    startSocketConnection(onSucces) {

        this.psocket = new WebSocket(document.location.protocol.replace("http", "ws") + '//' + document.location.host + document.location.pathname.replace("/edit", "/"))
        this.psocket.onmessage = (e) => {
            this.handleMessage(e)
        }
        this.psocket.onerror = (e) => {
            console.error("SOCKET ERROR", e)

            if (this.psocket.readyState != WebSocket.OPEN && this.psocket.readyState != WebSocket.CONNECTING) {
                this.waitForOnline()
                setTimeout(() => {
                    if (this.psocket.readyState != WebSocket.OPEN) {
                        this.tryCloseSocketConnection()

                        this.startSocketConnection(onSucces)
                    }
                }, 500)
            }
        }
        this.psocket.onclose = (e) => {
            console.warn("SOCKET CLOSED")
            console.log(e)

            this.waitForOnline()
        }
        this.psocket.onopen = () => {
            this.sendreceive("connect", {}).then(u => {
                this.plutoENV = u.message.ENV
                if (this.notebook_id && !u.message.notebookExists) {
                    // https://github.com/fonsp/Pluto.jl/issues/55
                    document.location.href = "./"
                    return
                }
                this.currentlyConnected = true
                console.log("socket opened")
                onSucces()
            })
        }
    }

    tryCloseSocketConnection() {
        this.psocket.close(1000, "byebye")
    }

    initialize() {
        this.ping(() => {
            // on ping success
            this.startSocketConnection(() => {
                this.on_establish_connection()
            })
        }, () => {
            // on failure
            this.currentlyConnected = false
            this.on_disconnect()
        })

        window.addEventListener("beforeunload", e => {
            console.warn("unloading 👉 disconnecting websocket")
            this.psocket.onclose = undefined
            this.tryCloseSocketConnection()
        })
    }

    constructor(on_update, on_establish_connection, on_reconnect, on_disconnect) {
        this.on_update = on_update
        this.on_establish_connection = on_establish_connection
        this.on_reconnect = on_reconnect
        this.on_disconnect = on_disconnect

        this.currentlyConnected = false
        this.psocket = null
        this.MSG_DELIM = "IUUQ.km jt ejggjdvmu vhi"
        this.clientID = this.getUniqueShortID()
        this.sentRequests = {}
        this.plutoVersion = "unknown"
        this.juliaVersion = "unknown"
    }

    fetchPlutoVersions() {
        const githubPromise = fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
        }).then((response) => {
            return response.json()
        }).then((response) => {
            return response[0].tag_name
        })

        const plutoPromise = this.sendreceive("getversion", {}).then(u => {
            this.plutoVersion = u.message.pluto
            this.juliaVersion = u.message.julia
            return this.plutoVersion
        })

        return Promise.all([githubPromise, plutoPromise])
    }

    // TODO: reconnect with a delay if the last request went poorly
    // this would avoid hanging UI when the connection is lost maybe?
    // implemented, but untested

    // TODO: check cell order every now and then?
    // or do ___maths___ to make sure that it never gets messed up
}