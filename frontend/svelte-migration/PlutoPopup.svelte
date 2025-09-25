<script>
    import { onMount, onDestroy } from 'svelte';
    import { open_pluto_popup } from '../common/open_pluto_popup.js';
    import { t } from '../common/lang.js';
    
    // 状态变量
    let recentEvent = null;
    let isVisible = false;
    let position = { top: '20%', left: '50%' };
    
    // 事件处理函数
    function handleOpenPlutoPopup(event) {
        console.log("PlutoPopup: Received open pluto popup event", event.detail);
        
        const detail = event.detail;
        recentEvent = detail;
        isVisible = true;
        
        // 计算位置
        const sourceElement = detail.source_element;
        if (sourceElement == null) {
            position = { top: '20%', left: '50%', transform: 'translate(-50%, -50%)' };
        } else {
            const elb = sourceElement.getBoundingClientRect();
            const bodyb = document.body.getBoundingClientRect();
            
            position = { 
                top: `${0.5 * (elb.top + elb.bottom) - bodyb.top}px`, 
                left: `min(max(0px,100vw - 251px - 30px), ${elb.right - bodyb.left}px)` 
            };
        }
    }
    
    function handleClosePopup() {
        isVisible = false;
        recentEvent = null;
    }
    
    // 点击外部关闭
    function handleClickOutside(event) {
        if (recentEvent && !event.target.closest('.pluto-popup')) {
            const sourceElement = recentEvent.source_element;
            if (sourceElement && sourceElement.contains(event.target)) return;
            handleClosePopup();
        }
    }
    
    // 挂载时添加事件监听器
    onMount(() => {
        console.log("PlutoPopup: Component mounted");
        window.addEventListener('open pluto popup', handleOpenPlutoPopup);
        window.addEventListener('close pluto popup', handleClosePopup);
        window.addEventListener('pointerdown', handleClickOutside);
        
        // 添加 ESC 键关闭支持
        const handleKeyDown = (e) => {
            if (e.key === "Escape") handleClosePopup();
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        // 返回清理函数
        return () => {
            window.removeEventListener('open pluto popup', handleOpenPlutoPopup);
            window.removeEventListener('close pluto popup', handleClosePopup);
            window.removeEventListener('pointerdown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    });
    
    // Helper function to format body content
    function formatBody(body) {
        if (Array.isArray(body)) {
            // Convert array to HTML string
            return body.map(item => {
                if (typeof item === 'string') {
                    // Escape HTML special characters in strings
                    return item
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                } else if (typeof item === 'object' && item !== null) {
                    // Handle object items (likely mime type objects)
                    if (item.mime && item.mime === 'text/plain') {
                        return item.body || '';
                    }
                    // For other mime types, we might want to handle them differently
                    // For now, just return a string representation
                    return JSON.stringify(item);
                }
                // For other types, convert to string
                return String(item);
            }).join('');
        }
        // If body is not an array, treat it as a string
        return String(body);
    }
</script>

{#if isVisible && recentEvent}
    <div 
        class="pluto-popup {recentEvent.type || ''} {recentEvent.big ? 'big' : ''} {recentEvent.css_class || ''} visible"
        style="top: {position.top}; left: {position.left}; {position.transform ? 'transform: ' + position.transform : ''}"
    >
        {#if recentEvent.type === 'nbpkg'}
            <div>Package popup for {recentEvent.package_name}</div>
        {:else if recentEvent.type === 'info' || recentEvent.type === 'warn'}
            <div>{@html formatBody(recentEvent.body)}</div>
        {:else}
            <div>Unknown popup type</div>
        {/if}
    </div>
{/if}

<!-- 添加一个隐藏的可聚焦元素，用于处理焦点管理 -->
<div tabindex="0" style="position: fixed; width: 0; height: 0; overflow: hidden;"></div>

<style>
    .pluto-popup {
        position: fixed;
        --max-size: 251px;
        width: min(90vw, var(--max-size));
        margin-left: 0.4rem;
        margin-top: -1rem;
        overflow-wrap: break-word;
        font-family: var(--system-ui-font-stack);
        opacity: 0;
        transform: scale(0.2);
        transform-origin: left;
        transition: transform 0.5s ease-in-out, opacity 0.1s ease-in-out;
        pointer-events: none;
        z-index: 10000;
        background: var(--overlay-button-bg);
        border: 3px solid var(--overlay-button-border);
        color: var(--black);
        border-radius: 10px;
        padding: 8px;
        max-width: 100%;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .pluto-popup.visible {
        opacity: 1;
        transform: scale(1);
        transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
        pointer-events: initial;
    }
    
    .pluto-popup.big {
        --max-size: 25em;
    }
    
    .pluto-popup.warn {
        background: var(--pluto-logs-warn-color);
    }
</style>