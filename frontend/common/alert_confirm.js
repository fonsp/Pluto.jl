import { available, api } from "../common/VSCodeApi.js"
import { resolvable_promise, get_unique_short_id } from "./PlutoConnection.js"

const sent_requests = new Map()

if (available) {
    window.addEventListener("message", (event) => {
        const raw = event.data

        if (raw.type === "alert_confirm_callback") {
            const request = sent_requests.get(raw.token)
            if (request) {
                request(raw.value)
                sent_requests.delete(raw.token)
            }
        }
    })
}

const create_alert_confirm = (name) => (x) =>
    new Promise((resolve) => {
        let request_id = get_unique_short_id()

        sent_requests.set(request_id, (response_message) => {
            resolve(response_message)
        })
        api.postMessage({
            type: name,
            text: x,
            token: request_id,
        })
    })

export const alert = available ? create_alert_confirm("alert") : window.alert
export const confirm = available ? create_alert_confirm("confirm") : window.confirm