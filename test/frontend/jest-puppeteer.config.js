module.exports = {
    launch: {
        headless: process.env.HEADLESS !== "false",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        devtools: true,
    },
}
