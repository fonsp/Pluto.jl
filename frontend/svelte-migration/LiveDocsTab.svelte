<script>
  import { onMount, tick, getContext, afterUpdate } from 'svelte'
  import { cl } from '../common/ClassTable.js'
  import { t } from '../common/lang.js'
  import { highlight } from '../components/CellOutput.js'
  
  export let focus_on_open = false
  export let desired_doc_query = null
  export let on_update_doc_query = (query) => {}
  export let notebook = {}
  export let sanitize_html = true
  
  // 获取 PlutoActionsContext
  let pluto_actions = getContext('pluto_actions')
  
  let input_ref = null
  let docs_section_ref = null
  
  // 状态管理 - 参考Preact版本的结构
  let shown_query = null
  let searched_query = null
  let body = t("t_live_docs_body")
  let loading = false
  
  // 响应式搜索逻辑
  $: if (!loading && desired_doc_query != null && /[^\s]/.test(desired_doc_query) && searched_query !== desired_doc_query) {
    fetch_docs(desired_doc_query)
  }
  
  // 在每次更新后处理文档节点
  afterUpdate(() => {
    if (docs_section_ref) {
      post_process_doc_node(docs_section_ref)
    }
  })
  
  onMount(async () => {
    if (focus_on_open && input_ref) {
      await tick() // 确保DOM已更新
      input_ref.focus({ preventScroll: true })
      input_ref.select()
    }
  })
  
  // 搜索文档函数 - 参考Preact版本的实现
  async function fetch_docs(new_query) {
    loading = true
    searched_query = new_query
    
    try {
      // 使用 Promise.race 实现超时机制
      const result = await Promise.race([
        new Promise(resolve => setTimeout(() => resolve(false), 2000)), // 2秒超时
        pluto_actions.send("docs", { query: new_query.replace(/^\?/, "") }, { notebook_id: notebook.notebook_id }).then((u) => {
          if (u.message.status === "⌛") {
            return false
          }
          if (u.message.status === "👍") {
            shown_query = new_query
            body = u.message.doc
            return true
          }
        })
      ])
    } catch (err) {
      console.error("Error fetching docs:", err)
    } finally {
      loading = false
    }
  }
  
  // 处理输入变化
  function handleInput(event) {
    on_update_doc_query(event.target.value)
  }
  
  // 处理文档节点的后处理
  function post_process_doc_node(node) {
    if (!node) return
    
    // 应用语法高亮到代码块
    for (let code_element of node.querySelectorAll("code:not([class])")) {
      highlight(code_element, "julia")
    }
    
    // 解析@ref链接
    for (let anchor of node.querySelectorAll("a")) {
      const href = anchor.getAttribute("href")
      if (href != null && href.startsWith("@ref")) {
        const query = href.length > 4 ? href.substr(5) : anchor.textContent
        anchor.onclick = (e) => {
          on_update_doc_query(query)
          e.preventDefault()
        }
      }
    }
  }
  
  // 清理工作区相关内容
  function without_workspace_stuff(str) {
    return str
      .replace(/Main\.var&quot;workspace\#\d+&quot;\./g, "") // remove workspace modules from variable names
      .replace(/Main\.workspace\#\d+\./g, "") // remove workspace modules from variable names
      .replace(/ in Main\.var&quot;workspace\#\d+&quot;/g, "") // remove workspace modules from method lists
      .replace(/ in Main\.workspace\#\d+/g, "") // remove workspace modules from method lists
      .replace(/#&#61;&#61;#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\:\d+/g, "") // remove UUIDs from filenames
  }
  
  // 计算是否没有找到文档
  $: no_docs_found = loading === false && searched_query !== "" && searched_query !== shown_query
</script>

<div
  class={cl({
    "live-docs-searchbox": true,
    "loading": loading,
    "notfound": no_docs_found,
  })}
  translate="no"
>
  <input
    title={no_docs_found ? `"${searched_query}" not found` : ""}
    id="live-docs-search"
    placeholder={t("t_live_docs_search_placeholder")}
    bind:this={input_ref}
    on:input={handleInput}
    value={desired_doc_query}
    type="search"
  />
</div>

<section bind:this={docs_section_ref}>
  <h1><code>{shown_query}</code></h1>
  {#if body}
    <div class="docs-content">
      {@html without_workspace_stuff(body)}
    </div>
  {/if}
</section>

<style>
  /* 使用与Preact版本相同的CSS类结构 */
  .live-docs-searchbox {
    position: relative;
    margin-bottom: 1rem;
  }
  
  .live-docs-searchbox input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 4px;
    font-size: 0.9rem;
    background: var(--input-bg, white);
    color: var(--input-text, #333);
  }
  
  .live-docs-searchbox input:focus {
    outline: none;
    border-color: var(--focus-color, #2196f3);
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
  }
  
  .live-docs-searchbox.loading input {
    opacity: 0.7;
  }
  
  .live-docs-searchbox.notfound input {
    border-color: var(--error-color, #f44336);
  }
  
  section {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
  }
  
  section h1 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: var(--heading-text, #333);
  }
  
  section h1 code {
    background: var(--code-bg, #f5f5f5);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }
  
  .docs-content {
    line-height: 1.6;
    color: var(--content-text, #333);
  }
  
  .docs-content :global(h2) {
    margin: 1.5rem 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--heading-text, #333);
  }
  
  .docs-content :global(p) {
    margin: 0.5rem 0;
  }
  
  .docs-content :global(pre) {
    background: var(--code-bg, #f8f9fa);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .docs-content :global(code) {
    font-family: monospace;
    font-size: 0.9em;
  }
  
  .docs-content :global(a) {
    color: var(--link-color, #2196f3);
    text-decoration: none;
  }
  
  .docs-content :global(a:hover) {
    text-decoration: underline;
  }
</style>