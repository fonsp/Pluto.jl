import { useContext, useState, useEffect } from "../imports/Preact.js"
import { PlutoActionsContext } from "./PlutoContext.js"

/** Request the current time from the server, compare with the local time, and return the current best estimate of our time difference. Updates regularly.
 * @param {{connected: boolean}} props
 */
export const useMyClockIsAheadBy = ({ connected }) => {
    let pluto_actions = useContext(PlutoActionsContext)

    const [my_clock_is_ahead_by, set_my_clock_is_ahead_by] = useState(0)

    useEffect(() => {
        if (connected) {
            let f = async () => {
                let getserver = () => pluto_actions.send("current_time").then((m) => m.message.time)
                let getlocal = () => Date.now() / 1000

                // once to precompile and to make sure that the server is not busy with other tasks
                // console.log("getting server time warmup")
                for (let i = 0; i < 16; i++) await getserver()
                // console.log("getting server time warmup done")

                let t1 = await getlocal()
                let s1 = await getserver()
                let s2 = await getserver()
                let t2 = await getlocal()
                // console.log("getting server time done")

                let mytime = (t1 + t2) / 2
                let servertime = (s1 + s2) / 2

                let diff = mytime - servertime
                // console.info("My clock is ahead by ", diff, " s")
                if (!isNaN(diff)) set_my_clock_is_ahead_by(diff)
            }

            f()

            let handle = setInterval(f, 60 * 1000)

            return () => clearInterval(handle)
        }
    }, [connected])

    return my_clock_is_ahead_by
}
