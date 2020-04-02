class PlutoConnection {
    ping(onSucces, onFailure) {
        fetch("/ping", {
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
    
    psocket = null

    getUniqueShortID() {
        return crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    }
    clientID = this.getUniqueShortID()

    sentRequests = {}
    
    send(messageType, body, cellUUID = undefined, createPromise=false) {
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
        if (cellUUID) {
            toSend.cellID = cellUUID
        }

        var p = undefined

        if(createPromise){
            var resolve, reject;

            p = new Promise((res, rej) => {
                resolve = res
                reject = rej
            })

            this.sentRequests[requestID] = resolve
        }

        this.psocket.send(JSON.stringify(toSend))

        return p
    }

    sendreceive(messageType, body, cellUUID = undefined) {
        return this.send(messageType, body, cellUUID, true)
    }
    
    handleMessage(event) {
        
        var onFailure = (e) => {
            console.warn("Failed to get updates!")
            console.log(e)
    
            this.waitForOnline()
        }
    
        try {
            const update = JSON.parse(event.data)
    
            const forMe = !(("notebookID" in update) && (update.notebookID != this.notebookID))
            if (!forMe) {
                console.log("Update message not meant for this notebook")
                return
            }
            const byMe = ("initiatorID" in update) && (update.initiatorID == this.clientID)
            const requestID = update.requestID

            if(byMe && requestID) {
                const request = this.sentRequests[requestID]
                if(request){
                    request(update)
                    delete this.sentRequests[requestID]
                    return
                }
            }

            this.onUpdate(update, byMe)
        } catch (error) {
            onFailure(error)
        }
    }
    
    startSocketConnection(onSucces) {
        this.psocket = new WebSocket("ws://" + document.location.host)
        this.psocket.onmessage = (e) => {
            this.handleMessage(e)
        }
        this.psocket.onerror = (e) => {
            console.error("SOCKET ERROR")
            console.log(e)
    
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
            // startSocketConnection(onSucces)
        }
        this.psocket.onopen = () => {
            this.sendreceive("connect", {}).then(u => {
                this.currentlyConnected = true
                console.log("socket opened")
                onSucces()
            })
        }
    }
    
    tryCloseSocketConnection() {
        this.psocket.close()
    }

    initialize(){
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
    
    constructor(onUpdate, onEstablishConnection, onReconnect, onDisconnect){
        this.onUpdate = onUpdate
        this.onEstablishConnection = onEstablishConnection
        this.onReconnect = onReconnect
        this.onDisconnect = onDisconnect

        this.currentlyConnected = false

        window.addEventListener("unload", e => {
            this.send("disconnect", {})
        })
    }

    fetchPlutoVersions(){
        const githubPromise = fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases", {
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
            return response[0].tag_name
        }).catch(e => null)

        const plutoPromise = this.sendreceive("getversion", {}).then(u => {
            return u.message.pluto
        })

        return Promise.all([githubPromise, plutoPromise])
    }
    
    // TODO: reconnect with a delay if the last request went poorly
    // this would avoid hanging UI when the connection is lost maybe?
    // implemented, but untested
    
    // TODO: check cell order every now and then?
    // or do ___maths___ to make sure that it never gets messed up
}