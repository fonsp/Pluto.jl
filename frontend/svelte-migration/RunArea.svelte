<script>
  import { createEventDispatcher } from 'svelte';
  import { onDestroy } from 'svelte';
  import { t } from '../common/lang.js';
  import { open_pluto_popup_svelte } from '../common/open_pluto_popup_svelte.js';
  
  export let runtime = null;
  export let running = false;
  export let queued = false;
  export let code_differs = false;
  export let on_run = () => {};
  export let on_interrupt = () => {};
  export let set_cell_disabled = () => {};
  export let depends_on_disabled_cells = false;
  export let running_disabled = false;
  export let on_jump = () => {};
  
  const dispatch = createEventDispatcher();
  
  // 本地状态
  let local_time_running_ms = null;
  let local_time_running_ns = null;
  let interval_id = null;
  
  // 计算属性
  $: on_save = on_run; // because disabled cells save without running
  $: action = running || queued ? "interrupt" : running_disabled ? "save" : depends_on_disabled_cells && !code_differs ? "jump" : "run";
  
  $: titlemap = {
    interrupt: t("t_interrupt_cell"),
    save: t("t_save_cell"),
    jump: t("t_jump_cell"),
    run: t("t_run_cell"),
  };
  
  // 响应式：当running状态改变时更新时间
  $: {
    if (running) {
      const now = +new Date();
      local_time_running_ms = 0;
      local_time_running_ns = 0;
      
      // 清除之前的interval
      if (interval_id) {
        clearInterval(interval_id);
      }
      
      // 设置新的interval来更新时间
      interval_id = setInterval(() => {
        const current_time = +new Date();
        local_time_running_ms = current_time - now;
        local_time_running_ns = local_time_running_ms * 1e6;
      }, 50);
    } else {
      // 停止计时
      if (interval_id) {
        clearInterval(interval_id);
        interval_id = null;
      }
      local_time_running_ms = null;
      local_time_running_ns = null;
    }
  }
  
  // 清理
  onDestroy(() => {
    if (interval_id) {
      clearInterval(interval_id);
    }
  });
  
  function handle_double_click(event) {
    if (running_disabled) {
      // 创建弹窗内容
      const popupContent = t("t_cell_is_disabled", { 
        link: t("t_cell_is_disabled_link")
      });
      
      open_pluto_popup_svelte({
        type: "info",
        source_element: event.target,
        body: popupContent
      });
    }
  }
  
  function handle_click() {
    // 根据当前action调用相应的函数
    switch (action) {
      case "interrupt":
        on_interrupt();
        break;
      case "save":
        on_save();
        break;
      case "jump":
        on_jump();
        break;
      case "run":
        on_run();
        break;
    }
    
    dispatch('action', { action });
  }
  
  // prettytime函数
  function prettytime(time_ns) {
    if (time_ns == null) {
      return "---";
    }
    let result = time_ns;
    const prefices = ["n", "μ", "m", ""];
    let i = 0;
    while (i < prefices.length - 1 && result >= 1000.0) {
      i += 1;
      result /= 1000;
    }
    const roundedtime = result.toFixed(time_ns < 100 || result >= 100.0 ? 0 : 1);

    return roundedtime + "\xa0" + prefices[i] + "s";
  }
</script>

<pluto-runarea class={action}>
  <button 
    on:dblclick={handle_double_click} 
    on:click={handle_click} 
    class="runcell" 
    title={titlemap[action]}
  >
    <span></span>
  </button>
  <span class="runtime">
    {prettytime(running ? local_time_running_ns ?? runtime : runtime)}
  </span>
</pluto-runarea>