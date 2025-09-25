<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import _ from '../../imports/lodash.js';
    import { t, th } from '../../common/lang.js';
    import { create_pluto_connection, ws_address_from_base } from '../../common/PlutoConnection.js';
    import { new_update_message } from '../../common/NewUpdateMessage.js';
    import Featured from './Featured.svelte';
    import Recent from './Recent.svelte';
    import Open from './Open.svelte';
    import { get_environment } from '../../common/Environment.js';
    import default_featured_sources from '../../featured_sources.js';
    
    export let launch_params = {};
    
    // 笔记本列表数据
    let remote_notebooks = [];
    // 连接状态
    let connected = false;
    // 导航屏蔽文本
    let block_screen_with_this_text = null;
    // 扩展组件配置
    let extended_components = {
        show_samples: true,
        CustomPicker: null,
        CustomRecent: null,
    };
    
    // 客户端连接实例
    let client = null;
    // Logo URL
    let url_logo_big = '';
    
    onMount(() => {
        // 获取 logo URL
        url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']")?.getAttribute("href") ?? '';
        
        // 创建连接
        const on_update = ({ message, type }) => {
            if (type === "notebook_list") {
                remote_notebooks = message.notebooks;
            }
        };
        
        // 连接状态回调
        const on_connection_status = (status) => {
            connected = status;
        };
        
        const client_promise = create_pluto_connection({
            on_unrequested_update: on_update,
            on_connection_status: on_connection_status,
            on_reconnect: async () => true,
            ws_address: launch_params.pluto_server_url ? ws_address_from_base(launch_params.pluto_server_url) : undefined,
        });
        
        client_promise.then(async (client_instance) => {
            client = client_instance;
            connected = true;
            
            try {
                const environment = await get_environment(client);
                const { custom_recent, custom_filepicker, show_samples = true } = environment({ client, editor: this, imports: {} });
                extended_components = {
                    ...extended_components,
                    CustomRecent: custom_recent,
                    CustomPicker: custom_filepicker,
                    show_samples,
                };
            } catch (e) {
                console.error('Error loading environment:', e);
            }
            
            new_update_message(client);
            
            // 预加载一些功能
            client.send("current_time");
            client.send("completepath", { query: "" }, {});
        });
    });
    
    onDestroy(() => {
        if (client && client.disconnect) {
            client.disconnect();
        }
    });
    
    // 获取推荐笔记本源 - 与 Welcome.js 保持一致的逻辑
    $: featured_sources = launch_params.featured_sources ?? 
        (launch_params.featured_source_url ? 
            [{ url: launch_params.featured_source_url, integrity: launch_params.featured_source_integrity }] : 
            default_featured_sources.sources);
    
    // 导航处理函数 - 与 Welcome.js 保持一致的逻辑
    const on_start_navigation = (value, expect_navigation = true) => {
        if (expect_navigation) {
            // 等待 beforeunload 事件发生后再设置屏蔽文本
            // 如果 1 秒内未发生事件，说明用户右键点击或 Ctrl+点击（在新标签页打开）
            const handler = () => {
                block_screen_with_this_text = value;
            };
            window.addEventListener("beforeunload", handler);
            setTimeout(() => window.removeEventListener("beforeunload", handler), 1000);
        } else {
            block_screen_with_this_text = value;
        }
    };
</script>

{#if block_screen_with_this_text != null}
    <div class="navigating-away-banner">
        <h2>{th("t_loading_something", { text: block_screen_with_this_text })}</h2>
    </div>
{:else}
    <section id="title">
        <h1>{th("t_welcome_to_pluto", { pluto: url_logo_big ? `<img src="${url_logo_big}" alt="Pluto.jl" />` : '' })}</h1>
      </section>
    <section id="mywork">
        <div>
            <Recent
                {client}
                {connected}
                {remote_notebooks}
                customRecent={extended_components.CustomRecent}
                {on_start_navigation}
            />
        </div>
    </section>
    <section id="open">
        <div>
            <Open
                {client}
                {connected}
                customPicker={extended_components.CustomPicker}
                show_samples={extended_components.show_samples}
                {on_start_navigation}
            />
        </div>
    </section>
    <section id="featured">
        <div>
            <Featured 
                sources={featured_sources} 
                direct_html_links={launch_params.featured_direct_html_links} 
            />
        </div>
    </section>
{/if}