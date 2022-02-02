import { html, useEffect, useMemo, useRef } from "../imports/Preact.js"
import _ from "../imports/lodash.js"
import { produceWithPatches } from "../imports/immer.js"

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

/**
 * @param {Parameters<typeof document.addEventListener>[0]} event_name
 * @param {Parameters<typeof document.addEventListener>[1]} handler_fn
 * @param {Parameters<typeof useEffect>[1]} deps
 */
let usePassiveWindowEventListener = (event_name, handler_fn, deps) => {
    useEffect(() => {
        document.addEventListener(event_name, handler_fn, { passive: true })
        return () => window.removeEventListener(event_name, handler_fn)
    }, deps)
}

// Yes these are the 4 colors we have now and you will like it.
let MULTIPLAYER_COLORS = ["#ffc09f", "#a0ced9", "#adf7b6", "#fcf5c7"]
let get_unused_color = (users) => {
    for (let color of MULTIPLAYER_COLORS) {
        if (users.every((u) => u.color !== color)) {
            return color
        }
    }
    return _.sample(MULTIPLAYER_COLORS)
}

/**
 * A gate before you get to `MultiplayerStalkerActive`.
 * This will put an "I exist" message on the state,so other `MultiplayerStalker` components
 * will know there is another kid in town.
 * Then, if someone else is "I exist"-ing as well, we both activate `MultiplayerStalkerActive`
 * which will do the actual heavy work.
 *
 * @param {Parameters<typeof MultiplayerStalkerActivate>[0] & { force: boolean }} props
 * */
export let MultiplayerStalker = ({ users: users_possibly_null, force, update_notebook, client_id }) => {
    let is_ready = users_possibly_null != null
    let users = users_possibly_null ?? {}

    let my_disconnect_id = useMemo(() => uuidv4(), [])
    useEffect(() => {
        if (is_ready) {
            update_notebook((notebook) => {
                notebook.users[client_id] = notebook.users[client_id] ?? {
                    color: get_unused_color(Object.values(notebook.users)),
                    mouse: null,
                    scroll: null,
                    last_update: Date.now(),
                }

                // Remove user on disconnect
                // TODO Extract to something nice
                // This needs some more explaination I think.. here we go
                // So there is a magical property on the notebook state object called `#on_disconnect`.
                // It's an object that maps from `client_id` to another object¹ that maps from any string to a set of patches.
                // Whenever a client disconnects, all the patches in its (nested) `#on_disconnect` object are applied to the notebook state.
                // So what we do here is get the patches we'd want to apply when our user disconnects (`delete notebook.users[client_id]`),
                // and then put those patches in the `#on_disconnect` object.
                // ¹ The reason we have this nested structure is so other parts of the code can
                //   add their own patches to the `#on_disconnect` object, without removing other `#on_disconnect` patches.
                let [new_notebook, on_disconnect_patches, inverseChanges] = produceWithPatches(notebook, (notebook) => {
                    delete notebook.users[client_id]
                })
                notebook["#on_disconnect"][client_id] ??= {}
                notebook["#on_disconnect"][client_id][my_disconnect_id] = on_disconnect_patches
            })
        }
    }, [is_ready])

    if (!is_ready) return null
    if (Object.keys(users).length < 2 && force === false) return null
    return html` <${MultiplayerStalkerActivate} users=${users} update_notebook=${update_notebook} client_id=${client_id} /> `
}

/**
 * Responsive for two things:
 * 1. Sending a whole bunch of updates to the state whenever we do ANYTHING (just scroll, mousemove and click for now but sure)
 * 2. Showing the other users states (mouse, scroll, etc)
 *
 * I think this might be pretty intens, it causes reflows everywhere, and it's not very efficient...
 * So this will only kick in when 1. there is another user, or 2. we're recording (or playing the recording)
 *
 * @param {{
 *  users: import("./Editor").NotebookData["users"],
 *  update_notebook: (update_fn: (notebook: import("./Editor").NotebookData) => void) => void,
 *  client_id: string,
 * }} props
 */
export let MultiplayerStalkerActivate = ({ users, update_notebook, client_id }) => {
    usePassiveWindowEventListener(
        "mousemove",
        (event) => {
            let mouseY = event.pageY
            let mouseX = event.pageX

            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

            let best_index = null
            let relative_y = mouseY
            let relative_x = mouseX

            for (let cell_element of cell_nodes) {
                if (cell_element.offsetTop <= mouseY) {
                    best_index = cell_element.id
                    relative_y = mouseY - cell_element.offsetTop
                    relative_x = mouseX - cell_element.offsetLeft
                }
            }

            update_notebook((notebook) => {
                notebook.users[client_id].mouse = {
                    relative_to_cell: best_index,
                    offsetY: relative_y,
                    screenX: relative_x,
                    at_scroll: window.scrollY, // Record the scroll position so we can move the mouse when scrolling
                    mousedown: notebook.users[client_id].mouse?.mousedown ?? false,
                }
                notebook.users[client_id].last_update = Date.now()
            })
        },
        []
    )

    usePassiveWindowEventListener(
        "scroll",
        (event) => {
            let y = window.scrollY + window.innerHeight / 2

            /** @type {Array<HTMLElement>} */
            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

            let best_index = ""
            let relative_distance = 0
            for (let el of cell_nodes) {
                let cy = el.offsetTop
                if (cy <= y) {
                    best_index = el.id
                    relative_distance = (y - cy) / el.offsetHeight
                }
            }

            update_notebook((notebook) => {
                notebook.users[client_id].scroll = {
                    relative_to_cell: best_index,
                    offsetY: relative_distance,
                    height: window.innerHeight,
                }
                if (notebook.users[client_id]?.mouse?.at_scroll != null) {
                    let at_scroll = notebook.users[client_id].mouse.at_scroll
                    notebook.users[client_id].mouse.offsetY += window.scrollY - at_scroll
                    notebook.users[client_id].mouse.at_scroll = window.scrollY
                }
            })
        },
        []
    )

    usePassiveWindowEventListener(
        "mouseleave",
        (event) => {
            update_notebook((notebook) => {
                notebook.users[client_id].mouse = null
            })
        },
        []
    )

    usePassiveWindowEventListener(
        "mousedown",
        (event) => {
            update_notebook((notebook) => {
                if (notebook.users[client_id].mouse) {
                    notebook.users[client_id].mouse.mousedown = true
                }
            })
        },
        []
    )

    usePassiveWindowEventListener(
        "mouseup",
        (event) => {
            update_notebook((notebook) => {
                if (notebook.users[client_id].mouse) {
                    notebook.users[client_id].mouse.mousedown = false
                }
            })
        },
        []
    )

    return html`
        <div
            style=${{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 1000,
            }}
        >
            ${Object.entries(users)
                .filter(([user_id, user]) => user.mouse != null)
                .filter(([user_id, user]) => user_id !== client_id)
                .map(([user_id, user]) => {
                    let cell_to_relative_to = user.mouse.relative_to_cell == null ? null : document.getElementById(user.mouse.relative_to_cell)
                    let relative_to_y = cell_to_relative_to?.offsetTop ?? 0
                    let relative_to_x = cell_to_relative_to?.offsetLeft ?? 0
                    return html`
                        <div
                            style=${{
                                position: "absolute",
                                top: 0,
                                left: 0,

                                transform: `
                                  translateX(${relative_to_x + user.mouse.screenX}px)
                                  translateY(${relative_to_y + user.mouse.offsetY}px)
                                  translateX(-50%)
                                  translateY(-50%)
                              `,
                                // transition: `transform .05s`,
                                width: 15,
                                height: 15,
                                backgroundColor: user.color,
                                opacity: 0.5,
                                borderRadius: "50%",
                            }}
                        >
                            <div
                                style=${{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",

                                    transform: `
                                      translateX(-50%)
                                      translateY(-50%)
                                      ${user.mouse.mousedown ? "scale(1.5)" : ""}
                                  `,
                                    // transition: `transform .05s`,
                                    width: 15,
                                    height: 15,
                                    backgroundColor: user.color,
                                    opacity: 0.5,
                                    borderRadius: "50%",
                                }}
                            ></div>
                        </div>
                    `
                })}
            ${Object.entries(users)
                .filter(([user_id, user]) => user.scroll != null)
                .filter(([user_id, user]) => user_id !== client_id)
                .map(([user_id, user], index) => {
                    let get_scroll_top = ({ cell_id, relative_distance }) => {
                        let cell = document.getElementById(cell_id)
                        return (cell?.offsetTop ?? 0) + relative_distance * (cell?.offsetHeight ?? 0) - window.innerHeight / 2
                    }
                    let WIDTH = 2
                    let y = get_scroll_top({ cell_id: user.scroll.relative_to_cell, relative_distance: user.scroll.offsetY })
                    return html`
                        <div
                            style=${{
                                position: "absolute",
                                top: 0,
                                left: 0,

                                transformOrigin: "center",
                                transform: `
                                  translateY(${y}px)
                                  translateX(${index * WIDTH + 2}px)
                                  scaleY(0.8)
                              `,
                                // transition: `transform .05s`,
                                width: WIDTH,
                                height: user.scroll.height,
                                backgroundColor: user.color,
                                borderRadius: WIDTH / 2,
                                opacity: 0.5,
                            }}
                        ></div>
                    `
                })}
        </div>
    `
}
