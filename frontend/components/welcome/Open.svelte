<script>
  import FilePicker from '../../svelte-migration/FilePicker.svelte'
  import PasteHandler from '../PasteHandler.svelte'
  import { guess_notebook_location } from '../../common/NotebookLocationFromURL.js'
  import { t, th } from '../../common/lang.js'

  /** @type {import('../../common/PlutoConnection').PlutoConnection | null} */
  export let client = null
  // export let connected = false
  export let CustomPicker = null
  // export let show_samples = true
  export let on_start_navigation = (message, bool) => {}

  import { link_open_path, link_open_url, link_edit } from './openUtils.js'

  async function on_open_path(new_path) {
    const processed = await guess_notebook_location(new_path)
    on_start_navigation(processed.display_url ?? processed.path_or_url, false)
    window.location.href = (processed.type === "path" ? link_open_path(processed.path_or_url) : link_open_url(processed.path_or_url))
  }

  async function desktop_on_open_path(_p) {
    window.plutoDesktop?.fileSystem.openNotebook("path")
  }

  async function desktop_on_open_url(url) {
    window.plutoDesktop?.fileSystem.openNotebook("url", url)
  }

  $: picker = CustomPicker ?? {
    text: t("t_open_a_notebook_action"),
    placeholder: t("t_enter_path_or_url"),
  }
</script>

<PasteHandler {on_start_navigation} />
<h2>{picker.text}</h2>
<div id="new" class={!!window.plutoDesktop ? "desktop_opener" : ""}>
  <FilePicker
    {client}
    value=""
    on_submit={on_open_path}
    on_desktop_submit={desktop_on_open_path}
    clear_on_blur={false}
    button_label={window.plutoDesktop ? t("t_open_file_action") : t("t_open_action")}
    placeholder={picker.placeholder}
  />
  {#if window.plutoDesktop != null}
    <FilePicker
      {client}
      value=""
      on_desktop_submit={desktop_on_open_url}
      button_label={t("t_open_from_url_action")}
      placeholder={picker.placeholder}
    />
  {/if}
</div>