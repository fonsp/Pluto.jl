<script>
    import { onMount, onDestroy } from "svelte"
    import { has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"

    export let on_selection
    export let set_scroller
    export let cell_order

    let element_ref
    let mouse_position_ref = null
    let is_selecting_ref = false
    let selection = null

    const get_element_position_in_document = (element) => {
        let top = 0
        let left = 0

        do {
            top += element.offsetTop || 0
            left += element.offsetLeft || 0
            element = element.offsetParent
        } while (element)

        return {
            top: top,
            left: left,
        }
    }

    const in_request_animation_frame = (fn) => {
        let last_known_arguments = null
        let ticking = false

        return (...args) => {
            last_known_arguments = args
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    fn(...last_known_arguments)
                    ticking = false
                })

                ticking = true
            }
        }
    }

    onMount(() => {
        const event_target_inside_this_notebook = (e) => {
            if (e.target == null) {
                return false
            }

            // this should also work for notebooks inside notebooks!
            let closest_editor = e.target.closest("pluto-editor")
            let my_editor = element_ref?.closest("pluto-editor")

            return closest_editor === my_editor
        }

        const onmousedown = (e) => {
            // @ts-ignore
            const t = e.target?.tagName

            // TODO: also allow starting the selection in one codemirror and stretching it to another cell
            if (
                e.button === 0 &&
                event_target_inside_this_notebook(e) &&
                (t === "PLUTO-EDITOR" || t === "MAIN" || t === "PLUTO-NOTEBOOK" || t === "PREAMBLE")
            ) {
                on_selection([])
                selection = { start: { x: e.pageX, y: e.pageY }, end: { x: e.pageX, y: e.pageY } }
                is_selecting_ref = true
            }
        }

        const onmouseup = (e) => {
            if (is_selecting_ref) {
                selection = null
                set_scroller({ up: false, down: false })
                is_selecting_ref = false
            } else {
                // if you didn't click on a UI element...
                if (
                    !e.composedPath().some((e) => {
                        // @ts-ignore
                        const tag = e.tagName
                        if (e instanceof HTMLElement)
                            return e.matches("pluto-shoulder, button.input_context_menu, button.foldcode") || e.closest(".input_context_menu")
                    })
                ) {
                    // ...clear the selection
                    on_selection([])
                }
            }
        }

        let update_selection = in_request_animation_frame(({ pageX, pageY }) => {
            if (!is_selecting_ref || selection == null) return

            let new_selection_end = { x: pageX, y: pageY }

            const cell_nodes = Array.from(document.querySelectorAll("pluto-notebook > pluto-cell"))

            let A = {
                start_left: Math.min(selection.start.x, new_selection_end.x),
                start_top: Math.min(selection.start.y, new_selection_end.y),
                end_left: Math.max(selection.start.x, new_selection_end.x),
                end_top: Math.max(selection.start.y, new_selection_end.y),
            }
            let in_selection = cell_nodes.filter((cell) => {
                let cell_position = get_element_position_in_document(cell)
                let cell_size = cell.getBoundingClientRect()

                let B = {
                    start_left: cell_position.left,
                    start_top: cell_position.top,
                    end_left: cell_position.left + cell_size.width,
                    end_top: cell_position.top + cell_size.height,
                }
                return A.start_left < B.end_left && A.end_left > B.start_left && A.start_top < B.end_top && A.end_top > B.start_top
            })

            set_scroller({ up: true, down: true })
            on_selection(in_selection.map((x) => x.id))
            selection = { start: selection.start, end: new_selection_end }
        })

        const onscroll = (e) => {
            if (is_selecting_ref) {
                update_selection({ pageX: mouse_position_ref.clientX, pageY: mouse_position_ref.clientY + document.documentElement.scrollTop })
            }
        }

        const onmousemove = (e) => {
            mouse_position_ref = e
            if (is_selecting_ref) {
                update_selection({ pageX: e.pageX, pageY: e.pageY })
                e.preventDefault()
            }
        }

        const onselectstart = (e) => {
            if (is_selecting_ref) {
                e.preventDefault()
            }
        }

        // Ctrl+A to select all cells
        const onkeydown = (e) => {
            if (e.key?.toLowerCase() === "a" && has_ctrl_or_cmd_pressed(e)) {
                // if you are not writing text somewhere else
                if (document.activeElement === document.body && (window.getSelection()?.isCollapsed ?? true)) {
                    on_selection(cell_order)
                    e.preventDefault()
                }
            }
        }

        document.addEventListener("mousedown", onmousedown)
        document.addEventListener("mouseup", onmouseup)
        document.addEventListener("mousemove", onmousemove)
        document.addEventListener("selectstart", onselectstart)
        document.addEventListener("keydown", onkeydown)
        document.addEventListener("scroll", onscroll, { passive: true })
        
        return () => {
            document.removeEventListener("mousedown", onmousedown)
            document.removeEventListener("mouseup", onmouseup)
            document.removeEventListener("mousemove", onmousemove)
            document.removeEventListener("selectstart", onselectstart)
            document.removeEventListener("keydown", onkeydown)
            // @ts-ignore
            document.removeEventListener("scroll", onscroll, { passive: true })
        }
    })
</script>

{#if selection == null}
    <span bind:this={element_ref}></span>
{:else}
    <pl-select-area
        bind:this={element_ref}
        style="position: absolute; background: rgba(40, 78, 189, 0.24); z-index: 1000000; top: {Math.min(selection.start.y, selection.end.y)}px; left: {Math.min(selection.start.x, selection.end.x)}px; width: {Math.abs(selection.start.x - selection.end.x)}px; height: {Math.abs(selection.start.y - selection.end.y)}px;"
    ></pl-select-area>
{/if}