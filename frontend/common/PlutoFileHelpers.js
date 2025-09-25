// 简单的文件打开助手函数
export function open_pluto_file(url) {
    // 如果是完整的 URL，直接打开
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        // 否则构建本地打开链接
        window.location.href = `open?${new URLSearchParams({ url: url }).toString()}`;
    }
}