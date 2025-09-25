<script>
    import { onMount, onDestroy } from 'svelte'
    import _ from '../imports/lodash.js'

    export let actions
    export let selected_cells = []
    export let set_scroller
    export let serialize_selected
    export let pluto_editor_element

    let dropee = null
    let dropped = null
    let cell_edges = []
    let pointer_position = { pageX: 0, pageY: 0 }
    let lastenter = null

    let drag_start = false
    let drag_target = false
    let drop_index = 0

    const precompute_cell_edges = () => {
        const cell_nodes = Array.from(pluto_editor_element.querySelectorAll(":scope > main > pluto-notebook > pluto-cell"))
        cell_edges = cell_nodes.map((el) => el.offsetTop)
        if (cell_nodes.length > 0) {
            cell_edges.push(last(cell_nodes).offsetTop + last(cell_nodes).scrollHeight)
        }
    }

    const getDropIndexOf = ({ pageX, pageY }) => {
        const editorY =
            pageY -
            ((pluto_editor_element.querySelector("main") ?? pluto_editor_element).getBoundingClientRect().top +
                document.documentElement.scrollTop)

        const distances = cell_edges.map((p) => Math.abs(p - editorY - 8)) // 8 is the magic computer number: https://en.wikipedia.org/wiki/8
        return argmin(distances)
    }

    const argmin = (x) => {
        let best_val = Infinity
        let best_index = -1
        let val
        for (let i = 0; i < x.length; i++) {
            val = x[i]
            if (val < best_val) {
                best_index = i
                best_val = val
            }
        }
        return best_index
    }

    const last = (x) => x[x.length - 1]

    const event_not_for_me = (e) => {
        return (e.target instanceof Element ? e.target.closest("pluto-editor") : null) !== pluto_editor_element
    }

    const precompute_cell_edges_throttled = _.throttle(precompute_cell_edges, 4000, { leading: false, trailing: true })
    const update_drop_index_throttled = _.throttle(
        () => {
            drop_index = getDropIndexOf(pointer_position)
        },
        100,
        { leading: false, trailing: true }
    )

    const handleDragStart = (e) => {
        if (event_not_for_me(e)) return
        if (!e.dataTransfer) return
        let target = e.target
        let pe = target.parentElement
        if (target.matches("pluto-shoulder") && pe != null) {
            dropee = pe
            let data = serialize_selected(pe.id)
            if (data) e.dataTransfer.setData("text/pluto-cell", data)
            dropped = false
            precompute_cell_edges()

            drag_start = true
            drop_index = getDropIndexOf(e)
            set_scroller({ up: true, down: true })
        } else {
            drag_start = false
            drag_target = false
            set_scroller({ up: false, down: false })
            dropee = null
        }
    }

    const handleDragEnter = (e) => {
        if (event_not_for_me(e)) return
        if (!e.dataTransfer) return
        if (e.dataTransfer.types[0] !== "text/pluto-cell") return
        if (!drag_target) precompute_cell_edges()
        lastenter = e.target
        drag_target = true
        e.preventDefault()
    }

    const handleDragLeave = (e) => {
        if (event_not_for_me(e)) return
        if (!e.dataTransfer) return
        if (e.dataTransfer.types[0] !== "text/pluto-cell") return
        if (e.target === lastenter) {
            drag_target = false
        }
    }

    const handleDragOver = (e) => {
        if (event_not_for_me(e)) return
        if (!e.dataTransfer) return
        if (e.dataTransfer.types[0] !== "text/pluto-cell") return
        pointer_position = e

        precompute_cell_edges_throttled()
        update_drop_index_throttled()

        if (drag_start) {
            e.dataTransfer.dropEffect = "move"
        }
        e.preventDefault()
    }

    const handleDragEnd = (e) => {
        if (event_not_for_me(e)) return
        update_drop_index_throttled.flush()
        drag_start = false
        drag_target = false
        set_scroller({ up: false, down: false })
    }

    const handleDrop = (e) => {
        if (event_not_for_me(e)) return
        if (!e.dataTransfer) return
        if (e.dataTransfer.types[0] !== "text/pluto-cell") {
            return
        }
        drag_target = false
        dropped = true
        if (dropee && drag_start) {
            const drop_index = getDropIndexOf(e)
            const friend_ids = selected_cells.includes(dropee.id) ? selected_cells : [dropee.id]
            actions?.move_remote_cells?.(friend_ids, drop_index)
        } else {
            const drop_index = getDropIndexOf(e)
            const data = e.dataTransfer.getData("text/pluto-cell")
            actions?.add_deserialized_cells?.(data, drop_index)
        }
    }

    onMount(() => {
        document.addEventListener("dragstart", handleDragStart)
        document.addEventListener("dragenter", handleDragEnter)
        document.addEventListener("dragleave", handleDragLeave)
        document.addEventListener("dragover", handleDragOver)
        document.addEventListener("dragend", handleDragEnd)
        document.addEventListener("drop", handleDrop)

        return () => {
            document.removeEventListener("dragstart", handleDragStart)
            document.removeEventListener("dragenter", handleDragEnter)
            document.removeEventListener("dragleave", handleDragLeave)
            document.removeEventListener("dragover", handleDragOver)
            document.removeEventListener("dragend", handleDragEnd)
            document.removeEventListener("drop", handleDrop)
        }
    })

    $: styles = drag_target
        ? {
              display: "block",
              top: cell_edges[drop_index] + "px",
          }
        : {}
</script>

<dropruler style={styles}></dropruler>