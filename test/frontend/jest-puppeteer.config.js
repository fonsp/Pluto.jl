const PLUTO_PORT = parseInt(process.env.PLUTO_PORT)
module.exports = {
    launch: {
        headless: process.env.HEADLESS !== 'false',
    },
    server: {
        command: `julia --project="${process.env.PLUTO_DIR}" -e "import Pluto; Pluto.run(${PLUTO_PORT})"`,
        port: PLUTO_PORT,
    },
}
