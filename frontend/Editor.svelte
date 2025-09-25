<script>
  import { onMount, onDestroy } from 'svelte'
  import { createEditorStore, createStatusStore, createActionsStore } from './svelte-migration/editor-stores.js'
//   import { parse_launch_params } from './common/parse_launch_params.js'
  import { read_Uint8Array_with_progress } from './components/FetchProgressUtils.js'
  import { unpack } from './common/MsgPack.js'
  import EditorImproved from './svelte-migration/Editor.svelte'
  import FetchProgress from './components/FetchProgress.svelte'
  import { ProcessStatus } from './common/ProcessStatus.js'
  import _ from './imports/lodash.js'
export const parse_launch_params = () => {
    const url_params = new URLSearchParams(window.location.search)

    return {
        //@ts-ignore
        notebook_id: url_params.get("id") ?? window.pluto_notebook_id,
        //@ts-ignore
        statefile: url_params.get("statefile") ?? window.pluto_statefile,
        //@ts-ignore
        statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
        //@ts-ignore
        notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
        //@ts-ignore
        notebookfile_integrity: url_params.get("notebookfile_integrity") ?? window.pluto_notebookfile_integrity,
        //@ts-ignore
        disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
        //@ts-ignore
        preamble_html: url_params.get("preamble_html") ?? window.pluto_preamble_html,
        //@ts-ignore
        isolated_cell_ids: url_params.has("isolated_cell_id") ? url_params.getAll("isolated_cell_id") : window.pluto_isolated_cell_ids,
        //@ts-ignore
        binder_url: url_params.get("binder_url") ?? window.pluto_binder_url,
        //@ts-ignore
        pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_pluto_server_url,
        //@ts-ignore
        slider_server_url: url_params.get("slider_server_url") ?? window.pluto_slider_server_url,
        //@ts-ignore
        recording_url: url_params.get("recording_url") ?? window.pluto_recording_url,
        //@ts-ignore
        recording_url_integrity: url_params.get("recording_url_integrity") ?? window.pluto_recording_url_integrity,
        //@ts-ignore
        recording_audio_url: url_params.get("recording_audio_url") ?? window.pluto_recording_audio_url,
    }
}
  // Props
  export let launch_params = {}
  export let skip_custom_element = false

  // 状态管理
  let editorStore
  let statusStore
  let actionsStore
  let unsubscribe
  let statefile_download_progress = null
  let error = null
  let ready = false

  // 工具函数
  const truthy = (x) => x === "" || x === "true"
  const falsey = (x) => x === "false"
  const is_editor_embedded_inside_editor = (element) => element.parentElement?.closest("pluto-editor") != null
  const without_path_entries = (state) => {
      // 移除路径信息，用于静态预览状态
      const newState = { ...state }
      if (newState.path) newState.path = ""
      if (newState.shortpath) newState.shortpath = ""
      return newState
  }

  // set_disable_ui_css 函数 - 与 editor-stores.js 保持一致
  const set_disable_ui_css = (/** @type {boolean} */ val, /** @type {HTMLElement} */ element) => {
      element.classList.toggle("disable_ui", val)
  }

  // empty_notebook_state 函数 - 与 editor.js 保持一致
  const empty_notebook_state = ({ notebook_id }) => ({
      metadata: {},
      notebook_id: notebook_id,
      path: "",
      shortpath: "",
      in_temp_dir: true,
      process_status: ProcessStatus.starting,
      last_save_time: 0.0,
      last_hot_reload_time: 0.0,
      cell_inputs: {},
      cell_results: {},
      cell_dependencies: {},
      cell_order: [],
      cell_execution_order: [],
      published_objects: {},
      bonds: {},
      nbpkg: null,
      status_tree: null,
  })



  // 获取状态文件函数
  const get_statefile = 
      // @ts-ignore
      window?.pluto_injected_environment?.custom_get_statefile?.(read_Uint8Array_with_progress, without_path_entries, unpack) ??
      (async (launch_params, set_statefile_download_progress) => {
          set_statefile_download_progress("indeterminate")
          const response = await fetch(new Request(launch_params.statefile, { 
              integrity: launch_params.statefile_integrity ?? undefined 
          }), {
              // @ts-ignore
              priority: "high",
          })
          set_statefile_download_progress(0.2)
          const data = await read_Uint8Array_with_progress(response, (x) => set_statefile_download_progress(x * 0.8 + 0.2))
          const state = without_path_entries(unpack(data))
          return state
      })

  // 从元素属性获取参数值
  const from_attribute = (element, name) => {
      const val = element.getAttribute(name) ?? element.getAttribute(name.replaceAll("_", "-"))
      if (name === "disable_ui") {
          return truthy(val) ? true : falsey(val) ? false : null
      } else if (name === "isolated_cell_id") {
          return val == null ? null : val.split(",")
      } else {
          return val
      }
  }

  // 加载状态文件
  async function loadStatefile(launch_params) {
      console.log("开始加载状态文件...")
      
      try {
          const set_statefile_download_progress = (progress) => {
              console.log("下载进度:", progress)
              if (progress === "indeterminate") {
                  statefile_download_progress = null
              } else {
                  statefile_download_progress = progress
              }
          }
          
          console.log("调用 get_statefile...")
          const state = await get_statefile(launch_params, set_statefile_download_progress)
          console.log("状态文件加载成功:", state)
          
          if (editorStore) {
              editorStore.update(current => ({
                  ...current,
                  notebook: state,
                  initializing: false
              }))
              console.log("编辑器状态已更新")
          } else {
              console.error("editorStore 未初始化")
          }
          
          ready = true
          statefile_download_progress = null
          console.log("状态文件加载流程完成")
          
      } catch (err) {
          console.error('❌ Failed to load statefile:', err)
          error = err
          ready = false
      }
  }

  onMount(async () => {
      console.log("Editor.svelte onMount 开始初始化...")
      
      if (skip_custom_element) {
          console.log("跳过自定义元素初始化")
          return
      }
      
      try {
          // 使用传入的 launch_params 或解析默认参数
          const final_launch_params = launch_params && Object.keys(launch_params).length > 0 
              ? launch_params 
              : parse_launch_params()
          
          console.log("Launch parameters: ", final_launch_params)
          
          // 设置 UI 禁用状态
          if (final_launch_params.disable_ui) {
              set_disable_ui_css(final_launch_params.disable_ui, document.body)
          }
          
          // 创建状态管理
          const initial_state = empty_notebook_state(final_launch_params)
          editorStore = createEditorStore(final_launch_params, initial_state)
          statusStore = createStatusStore(editorStore, final_launch_params)
          
          // 创建动作存储
          actionsStore = createActionsStore(editorStore, null, final_launch_params)
          
          // 订阅状态变化
          unsubscribe = editorStore.subscribe(state => {
              console.log("Editor store state updated:", state)
          })
          
          console.log("状态管理创建完成，准备加载状态文件...")
          
          // 处理静态预览
          if (final_launch_params.statefile) {
              console.log("检测到 statefile，开始加载...")
              await loadStatefile(final_launch_params)
          } else {
              console.log("没有 statefile，直接设置为就绪状态")
              ready = true
          }
          
          console.log("✅ Editor.svelte 初始化完成！")
          
      } catch (err) {
          console.error('❌ Failed to initialize Svelte editor:', err)
          error = err
          ready = false
      }
  })

  onDestroy(() => {
      if (unsubscribe) unsubscribe()
  })
</script>

{#if error}
  <main style="font-family: system-ui, sans-serif; padding: 2rem;">
      <h2>Failed to load notebook</h2>
      <p>The statefile failed to download. Original error message:</p>
      <pre style="overflow: auto; background: #f5f5f5; padding: 1rem; border-radius: 4px;">
          <code>{error.toString()}</code>
      </pre>
      <p>Launch parameters:</p>
      <pre style="overflow: auto; background: #f5f5f5; padding: 1rem; border-radius: 4px;">
          <code>{JSON.stringify(launch_params, null, 2)}</code>
      </pre>
  </main>
{:else if !ready}
  <div class="loading-container">
      <FetchProgress progress={statefile_download_progress} />
  </div>
{:else}
  {#if editorStore && statusStore && actionsStore}
    <EditorImproved 
      {launch_params}
      initial_notebook_state={$editorStore.notebook}
      pluto_editor_element={null}
    />
  {/if}
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(.loading-container) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, sans-serif;
  }
  
  :global(.loading-message) {
      width: 300px;
      text-align: center;
  }
  
  :global(.error-container) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, sans-serif;
  }
  
  :global(.error-message) {
      width: 600px;
      max-width: 90vw;
      text-align: center;
      color: #d32f2f;
  }
  
  :global(.error-message pre) {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      text-align: left;
      font-size: 0.8rem;
  }
  

</style>