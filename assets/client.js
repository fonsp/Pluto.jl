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
        this.onDisconnect()

        setTimeout(() => {
            this.ping(() => {
                if (this.psocket.readyState != WebSocket.OPEN) {
                    this.waitForOnline()
                } else {
                    this.currentlyConnected = true
                    this.onReconnect()
                }
            }, () => {
                this.waitForOnline()
            })
        }, 1000)
    }

    getUniqueShortID() {
        return crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    }

    send(messageType, body, cellID = undefined, createPromise = false) {
        const requestID = this.getUniqueShortID()

        var toSend = {
            type: messageType,
            clientID: this.clientID,
            requestID: requestID,
            body: body,
        }
        if (this.notebookID) {
            toSend.notebookID = this.notebookID
        }
        if (cellID) {
            toSend.cellID = cellID
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

    sendreceive(messageType, body, cellID = undefined) {
        return this.send(messageType, body, cellID, true)
    }

    handleMessage(event) {
        event.data.text().then((msg) => JSON.parse(msg)).then((update) => {
            const forMe = !(("notebookID" in update) && (update.notebookID != this.notebookID))
            if (!forMe) {
                console.log("Update message not meant for this notebook")
                return
            }
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

            this.onUpdate(update, byMe)
        }).catch((ex) => {
            console.error("Failed to get updates!", ex)
            console.log(event)

            this.waitForOnline()
        })
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
                if (this.notebookID && !u.message.notebookExists) {
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
                this.onEstablishConnection()
            })
        }, () => {
            // on failure
            this.currentlyConnected = false
            this.onDisconnect()
        })
    }

    constructor(onUpdate, onEstablishConnection, onReconnect, onDisconnect) {
        this.onUpdate = onUpdate
        this.onEstablishConnection = onEstablishConnection
        this.onReconnect = onReconnect
        this.onDisconnect = onDisconnect

        this.currentlyConnected = false
        this.psocket = null
        this.MSG_DELIM = "IUUQ.km jt ejggjdvmu vhi"
        this.clientID = this.getUniqueShortID()
        this.sentRequests = {}
        this.plutoVersion = "unknown"
        this.juliaVersion = "unknown"

        window.addEventListener("beforeunload", e => {
            //this.send("disconnect", {})
            this.psocket.onclose = undefined
            this.tryCloseSocketConnection()
        })
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

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: "./" }).then(function (registration) {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function (err) {
        // registration failed :(
        console.log('ServiceWorker registration failed: ', err);
    });
}



/* UNICODE */

const te = new TextEncoder()
const td = new TextDecoder()

function lengthUtf8(str, startindex_utf16 = 0, endindex_utf16 = undefined) {
    return te.encode(str.substring(startindex_utf16, endindex_utf16)).length
}

function utf8index_to_ut16index(str, index_utf8) {
    return td.decode(te.encode(str).slice(0, index_utf8)).length
}

function spliceUtf8(original, startindex_utf8, endindex_utf8, replacement) {
    // JS uses UTF-16 for internal representation of strings, e.g.
    // "e".length == 1, "é".length == 1, "🐶".length == 2

    // Julia uses UTF-8, e.g.
    // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
    //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

    // Completion results from julia will give the 'splice indices': "where should the completed keyword be inserted?"
    // we need to splice into javascript string, so we convert to a UTF-8 byte array, then splice, then back to the string.

    const original_enc = te.encode(original)
    const replacement_enc = te.encode(replacement)

    const result_enc = new Uint8Array(original_enc.length + replacement_enc.length - (endindex_utf8 - startindex_utf8))

    result_enc.set(
        original_enc.slice(0, startindex_utf8),
        0,
    )
    result_enc.set(
        replacement_enc,
        startindex_utf8,
    )
    result_enc.set(
        original_enc.slice(endindex_utf8),
        startindex_utf8 + replacement_enc.length
    )

    return td.decode(result_enc)
}

console.assert(spliceUtf8("e é 🐶 is a dog", 5, 9, "hannes ❤") == "e é hannes ❤ is a dog")
