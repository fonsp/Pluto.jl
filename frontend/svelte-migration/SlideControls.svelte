<script>
  import { t } from "../common/lang.js"
  import { onMount, onDestroy } from "svelte"
  
  let presenting = false
  let button_prev_ref = null
  let button_next_ref = null
  let presenting_ref = presenting
  
  // 更新 presenting_ref 当 presenting 变化时
  $: presenting_ref = presenting
  
  function move_slides_with_keyboard(/** @type {KeyboardEvent} */ e) {
    const activeElement = document.activeElement
    if (
      activeElement != null &&
      activeElement !== document.body &&
      activeElement !== button_prev_ref &&
      activeElement !== button_next_ref
    ) {
      // We do not move slides with arrow if we have an active element
      return
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      button_prev_ref?.click()
    } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
      button_next_ref?.click()
    } else if (e.key === "Escape") {
      presenting = false
    } else {
      return
    }
    e.preventDefault()
  }

  function calculate_slide_positions(/** @type {Event} */ e) {
    const notebook_node = /** @type {HTMLElement?} */ (e.target)?.closest("pluto-editor")?.querySelector("pluto-notebook")
    if (!notebook_node) return []

    const height = window.innerHeight
    const headers = Array.from(notebook_node.querySelectorAll("pluto-output h1, pluto-output h2"))
    const pos = headers.map((el) => el.getBoundingClientRect())
    const edges = pos.map((rect) => rect.top + window.scrollY)

    edges.push(notebook_node.getBoundingClientRect().bottom + window.scrollY)

    const scrollPositions = headers.map((el, i) => {
      if (el.tagName == "H1") {
        // center vertically
        const slideHeight = edges[i + 1] - edges[i] - height
        return edges[i] - Math.max(0, (height - slideHeight) / 2)
      } else {
        // align to top
        return edges[i] - 20
      }
    })

    return scrollPositions
  }

  function go_previous_slide(/** @type {Event} */ e) {
    const positions = calculate_slide_positions(e)

    const pos = positions.reverse().find((y) => y < window.scrollY - 10)

    if (pos) window.scrollTo(window.scrollX, pos)
  }

  function go_next_slide(/** @type {Event} */ e) {
    const positions = calculate_slide_positions(e)
    const pos = positions.find((y) => y - 10 > window.scrollY)
    if (pos) window.scrollTo(window.scrollX, pos)
  }

  // 全局函数，用于切换演示模式
  if (typeof window !== "undefined") {
    window.present = () => {
      presenting = !presenting_ref
    }
  }

  // 监听 presenting 状态变化
  $: if (typeof document !== "undefined") {
    document.body.classList.toggle("presentation", presenting)
    
    if (presenting) {
      window.addEventListener("keydown", move_slides_with_keyboard)
    } else {
      window.removeEventListener("keydown", move_slides_with_keyboard)
    }
  }

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", move_slides_with_keyboard)
    }
  })
</script>

<nav id="slide_controls" inert={!presenting}>
  <button bind:this={button_prev_ref} class="changeslide prev" title={t("t_presentation_previous_slide")} on:click={go_previous_slide}>
    <span></span>
  </button>
  <button bind:this={button_next_ref} class="changeslide next" title={t("t_presentation_next_slide")} on:click={go_next_slide}>
    <span></span>
  </button>
</nav>

<style>
  nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    display: flex;
    gap: 1rem;
    pointer-events: none;
  }

  nav[inert] {
    display: none;
  }

  button {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  button:hover {
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .prev {
    left: 2rem;
  }

  .next {
    right: 2rem;
  }

  span {
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
  }

  .prev span {
    border-width: 0.5rem 0.8rem 0.5rem 0;
    border-color: transparent #333 transparent transparent;
    margin-right: 0.2rem;
  }

  .next span {
    border-width: 0.5rem 0 0.5rem 0.8rem;
    border-color: transparent transparent transparent #333;
    margin-left: 0.2rem;
  }
</style>