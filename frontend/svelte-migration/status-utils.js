// 状态工具函数

export function is_started(status) {
    return status.started_at != null
}

export function is_finished(status) {
    return status.finished_at != null
}

export function is_busy(status) {
    return is_started(status) && !is_finished(status)
}

export function total_done(status) {
    return Object.values(status.subtasks || {}).reduce((total, subtask) => total + total_done(subtask), is_finished(status) ? 1 : 0)
}

export function total_tasks(status) {
    return Object.values(status.subtasks || {}).reduce((total, subtask) => total + total_tasks(subtask), 1)
}

// 延迟真值函数 - 这个函数需要在组件内部实现