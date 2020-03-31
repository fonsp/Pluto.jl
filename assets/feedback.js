document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        firebase.initializeApp({
            apiKey: 'AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68',
            authDomain: 'localhost',
            projectId: 'pluto-feedback',
        });

        window.feedbackdb = firebase.firestore();

        window.feedbackform = document.querySelector("form#feedback")
        feedbackform.addEventListener("submit", (e) => {
            console.log(e)
            
            email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)")
            
            
            feedbackdb.collection("feedback").add({
                feedback: new FormData(e.target).get("opinion"),
                timestamp: firebase.firestore.Timestamp.now(),
                email: email ? email : "",
            })
            .then(function() {
                message = "Submitted. Thank you for your feedback! 💕"
                console.log(message);
                alert(message);
            })
            .catch(function(error) {
                message = "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
                console.error(message);
                console.error(error);
                alert(message+error)
            });

            e.preventDefault()
        })

    }, 1000)
})