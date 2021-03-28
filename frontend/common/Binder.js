export const BinderPhase = {
    wait_for_user: 0,
    requesting: 0.4,
    created: 0.6,
    notebook_running: 0.9,
    ready: 1.0,
}

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

export const trailingslash = (s) => (s.endsWith("/") ? s : s + "/")

export const request_binder = (build_url) =>
    new Promise(async (resolve, reject) => {
        let es = new EventSource(build_url)
        es.onerror = (err) => {
            console.error("Binder error: Lost connection to " + build_url, err)
            es.close()
            reject(err)
        }
        let phase = null
        es.onmessage = (evt) => {
            let msg = JSON.parse(evt.data)
            if (msg.phase && msg.phase !== phase) {
                phase = msg.phase.toLowerCase()
                console.log("Binder subphase: " + phase)
                let status = phase
                if (status === "ready") {
                    status = "server-ready"
                }
            }
            if (msg.message) {
                console.log("Binder message: " + msg.message)
            }
            switch (msg.phase) {
                case "failed":
                    console.error("Binder error: Failed to build", build_url, msg)
                    es.close()
                    reject(new Error(msg))
                    break
                case "ready":
                    es.close()

                    resolve({
                        binder_session_url: trailingslash(msg.url) + "pluto/",
                        binder_session_token: msg.token,
                    })
                    break
                default:
                // console.log(msg);
            }
        }
    })
