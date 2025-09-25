/**
 * 为Svelte组件设计的open_pluto_popup函数
 * @param {Object} detail - 弹窗详情
 * @param {"nbpkg" | "info" | "warn"} detail.type - 弹窗类型
 * @param {HTMLElement?} [detail.source_element] - 触发元素
 * @param {Boolean} [detail.big] - 是否为大弹窗
 * @param {string} [detail.css_class] - CSS类名
 * @param {Boolean} [detail.should_focus] - 是否应该获得焦点
 * @param {string} [detail.package_name] - 包名（仅nbpkg类型）
 * @param {boolean} [detail.is_disable_pkg] - 是否为禁用包（仅nbpkg类型）
 * @param {string | HTMLElement} [detail.body] - 弹窗内容（info/warn类型）
 */
export const open_pluto_popup_svelte = (detail) => {
    // 创建一个新的CustomEvent，确保detail对象正确传递
    const event = new CustomEvent("open pluto popup", {
        detail: detail,
    })
    
    // 分发事件
    window.dispatchEvent(event)
}