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
    clientID = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    
    send(messageType, body, cellUUID = null) {
        var toSend = {
            type: messageType,
            clientID: this.clientID,
            body: body,
        }
        if (this.notebookID) {
            toSend.notebookID = this.notebookID
        }
        if (cellUUID) {
            toSend.cellID = cellUUID
        }
        this.psocket.send(JSON.stringify(toSend))
    }
    
    handleMessage(event) {
        
        var onFailure = (e) => {
            console.warn("Failed to get updates!")
            console.log(e)
    
            this.waitForOnline()
        }
    
        try {
            var update = JSON.parse(event.data)
    
            var forMe = !(("notebookID" in update) && (update.notebookID != this.notebookID))
    
            if (!forMe) {
                console.log("Update message not meant for this notebook")
                return
            }
    
            var byMe = ("initiatorID" in update) && (update.initiatorID == this.clientID)

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
            this.send("connect", {})
            this.send("getallnotebooks", {})
            this.currentlyConnected = true
            console.log("socket opened")
            onSucces()
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
            this.currentlyConnected = true
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
    
    // TODO: reconnect with a delay if the last request went poorly
    // this would avoid hanging UI when the connection is lost maybe?
    // implemented, but untested
    
    // TODO: check cell order every now and then?
    // or do ___maths___ to make sure that it never gets messed up
}