<script>
    import { onMount, onDestroy, createEventDispatcher, getContext } from 'svelte'
    import { cl } from "../common/ClassTable.js"
    import { package_status, nbpkg_fingerprint_without_terminal } from "../components/PkgStatusMark.js"
    import PkgTerminalView from "./PkgTerminalView.svelte"
    import { useDebouncedTruth } from "../components/RunArea.js"
    import { time_estimate, usePackageTimingData } from "../common/InstallTimeEstimate.js"
    import { pretty_long_time } from "../components/EditOrRunButton.js"
    import { get_included_external_source } from "../common/external_source.js"
    import { t, th } from "../common/lang.js"

    export const arrow_up_circle_icon = get_included_external_source("arrow_up_circle_icon")?.href
    export const document_text_icon = get_included_external_source("document_text_icon")?.href
    export const help_circle_icon = get_included_external_source("help_circle_icon")?.href
    export const open_icon = get_included_external_source("open_icon")?.href

    export let notebook
    export let disable_input

    // State variables
    let recent_event = null
    let recent_event_ref = null
    let recent_source_element_ref = null
    let pos_ref = ""
    let element_ref = null
    let element_focused_before_popup = null

    // PkgPopup specific state
    let pkg_status = null
    let showterminal = false
    let pluto_actions = getContext('plutoActionsContext')

    const dispatch = createEventDispatcher()

    function open(e) {
        const el = e.detail.source_element
        recent_source_element_ref = el

        if (el == null) {
            pos_ref = `top: 20%; left: 50%; transform: translate(-50%, -50%); position: fixed;`
        } else {
            const elb = el.getBoundingClientRect()
            const bodyb = document.body.getBoundingClientRect()

            pos_ref = `top: ${0.5 * (elb.top + elb.bottom) - bodyb.top}px; left: min(max(0px,100vw - 251px - 30px), ${elb.right - bodyb.left}px);`
        }

        recent_event = e.detail
        recent_event_ref = recent_event
    }

    function close() {
        recent_event = null
        recent_event_ref = null
    }
    
    function clear_recent_event() {
        recent_event = null
        recent_event_ref = null
    }

    function handlePointerDown(e) {
        if (recent_event_ref == null) return
        if (e.target == null) return
        if (e.target.closest("pluto-popup") != null) return
        if (recent_source_element_ref != null && recent_source_element_ref.contains(e.target)) return

        close()
    }

    function handleKeyDown(e) {
        if (e.key === "Escape") close()
    }

    function handleFocusOut(e) {
        if (recent_event_ref != null && recent_event_ref.should_focus === true) {
            if (element_ref?.matches(":focus-within")) return
            if (element_ref?.contains(e.relatedTarget)) return

            if (
                recent_source_element_ref != null &&
                (recent_source_element_ref.contains(e.relatedTarget) || recent_source_element_ref.matches(":focus-within"))
            )
                return
            close()
            e.preventDefault()
            element_focused_before_popup?.focus?.()
        }
    }

    // Fetch package status when recent_event changes
    async function fetchPackageStatus() {
        if (recent_event == null) {
            pkg_status = null
            return
        }
        
        if (recent_event?.type === "nbpkg") {
            try {
                // Simulate the get_avaible_versions call
                const versions = []
                const url = ""
                
                pkg_status = package_status({
                    nbpkg: notebook.nbpkg,
                    package_name: recent_event.package_name,
                    is_disable_pkg: recent_event.is_disable_pkg,
                    available_versions: versions,
                    package_url: url,
                })
            } catch (error) {
                console.error("Error fetching package status:", error)
                pkg_status = null
            }
        }
    }

    // Watch for changes in recent_event and notebook.nbpkg
    let previous_recent_event = null
    let previous_nbpkg_fingerprint = []
    $: {
        // Check if recent_event changed
        if (previous_recent_event !== recent_event) {
            previous_recent_event = recent_event
            fetchPackageStatus()
        }
        
        // Check if notebook.nbpkg changed
        const current_fingerprint = nbpkg_fingerprint_without_terminal(notebook?.nbpkg)
        if (JSON.stringify(previous_nbpkg_fingerprint) !== JSON.stringify(current_fingerprint)) {
            previous_nbpkg_fingerprint = current_fingerprint
            fetchPackageStatus()
        }
    }

    // Hide popup when nbpkg is switched on/off
    $: {
        if (recent_event) {
            const valid = recent_event.is_disable_pkg || (notebook?.nbpkg?.enabled ?? true)
            if (!valid) {
                clear_recent_event()
            }
        }
    }

    // Handle terminal visibility
    $: {
        const needs_first_instatiation = notebook?.nbpkg?.restart_required_msg == null && !(notebook?.nbpkg?.instantiated ?? true)
        const busy = recent_event != null && ((notebook?.nbpkg?.busy_packages ?? []).includes(recent_event.package_name) || needs_first_instatiation)
        const debounced_busy = useDebouncedTruth(busy, 2)
        
        if (debounced_busy !== showterminal) {
            showterminal = debounced_busy
        }
    }

    // Get timing data
    let timingdata = null
    $: {
        timingdata = usePackageTimingData()
    }

    onMount(() => {
        window.addEventListener("open pluto popup", open)
        window.addEventListener("close pluto popup", close)
        window.addEventListener("pointerdown", handlePointerDown)
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("open pluto popup", open)
            window.removeEventListener("close pluto popup", close)
            window.removeEventListener("pointerdown", handlePointerDown)
            window.removeEventListener("keydown", handleKeyDown)
        }
    })

    $: if (recent_event != null && recent_event.should_focus === true) {
        requestAnimationFrame(() => {
            element_focused_before_popup = document.activeElement
            const el = element_ref?.querySelector("a, input, button") ?? element_ref
            el?.focus?.()
        })
    } else {
        element_focused_before_popup = null
    }

    $: type = recent_event?.type
</script>

<pluto-popup
    class={cl({
        visible: recent_event != null,
        [type ?? ""]: type != null,
        big: recent_event?.big === true,
        [recent_event?.css_class ?? ""]: recent_event?.css_class != null,
    })}
    style={pos_ref}
    bind:this={element_ref}
>
    {#if type === "nbpkg"}
        <pkg-popup
            class={cl({
                busy: recent_event != null && ((notebook?.nbpkg?.busy_packages ?? []).includes(recent_event.package_name) || 
                       (notebook?.nbpkg?.restart_required_msg == null && !(notebook?.nbpkg?.instantiated ?? true))),
                showterminal,
                showupdate: pkg_status?.offer_update ?? false,
            })}
        >
            {pkg_status?.hint ?? "Loading..."}
            
            {#if (pkg_status?.status === "will_be_installed" || pkg_status?.status === "busy") && timingdata != null && recent_event?.package_name != null}
                {@const estimate = time_estimate(timingdata, [recent_event?.package_name])}
                {@const total_time = estimate == null ? 0 : estimate.install + estimate.load + estimate.precompile}
                {@const total_second_time = estimate == null ? 0 : estimate.load}
                
                {#if total_time > 10}
                    <div class="pkg-time-estimate">
                        {@html th("t_pkg_installation_can_take", {
                            time_install: `<strong>${pretty_long_time(total_time)}</strong>`,
                            time_load: `<strong>${pretty_long_time(total_second_time)}</strong>`,
                        })}
                    </div>
                {/if}
            {/if}
            
            <div class="pkg-buttons">
                {#if !recent_event?.is_disable_pkg && !disable_input && !(notebook?.nbpkg?.waiting_for_permission)}
                    <a
                        class="pkg-update"
                        target="_blank"
                        title={"" + th("t_pkg_update_packages")}
                        style={(pkg_status?.offer_update ?? false) ? "" : "opacity: .4;"}
                        href="#"
                        on:click={(e) => {
                            const busy = recent_event != null && ((notebook?.nbpkg?.busy_packages ?? []).includes(recent_event.package_name) || 
                                   (notebook?.nbpkg?.restart_required_msg == null && !(notebook?.nbpkg?.instantiated ?? true)))
                            if (busy) {
                                alert(t("t_pkg_currently_busy"))
                            } else {
                                if (confirm(t("t_pkg_update_packages_description"))) {
                                    console.warn("Pkg.updating!")
                                    // pluto_actions.send("pkg_update", {}, { notebook_id: notebook.notebook_id })
                                }
                            }
                            e.preventDefault()
                        }}
                    >
                        <img alt="⬆️" src={arrow_up_circle_icon} width="17" />
                    </a>
                {/if}
                
                {#if notebook?.nbpkg?.terminal_outputs != null && recent_event?.package_name}
                    {@const terminal_value = notebook?.nbpkg?.terminal_outputs[recent_event?.package_name] ?? ""}
                    <a
                        class="toggle-terminal"
                        target="_blank"
                        title={"" + t("t_pkg_toggle_terminal")}
                        style={terminal_value ? "" : "display: none;"}
                        href="#"
                        on:click={(e) => {
                            showterminal = !showterminal
                            e.preventDefault()
                        }}
                    >
                        <img alt="📄" src={document_text_icon} width="17" />
                    </a>
                {/if}
                
                <a class="help" target="_blank" title={"" + t("t_pkg_go_to_help")} href="https://plutojl.org/pkg/">
                    <img alt="❔" src={help_circle_icon} width="17" />
                </a>
            </div>
            
            {#if notebook?.nbpkg?.terminal_outputs != null && recent_event?.package_name}
                {@const terminal_value = notebook?.nbpkg?.terminal_outputs[recent_event?.package_name] ?? ""}
                <PkgTerminalView value={terminal_value || t("t_loading_ellipses")} />
            {:else}
                <PkgTerminalView value={t("t_loading_ellipses")} />
            {/if}
        </pkg-popup>
    {:else if type === "info" || type === "warn"}
        <div>{recent_event?.body}</div>
    {/if}
</pluto-popup>