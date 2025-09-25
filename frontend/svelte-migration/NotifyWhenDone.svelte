<script>
    import { cl } from "../common/ClassTable.js"
    import { is_finished, total_done } from "./status-utils.js"
    import { onDestroy } from 'svelte'
    import { get_included_external_source } from '../common/external_source.js'
    
    // 延迟真值函数 - 组件内部实现
  // 延迟真值函数 - 组件内部实现
  function useDelayedTruth(x, timeout) {
    let output = false
    let timeoutId = null
    
    $: if (x) {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        output = true
      }, timeout)
    } else {
      output = false
      if (timeoutId) clearTimeout(timeoutId)
    }
    
    return output
  }
    // 获取logo URL
    const url_logo_small = get_included_external_source("pluto-logo-small")?.href
    import { open_pluto_popup } from "../common/open_pluto_popup.js"
    import { t, th } from "../common/lang.js"
    
    export let status
    
    $: all_done = Object.values(status.subtasks).every(is_finished)
    
    let enabled = false
    let notification = null
    let timeouthandler = null
    
    $: {
        if (enabled && all_done) {
            console.log("all done")
            
            timeouthandler = setTimeout(() => {
                enabled = false
                let count = total_done(status)
                notification = new Notification(t("t_ready_notif_title"), {
                    tag: "notebook ready",
                    body: t("t_ready_notif_body", { count }),
                    lang: "en-US",
                    dir: "ltr",
                    icon: url_logo_small,
                })
                notification.onclick = (e) => {
                    parent.focus()
                    window.focus()
                    notification?.close()
                }
            }, 3000)
            
            const vishandler = () => {
                if (document.visibilityState === "visible") {
                    notification?.close()
                }
            }
            document.addEventListener("visibilitychange", vishandler)
            document.body.addEventListener("click", vishandler)
            
            // Cleanup function
            // 定义清理函数
            const cleanup = () => {
                notification?.close()
                clearTimeout(timeouthandler)
                document.removeEventListener("visibilitychange", vishandler)
                document.body.removeEventListener("click", vishandler)
            }
            // 组件销毁时调用清理函数
            onDestroy(cleanup)
        }
    }
    
    $: visible = useDelayedTruth(!all_done, 2500) || enabled
    
    const handleInput = (e) => {
        if (e.target.checked) {
            Notification.requestPermission().then((r) => {
                console.log(r)
                const granted = r === "granted"
                enabled = granted
                e.target.checked = granted
                
                if (!granted) {
                    open_pluto_popup({
                        type: "warn",
                        body: th("t_ready_notif_permission"),
                    })
                }
            })
        } else {
            enabled = false
        }
    }
</script>

<div class={cl({ visible, "notify-when-done": true })} inert={!visible}>
    <label>
        {t("t_ready_notif")}
        <input
            type="checkbox"
            checked={enabled}
            disabled={!visible}
            on:input={handleInput}
        />
    </label>
</div>