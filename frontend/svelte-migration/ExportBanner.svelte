<script>
  import { onMount, createEventDispatcher } from 'svelte';
  //@ts-ignore
  import dialogPolyfill from "https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js";
  import { getCurrentLanguage, t, th } from "../common/lang.js";
  import { exportNotebookDesktop, WarnForVisisblePasswords } from "./ExportBanner-utils.js";
  
  export let notebook_id;
  export let print_title;
  export let open = false;
  export let onClose = () => {};
  export let notebookfile_url;
  export let notebookexport_url;
  export let start_recording = () => {};
  
  const dispatch = createEventDispatcher();
  
  let element_ref = null;
  let print_old_title = "";
  
  // Circle SVG component
  const Circle = ({ fill }) => `
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      style="
        height: .7em;
        width: .7em;
        margin-left: .3em;
        margin-right: .2em;
      "
    >
      <circle cx="24" cy="24" r="24" fill="${fill}"></circle>
    </svg>
  `;
  
  // Triangle SVG component
  const Triangle = ({ fill }) => `
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
      <polygon points="24,0 48,40 0,40" fill="${fill}" stroke="none" />
    </svg>
  `;
  
  // Square SVG component
  const Square = ({ fill }) => `
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
      <polygon points="0,0 0,40 40,40 40,0" fill="${fill}" stroke="none" />
    </svg>
  `;
  

  
  function handleBeforePrint(e) {
    if (!e.detail?.fake) {
      print_old_title = document.title;
      document.title = print_title.replace(/\.jl$/, "").replace(/\.plutojl$/, "");
    }
  }
  
  function handleAfterPrint() {
    document.title = print_old_title;
  }
  
  function handleFocusOut() {
    if (!element_ref?.matches(":focus-within")) {
      onClose();
    }
  }
  
  function handleNotebookFileClick(e) {
    exportNotebookDesktop(e, 0, notebook_id);
  }
  
  function handleHtmlExportClick(e) {
    e.preventDefault();
    WarnForVisisblePasswords();
    window.dispatchEvent(new CustomEvent("open pluto html export", { 
      detail: { download_url: notebookexport_url } 
    }));
  }
  
  function handleRecordClick(e) {
    e.preventDefault();
    WarnForVisisblePasswords();
    start_recording();
    onClose();
  }
  
  function handleFrontmatterClick() {
    onClose();
    window.dispatchEvent(new CustomEvent("open pluto frontmatter"));
  }
  
  function handlePresentationClick() {
    onClose();
    // @ts-ignore - present function may not exist
    window.present?.();
  }
  
  // Reactive variables
  $: prideMonth = new Date().getMonth() === 5;
  $: dataSize = getCurrentLanguage() === "el" ? "26" : 
               getCurrentLanguage() === "de" ? "24" : 
               getCurrentLanguage() === "pt-PT" ? "26" : null;
  
  $: if (element_ref && typeof HTMLDialogElement !== "function") {
    dialogPolyfill.registerDialog(element_ref);
  }
  
  $: if (element_ref) {
    if (open) {
      if (element_ref.open === false) {
        element_ref.show?.();
      }
    } else {
      if (element_ref.open) {
        element_ref.close?.();
      }
    }
  }
  
  onMount(() => {
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  });
</script>

<svelte:window />

<dialog 
  id="export" 
  inert={!open} 
  open={open} 
  bind:this={element_ref}
  class:pride={prideMonth}
  on:focusout={handleFocusOut}
>
  <div id="container">
    <div class="export_title">{t("t_export_category_export")}</div>
    <!-- no "download" attribute here: we want the jl contents to be shown in a new tab -->
    <a href={notebookfile_url} target="_blank" class="export_card" on:click={handleNotebookFileClick}>
      <header role="none">
        {@html Triangle({ fill: "#a270ba" })} 
        {t("t_export_card_notebook_file")}
      </header>
      <section>{th("t_export_card_notebook_file_description")}</section>
    </a>
    <a
      href={notebookexport_url}
      target="_blank"
      class="export_card"
      download=""
      on:click={handleHtmlExportClick}
    >
      <header role="none">
        {@html Square({ fill: "#E86F51" })} 
        {t("t_export_card_static_html")}
      </header>
      <section>{th("t_export_card_static_html_description")}</section>
    </a>
    <a href="#" class="export_card" on:click={() => window.print()}>
      <header role="none">
        {@html Square({ fill: "#619b3d" })}
        {t("t_export_card_pdf")}
      </header>
      <section>{th("t_export_card_pdf_description")}</section>
    </a>
    
    <div class="export_title">{t("t_export_category_record")}</div>
    <a
      href="#"
      on:click={handleRecordClick}
      class="export_card"
      data-size={dataSize}
    >
      <header role="none">
        {@html Circle({ fill: "#E86F51" })}
        {th("t_export_card_record")}
      </header>
      <section>{th("t_export_card_record_description")}</section>
    </a>
    
    {#if prideMonth}
      <div class="pride_message">
        <p>{th("t_export_card_pride_month_message")}</p>
      </div>
    {/if}
  </div>
  
  <div class="export_small_btns">
    <button
      title={t("t_edit_frontmatter")}
      class="toggle_frontmatter_edit"
      on:click={handleFrontmatterClick}
    >
      <span></span>
    </button>
    <button
      title={t("t_start_presentation")}
      class="toggle_presentation"
      on:click={handlePresentationClick}
    >
      <span></span>
    </button>
    <button title={t("t_close")} class="toggle_export" on:click={onClose}>
      <span></span>
    </button>
  </div>
</dialog>

<style>
  dialog {
    position: absolute;
    display: block;
    top: 0;
    width: 100%;
    height: var(--header-height);
    background: var(--export-bg-color);
    color: var(--export-color);
    transform: translateY(calc(-100% - 1px));
    overflow: visible;
    margin: 0;
    padding: 0;
    max-width: none;
    max-height: none;
    border: none;
  }
  
  dialog::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    height: 100px;
    background: inherit;
  }
  
  dialog.pride {
    background: linear-gradient(
        80deg,
        hsl(0deg 43.55% 26.63%),
        hsl(30deg 50.05% 37.86%),
        hsl(55deg 49.41% 34.19%),
        hsl(140deg 12.48% 45.98%),
        hsl(220deg 35.66% 38.34%),
        hsl(280deg 30.8% 32.11%)
    );
  }
  
  dialog::after {
    transform: translateY(2px);
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    pointer-events: none;
    background: var(--header-bg-color);
  }
  
  dialog.pride::after {
    --c1: hsl(51.39deg 89.27% 68.71%);
    --c2: hsl(281.12deg 68.59% 80.75%);
    --c3: var(--c1);
    --c4: hsl(0deg 0% 84.61%);
    --c5: hsl(334.67deg 58.4% 75.81%);
    --c6: hsl(204.67deg 41.19% 68.46%);
    --c7: hsl(41deg 70.19% 37.26%);
    --c8: hsl(0deg 0% 26.02%);
    background: repeating-linear-gradient(
        to right,
        var(--c1) 0%,
        var(--c1) 12.5%,
        var(--c2) 12.5%,
        var(--c2) 25%,
        var(--c3) 25%,
        var(--c3) 37.5%,
        var(--c4) 37.5%,
        var(--c4) 50%,
        var(--c5) 50%,
        var(--c5) 62.5%,
        var(--c6) 62.5%,
        var(--c6) 75%,
        var(--c7) 75%,
        /* black */ var(--c7) 87.5%,
        var(--c8) 87.5%,
        /* white */ var(--c8) 100%
    );
  }
  
  #container {
    flex-direction: row;
    display: flex;
    max-width: 1000px;
    padding-right: 10em;
    margin: 0 auto;
    position: relative;
    height: var(--header-height);
  }
  
  dialog#export div#container {
    /* to prevent the div from taking up horizontal page when the export pane is closed. On small screen this causes overscroll on the right. */
    overflow-x: hidden;
  }
  
  dialog#export.show_export div#container {
    overflow-x: auto;
  }
  
  .export_title {
    align-self: center;
    flex: 0 0 auto;
    border-radius: 8px;
    text-orientation: sideways-right;
    /* Not supported by Chrome: */
    /* writing-mode: sideways-lr; */
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-weight: 700;
    font-size: 1rem;
    max-width: var(--header-height);
    padding-inline: 0.5em;
    text-align: center;
  }
  
  .export_card {
    margin: 20px 5px;
    flex: 0 0 auto;
    width: attr(data-size ch, 24ch);
    border: 5px solid transparent;
    background: var(--export-card-bg-color);
    border-radius: 8px;
    color: var(--export-card-title-color);
    box-shadow: 0px 2px 10px var(--export-card-shadow-color);
    text-decoration: none;
    overflow: hidden;
  }
  
  .export_card header {
    margin-block: 0px;
    font-family: "Vollkorn", Palatino, sans-serif;
    font-feature-settings: "lnum", "pnum";
    font-size: 17px;
  }
  
  .export_card section {
    color: var(--export-card-text-color);
    font-weight: 500;
    padding: 3px;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  
  .export_small_btns {
    display: flex;
    flex-direction: row;
    padding: 0.9em;
    border-radius: 0.9em;
    position: absolute;
    right: 0.8em;
    top: 0em;
    background: var(--export-bg-color);
  }
  
  .pride_message {
    flex: 1 0 auto;
    align-self: center;
    margin-left: 32ch;
  }
  
  .pride_message p {
    margin: 0;
    padding: 0.2ch 1ch;
    background: black;
    transform: rotate(3deg);
  }
  
  .toggle_frontmatter_edit span::before {
    content: "";
    background-image: url("https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/document-text-outline.svg");
    background-size: contain;
    filter: var(--image-filters);
    display: inline-block;
    width: 1em;
    height: 1em;
    vertical-align: -0.1em;
  }
  
  .toggle_presentation span::before {
    content: "";
    background-image: url("https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/easel-outline.svg");
    background-size: contain;
    filter: var(--image-filters);
    display: inline-block;
    width: 1em;
    height: 1em;
    vertical-align: -0.1em;
  }
  
  .toggle_export span::before {
    content: "";
    background-image: url("https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/close-outline.svg");
    background-size: contain;
    filter: var(--image-filters);
    display: inline-block;
    width: 1em;
    height: 1em;
    vertical-align: -0.1em;
  }
  
  /* 为不支持 attr() 的浏览器提供默认值 */
  @supports not (width: attr(data-size ch)) {
    .export_card {
      width: 24ch;
    }
  }
</style>