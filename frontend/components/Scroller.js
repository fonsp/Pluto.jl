import { useEffect, useRef, useState } from "../common/Preact.js"

/**
 * Utility component that scrolls the page automatically, when the mouse is
 * moved to the upper or lower 30%.
 *
 * Useful for things like selections and drag-and-drop.
 */
export const Scroller = ({ active }) => {
    const mouse = useRef()

    useEffect(() => {
        const handler = (e) => {
            mouse.current = { x: e.clientX, y: e.clientY }
        }
        document.addEventListener("mousemove", handler)
        document.addEventListener("dragover", handler)
        return () => {
            document.removeEventListener("mousemove", handler)
            document.removeEventListener("dragover", handler)
        }
    }, [])

    useEffect(() => {
        if (active) {
            let prev_time = null
            let current = true
            const scroll_update = (timestamp) => {
                if (current) {
                    if (prev_time == null) {
                        prev_time = timestamp
                    }
                    const dt = timestamp - prev_time
                    prev_time = timestamp

                    if (mouse.current) {
                        const y_ratio = mouse.current.y / window.innerHeight
                        if (y_ratio < 0.3) {
                            window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000)
                        } else if (y_ratio > 0.7) {
                            window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000)
                        }
                    }

                    window.requestAnimationFrame(scroll_update)
                }
            }
            window.requestAnimationFrame(scroll_update)
            return () => (current = false)
        }
    }, [active])

    return null
}
