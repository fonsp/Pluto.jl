// ExportBanner 工具函数
// 这些函数被多个组件共享使用

/**
 * 警告可见密码输入框
 * 检查笔记本中是否有密码输入框包含内容，如果有则显示警告
 */
export const WarnForVisisblePasswords = () => {
    if (
        Array.from(document.querySelectorAll("bond")).some((bond_el) =>
            Array.from(bond_el.querySelectorAll(`input[type="password"]`)).some((input) => {
                // @ts-ignore - input element value access
                if (input?.value !== "") {
                    input.scrollIntoView();
                    return true;
                }
            })
        )
    ) {
        alert(
            "Warning: this notebook includes a password input with something typed in it. The contents of this password field will be included in the exported file in an unsafe way. \n\nClear the password field and export again to avoid this problem."
        );
    }
};

/**
 * 导出笔记本到桌面应用
 * @param {Event} e - 事件对象
 * @param {number} type - 导出类型
 * @param {string} notebook_id - 笔记本ID
 */
export const exportNotebookDesktop = (e, type, notebook_id) => {
    // @ts-ignore - window.plutoDesktop may not exist
    const isDesktop = !!window.plutoDesktop;
    if (isDesktop) {
        e.preventDefault();
        window.plutoDesktop?.fileSystem.exportNotebook(notebook_id, type);
    }
};