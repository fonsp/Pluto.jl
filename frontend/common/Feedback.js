import { timeout_promise } from "./PlutoConnection.js"


const feedbackdb = {
    instance: null,
}
const init_firebase = () => {
    // @ts-ignore
    firebase.initializeApp({
        apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
        authDomain: "localhost",
        projectId: "pluto-feedback",
    })
    // @ts-ignore
    feedbackdb.instance = firebase.firestore()
}

export const init_feedback = () => {
    init_firebase()

    const feedbackform = document.querySelector("form#feedback")
    feedbackform.addEventListener("submit", (e) => {
        const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)")

        timeout_promise(
            feedbackdb.instance.collection("feedback").add({
                // @ts-ignore
                feedback: new FormData(e.target).get("opinion"),
                // @ts-ignore
                timestamp: firebase.firestore.Timestamp.now(),
                email: email ? email : "",
            }),
            5000
        )
            .then(() => {
                let message = "Submitted. Thank you for your feedback! 💕"
                console.log(message)
                alert(message)
                // @ts-ignore
                feedbackform.querySelector("#opinion").value = ""
            })
            .catch((error) => {
                let message =
                    "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
                console.error(message)
                console.error(error)
                alert(message + error)
            })
        e.preventDefault()
    })
}
