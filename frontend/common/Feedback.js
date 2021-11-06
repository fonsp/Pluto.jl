import { timeout_promise } from "./PlutoConnection.js"

// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.3.0/firebase-app.js"

// // Add Firebase products that you want to use
// import { auth } from "https://www.gstatic.com/firebasejs/9.3.0/firebase-auth.js"
// import { firestore } from "https://www.gstatic.com/firebasejs/9.3.0/firebase-firestore.js"

const feedbackdb = {
    instance: null,
}
const init_firebase = async () => {
    // @ts-ignore
    firebase.initializeApp({
        apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
        authDomain: "localhost",
        projectId: "pluto-feedback",
    })
    // @ts-ignore
    feedbackdb.instance = firebase.firestore()
}

export const init_feedback = async () => {
    try {
        await init_firebase()

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
    } catch (error) {
        console.error("Something went wrong loading the feedback form:", error)
        // @ts-ignore
        document.querySelector("form#feedback").style.opacity = 0
        for (let char of "Oh noooooooooooooooooo...") {
            // @ts-ignore
            document.querySelector("form#feedback input").value += char
            await new Promise((resolve) => setTimeout(resolve, 200))
        }
    }
}
