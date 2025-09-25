<script>
  import { onMount, onDestroy } from "svelte"
  import _ from "../imports/lodash.js"
  
  // @ts-ignore
  import dialogPolyfill from "https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js"
  import { t, th } from "../common/lang.js"
  import { exportNotebookDesktop } from "../svelte-migration/ExportBanner-utils.js"
  
  export let notebook_id
  
  let dialog_ref
  let open_event_detail = {}
  let { download_url, download_filename } = open_event_detail
  
  let upload_flow_state = "waiting"
  let plutoland_data = {}
  let upload_progress = 0
  let fake_progressing = false
  let fake_progress_start_time = null
  let fake_progress_interval = null
  
  // Reactive statement for fake progress calculation
  $: if (fake_progressing && fake_progress_start_time) {
    const elapsed = Date.now() - fake_progress_start_time
    const y = 1.0 - Math.exp(-2 * (elapsed / 1000))
    upload_progress = Math.min(0.7 + y * 0.3, 1.0)
  }
  
  // Start fake progress when needed
  $: if (fake_progressing && !fake_progress_start_time) {
    fake_progress_start_time = Date.now()
  } else if (!fake_progressing) {
    fake_progress_start_time = null
  }
  
  // Svelte version of useDialog functionality
  function initializeDialog() {
    if (dialog_ref != null && typeof HTMLDialogElement !== "function") {
      dialogPolyfill.registerDialog(dialog_ref)
    }
  }
  
  function openDialog() {
    if (!dialog_ref?.open) {
      dialog_ref?.showModal()
      requestAnimationFrame(() => {
        dialog_ref?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" })
      })
    }
  }
  
  function toggleDialog() {
    if (dialog_ref?.open === true) {
      dialog_ref?.close?.()
    } else {
      dialog_ref?.showModal?.()
    }
  }
  
  // Svelte version of useEventListener functionality
  function useEventListener(element, event_name, handler, deps = []) {
    let handler_cached = handler
    
    const addListener = () => {
      const useme = element == null || element instanceof Document || element instanceof HTMLElement || 
                   element instanceof Window || element instanceof EventSource || element instanceof MediaQueryList
                   ? element : (element?.current || element)
      
      if (useme == null) return
      useme.addEventListener(event_name, handler_cached)
      return () => useme.removeEventListener(event_name, handler_cached)
    }
    
    return addListener()
  }
  
  let handleOpenPlutoHtmlExport
  
  onMount(() => {
    // Initialize dialog polyfill
    initializeDialog()
    
    handleOpenPlutoHtmlExport = (e) => {
      open_event_detail = e.detail
      openDialog()
    }
    
    // Use Svelte event listener
    const cleanup = useEventListener(window, "open pluto html export", handleOpenPlutoHtmlExport)
    
    return () => {
      if (cleanup) cleanup()
      if (fake_progress_interval) {
        clearInterval(fake_progress_interval)
      }
    }
  })
  
  onDestroy(() => {
    if (fake_progress_interval) {
      clearInterval(fake_progress_interval)
    }
  })
  
  function closeDialog() {
    if (dialog_ref?.open === true) {
      dialog_ref?.close?.()
    }
    // Reset state when closing
    upload_flow_state = "waiting"
    plutoland_data = {}
    upload_progress = 0
    fake_progressing = false
    fake_progress_start_time = null
    if (fake_progress_interval) {
      clearInterval(fake_progress_interval)
      fake_progress_interval = null
    }
  }
  
  async function onPlutoLandUpload() {
    try {
      upload_flow_state = "generating"
      upload_progress = 0
      
      const notebook_response = await fetch(String(download_url))
      const notebook_blob = await notebook_response.blob()
      
      upload_flow_state = "uploading"
      upload_progress = 0.1
      const response = await upload_to_plutoland(notebook_blob, (progress) => {
        upload_progress = 0.1 + progress * 0.6
        if (progress >= 1.0) fake_progressing = true
      })
      
      console.log(response)
      
      if (response.status === 200) {
        const data = JSON.parse(response.response)
        console.log(data)
        plutoland_data = data
        upload_flow_state = "success"
      } else {
        upload_flow_state = "error: Upload failed"
      }
    } catch (error) {
      upload_flow_state = "error: " + error
    }
  }
  
  function InlineIonicon(icon_name) {
    return `<span class="ionicon-icon" data-icon="${icon_name}" data-inline="true"></span>`
  }
  
  // Transfer file data to the pluto.land API
  function upload_to_plutoland(filesource, onprogress = (val, xhr) => {}) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest()
      
      xhr.onload = function (e) {
        console.log("done", e, xhr)
        onprogress(1.0, xhr)
        resolve(xhr)
      }
      
      xhr.onerror = reject
      xhr.onabort = reject
      
      xhr.open("POST", "https://pluto.land/n", true)
      
      xhr.upload.onprogress = function (e) {
        console.log("progress", e, xhr)
        let progress = e.loaded / e.total
        onprogress(progress, xhr)
      }
      
      let data = new FormData()
      data.append("file0", filesource)
      xhr.send(data)
    })
  }
  
  async function deletePlutoLandNote() {
    if (!plutoland_data.id || !plutoland_data.creation_secret) return
    
    try {
      await fetch(`https://pluto.land/n/${plutoland_data.id}`, {
        method: "DELETE",
        headers: {
          "X-Creation-Secret": String(plutoland_data.creation_secret),
        },
      })
      upload_flow_state = "waiting"
      plutoland_data = {}
    } catch (error) {
      console.error("Failed to delete notebook:", error)
    }
  }
  
  $: is_recording = open_event_detail.is_recording ?? false
  $: ({ download_url, download_filename } = open_event_detail)
</script>

<dialog bind:this={dialog_ref} class="export-html-dialog">
  <div class="ple-download ple-option">
    <p>{@html th(is_recording ? "t_plutoland_download_description_recording" : "t_plutoland_download_description")}</p>
    <div class="ple-bigbutton-container">
      <a
        class="ple-bigbutton"
        href={download_url}
        target="_blank"
        download={download_filename ?? ""}
        on:click={(e) => {
          exportNotebookDesktop(e, 1, notebook_id)
          closeDialog()
        }}
      >
        {@html th("t_plutoland_download")} {@html InlineIonicon("download-outline")}
      </a>
    </div>
  </div>
  <div class="ple-or" aria-hidden="true"><span>{@html th("t_plutoland_choose_up_or_down")}</span></div>
  <div class="ple-plutoland ple-option">
    <p>
      {@html th(is_recording ? "t_plutoland_upload_description_recording" : "t_plutoland_upload_description", {
        plutoland: `<a href="https://pluto.land/" target="_blank">pluto.land</a>`,
      })}
    </p>
    <div class="ple-bigbutton-container">
      {#if upload_flow_state === "waiting"}
        <a
          class="ple-bigbutton"
          href="https://pluto.land/"
          target="_blank"
          download=""
          on:click={(e) => {
            e.preventDefault()
            onPlutoLandUpload()
          }}
        >
          {@html th("t_plutoland_upload_upload", {
            plutoland: "<strong>pluto.land</strong>",
          })} {@html InlineIonicon("cloud-upload-outline")}
        </a>
      {:else if upload_flow_state === "uploading" || upload_flow_state === "generating"}
        <div class="ple-plutoland-phase">
          <p>{@html th("t_plutoland_upload_uploading")}</p>
          <progress class="ple-plutoland-progress" max="100" value={upload_progress * 100}>
            {Math.round(upload_progress * 100)}%
          </progress>
        </div>
      {:else if upload_flow_state === "success"}
        <div class="ple-plutoland-phase">
          <p>{@html th(is_recording ? "t_plutoland_upload_success_recording" : "t_plutoland_upload_success")}</p>
          <div class="ple-plutoland-url-container">
            <a href={`https://pluto.land/n/${plutoland_data.id}`} target="_blank" class="ple-plutoland-url">
              {`https://pluto.land/n/${plutoland_data.id}`}
            </a>
            <a
              href="#"
              title={t("t_plutoland_upload_delete")}
              on:click={async (e) => {
                e.preventDefault()
                await deletePlutoLandNote()
              }}
            >
              {@html InlineIonicon("trash-bin-outline")}
            </a>
          </div>
        </div>
      {:else}
        <div class="ple-plutoland-phase">Error: {upload_flow_state}</div>
      {/if}
    </div>
  </div>
  <div class="final"><button on:click={closeDialog}>{t("t_frontmatter_cancel")}</button></div>
</dialog>