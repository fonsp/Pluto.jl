<script>
  import { onMount } from 'svelte'
  import _ from '../../imports/lodash.js'
  import { cl } from '../../common/ClassTable.js'
  import { link_edit, link_open_path } from './openUtils.js'
  import { ProcessStatus } from '../../common/ProcessStatus.js'
  import { t, th } from '../../common/lang.js'

  /** @type {import('../../common/PlutoConnection').PlutoConnection | null} */
  export let client = null
  export let connected = false
  export let remote_notebooks = []
  /** @type {any} */
  export let CustomRecent = null
  export let on_start_navigation = (message, bool) => {}

  let combined_notebooks = null
  let combined_notebooks_ref = []
  
  // Add initial debugging
  console.log("Recent component initialized, client:", client, "connected:", connected, "remote_notebooks:", remote_notebooks)

  function set_notebook_state(path, new_state_props) {
    combined_notebooks = combined_notebooks?.map((nb) => {
      return nb.path == path ? { ...nb, ...new_state_props } : nb
    }) ?? null
  }

  function entry_notrunning(path) {
    return {
      transitioning: false,
      entry: undefined,
      path: path,
    }
  }

  function entry_running(entry) {
    return {
      transitioning: false,
      entry,
      path: entry.path,
    }
  }

  function split_at_level(path, level) {
    return path.split(/\/|\\/).slice(-level).join("/")
  }

  function shortest_path(path, allpaths) {
    let level = 1
    if (allpaths) {
      for (const otherpath of allpaths) {
        if (otherpath !== path) {
          while (split_at_level(path, level) === split_at_level(otherpath, level)) {
            level++
          }
        }
      }
    }
    return split_at_level(path, level)
  }

  function get_stored_recent_notebooks() {
    const storedString = localStorage.getItem("recent notebooks")
    console.log("LocalStorage recent notebooks:", storedString)
    const storedData = storedString != null ? JSON.parse(storedString) : []
    const storedList = storedData instanceof Array ? storedData : []
    console.log("Parsed recent notebooks:", storedList)
    return storedList.map(entry_notrunning)
  }

  function remove_notebook_from_storage(path) {
    const stored_recent_notebooks = get_stored_recent_notebooks()
    const updated_notebooks = stored_recent_notebooks.filter((nb) => nb.path !== path)
    localStorage.setItem("recent notebooks", JSON.stringify(updated_notebooks.map((nb) => nb.path)))
  }

  onMount(() => {
    console.log("onMount called, client:", client, "connected:", connected)
    if (client != null && connected) {
      // @ts-ignore
      client.send("get_all_notebooks", {}, {}).then(({ message }) => {
        const running = message.notebooks.map((nb) => entry_running(nb))
        console.log("Running notebooks from server:", running)

        const recent_notebooks = get_stored_recent_notebooks()

        // show running notebooks first, in the order defined by the recent notebooks, then recent notebooks
        const combined = [
          ..._.sortBy(running, [(nb) => _.findIndex([...recent_notebooks, ...running], (r) => r.path === nb.path)]),
          ..._.differenceBy(recent_notebooks, running, (nb) => nb.path),
        ]
        console.log("Combined notebooks:", combined)

        combined_notebooks = combined

        document.body.classList.remove("loading")
      }).catch((error) => {
        console.error("Failed to load notebooks from server:", error)
        // Fallback to local storage only
        combined_notebooks = get_stored_recent_notebooks()
        document.body.classList.remove("loading")
      })
    } else {
      // Fallback to local storage when client is not connected
      console.log("Client not connected, falling back to local storage")
      combined_notebooks = get_stored_recent_notebooks()
      document.body.classList.remove("loading")
    }
  })

  $: if (remote_notebooks && combined_notebooks != null) {
    // a notebook list updates happened while the welcome screen is open
    const new_running = remote_notebooks

    // already rendered notebooks will be added to this list:
    const rendered_and_running = []

    const new_combined_notebooks = combined_notebooks.map((nb) => {
      // try to find a matching notebook in the remote list
      let running_version = null

      if (nb.entry != null) {
        // match notebook_ids to handle a path change
        running_version = new_running.find((rnb) => rnb.notebook_id === nb.entry?.notebook_id)
      } else {
        // match paths to handle a notebook bootup
        running_version = new_running.find((rnb) => rnb.path === nb.path)
      }

      if (running_version == null) {
        return entry_notrunning(nb.path)
      } else {
        const new_notebook = entry_running(running_version)
        rendered_and_running.push(running_version)
        return new_notebook
      }
    })

    const not_rendered_but_running = new_running.filter((rnb) => !rendered_and_running.includes(rnb)).map(entry_running)

    combined_notebooks = [...not_rendered_but_running, ...new_combined_notebooks]
  }

  $: document.body.classList.toggle("nosessions", !(combined_notebooks == null || combined_notebooks.length > 0))
  
  // Add debugging for the nosessions class
  $: console.log("nosessions class toggled:", !(combined_notebooks == null || combined_notebooks.length > 0), "combined_notebooks:", combined_notebooks)

  function on_session_click(nb) {
    if (nb.transitioning) {
      return
    }
    const running = nb.entry != null
    if (running) {
      if (client == null) return
      if (
        confirm(nb.entry?.process_status === ProcessStatus.waiting_for_permission ? t("t_close_notebook_session") : t("t_shut_down_notebook_process"))
      ) {
        set_notebook_state(nb.path, {
          running: false,
          transitioning: true,
        })
        client.send("shutdown_notebook", { keep_in_session: false }, { notebook_id: nb.entry?.notebook_id }, false)
      }
    } else {
      set_notebook_state(nb.path, {
        transitioning: true,
      })
      fetch(link_open_path(nb.path) + "&execution_allowed=true", {
        method: "GET",
      })
        .then((r) => {
          if (!r.redirected) {
            throw new Error("file not found maybe? try opening the notebook directly")
          }
        })
        .catch((e) => {
          console.error("Failed to start notebook in background")
          console.error(e)
          set_notebook_state(nb.path, {
            transitioning: false,
            notebook_id: null,
          })
        })
    }
  }

  function on_clear_click(nb) {
    // Remove from localStorage
    remove_notebook_from_storage(nb.path)

    // Remove from component state
    combined_notebooks = combined_notebooks?.filter((n) => n.path !== nb.path) ?? null
  }

  $: all_paths = combined_notebooks?.map((nb) => nb.path)
  
  // 计算用于传递给自定义组件的 recents 数据
  $: recents = combined_notebooks == null
    ? []
    : combined_notebooks.map((nb) => {
        const running = nb.entry != null
        return {
          key: nb.path,
          class: cl({
            running: running,
            recent: !running,
            transitioning: nb.transitioning,
          }),
          onclick: () => on_session_click(nb),
          title: running
            ? nb.entry?.process_status === ProcessStatus.waiting_for_permission
              ? t("t_stop_notebook_session")
              : t("t_shut_down_notebook")
            : t("t_start_notebook_in_background"),
          href: running ? link_edit(nb.entry?.notebook_id) : link_open_path(nb.path),
          path: nb.path,
          short_path: shortest_path(nb.path, all_paths),
          is_running: running,
          is_transitioning: nb.transitioning,
          on_clear_click: (e) => {
            e.preventDefault()
            e.stopPropagation()
            on_clear_click(nb)
          }
        }
      })
</script>

{#if CustomRecent == null}
  <h2>{t("t_my_work")}</h2>
  <ul id="recent" class="show_scrollbar">
    <li class="new">
      <a
        href="new"
        on:click={(e) => {
          on_start_navigation(t("t_loading_something_new_notebook"), false)
        }}
      >
        <button aria-label={String(th("t_newnotebook"))}><span class="ionicon"></span></button>
        {th("t_newnotebook")}
      </a>
    </li>
    
    {#if combined_notebooks == null}
      <li class="not_yet_ready"><em>{t("t_loading_ellipses")}</em></li>
    {:else if combined_notebooks.length === 0}
      <li class="no_notebooks"><em>{t("t_no")} recent notebooks</em></li>
    {:else}
      {#each combined_notebooks as nb (nb.path)}
        {@const running = nb.entry != null}
        {@const short_path = shortest_path(nb.path, all_paths)}
        <li class={cl({
          running: running,
          recent: !running,
          transitioning: nb.transitioning,
        })}>
          <button
            on:click={() => on_session_click(nb)}
            title={running
              ? nb.entry?.process_status === ProcessStatus.waiting_for_permission
                ? t("t_stop_notebook_session")
                : t("t_shut_down_notebook")
              : t("t_start_notebook_in_background")}
            aria-label={running
              ? nb.entry?.process_status === ProcessStatus.waiting_for_permission
                ? t("t_stop_notebook_session")
                : t("t_shut_down_notebook")
              : t("t_start_notebook_in_background")}
          >
            <span class="ionicon"></span>
          </button>
          <a
            href={running ? link_edit(nb.entry?.notebook_id) : link_open_path(nb.path)}
            title={nb.path}
            on:click={(e) => {
                if (!running) {
                    on_start_navigation(short_path, false)
                    set_notebook_state(nb.path, {
                        transitioning: true,
                    })
                }
            }}
          >{short_path}</a>
          {#if !running && !nb.transitioning}
            <button
              class="clear-btn"
              on:click={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  on_clear_click(nb)
              }}
              title={t("t_remove_from_recent_notebooks")}
              aria-label={t("t_remove_from_recent_notebooks")}
            >
              {t("t_FORGET")}
            </button>
          {/if}
        </li>
      {/each}
    {/if}
  </ul>
{:else}
  <!-- 直接渲染 CustomRecent 组件并传递 props -->
  <div>
    <svelte:component 
      this={CustomRecent}
      cl={cl}
      combined={combined_notebooks}
      {client}
      {recents}
      on_start_navigation={on_start_navigation}
    />
  </div>
{/if}

<style>
  .no_notebooks {
    padding: 1rem;
    text-align: center;
    color: var(--text-color, #666);
    font-style: italic;
    display: block !important; /* Ensure it's always visible */
    visibility: visible !important;
  }
  
  /* Ensure the recent list is visible even when empty */
  #recent {
    min-height: 3em;
  }
</style>