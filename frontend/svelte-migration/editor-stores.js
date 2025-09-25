import { writable, derived, get } from "svelte/store"
import immer from "../imports/immer.js"
import _ from "../imports/lodash.js"
import { BackendLaunchPhase } from "../common/Binder.js"
import { ProcessStatus } from "../common/ProcessStatus.js"

// 默认单元格元数据
export const DEFAULT_CELL_METADATA = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
}

// UUID 生成器
const uuidv4 = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

// 创建编辑器状态的初始值
function createInitialState(launch_params = {}, initial_notebook_state = {}) {
    return {
        // 笔记本状态
        notebook: initial_notebook_state,

        // 本地单元格输入状态
        cell_inputs_local: {},

        // 未提交的全局定义
        unsumbitted_global_definitions: {},

        // 文档查询
        desired_doc_query: null,

        // 最近删除的单元格
        recently_deleted: [],

        // 最近自动禁用的单元格
        recently_auto_disabled_cells: {},

        // 时间戳
        last_update_time: 0,

        // UI 状态
        disable_ui: launch_params.disable_ui || false,
        static_preview: launch_params.statefile != null,
        inspecting_hidden_code: false,

        // 后端启动状态
        backend_launch_phase:
            launch_params.notebookfile != null && (launch_params.binder_url != null || launch_params.pluto_server_url != null)
                ? BackendLaunchPhase.wait_for_user
                : null,
        backend_launch_logs: null,
        binder_session_url: null,
        binder_session_token: null,

        // 连接状态
        connected: false,
        initializing: true,
        moving_file: false,
        refresh_target: null,

        // UI 组件状态
        scroller: { up: false, down: false },
        export_menu_open: false,
        last_created_cell: null,
        selected_cells: [],

        // 扩展组件
        extended_components: { CustomHeader: null },

        // 录制状态
        is_recording: false,
        recording_waiting_to_start: false,

        // 滑块服务器状态
        slider_server: { connecting: false, interactive: false },
    }
}

// 创建编辑器 store
export function createEditorStore(launch_params = {}, initial_notebook_state = {}) {
    const initial_state = createInitialState(launch_params, initial_notebook_state)
    const { subscribe, set, update } = writable(initial_state)

    // 增强的 update 方法，支持 immer
    const immerUpdate = (fn) => {
        return update(immer(fn))
    }

    // Promise-based update 方法
    const setStatePromise = (fn) => {
        return new Promise((resolve) => {
            update(
                immer((state) => {
                    fn(state)
                    resolve(state)
                })
            )
        })
    }

    return {
        subscribe,
        set,
        update: immerUpdate,
        setStatePromise,
        // 获取当前状态（同步）
        get: () => get({ subscribe }),
    }
}

// 派生状态：计算各种 UI 状态
export function createStatusStore(editorStore, launch_params = {}) {
    return derived(editorStore, ($state) => ({
        // 连接状态
        disconnected: !($state.connected || $state.initializing || $state.static_preview),

        // 加载状态
        loading:
            ($state.backend_launch_phase != null &&
                BackendLaunchPhase.wait_for_user < $state.backend_launch_phase &&
                $state.backend_launch_phase < BackendLaunchPhase.ready) ||
            $state.initializing ||
            $state.moving_file,

        // 进程状态
        process_waiting_for_permission: $state.notebook.process_status === ProcessStatus.waiting_for_permission && !$state.initializing,
        process_restarting: $state.notebook.process_status === ProcessStatus.waiting_to_restart,
        process_dead: $state.notebook.process_status === ProcessStatus.no_process || $state.notebook.process_status === ProcessStatus.waiting_to_restart,

        // 包管理状态
        nbpkg_restart_required: $state.notebook.nbpkg?.restart_required_msg != null,
        nbpkg_restart_recommended: $state.notebook.nbpkg?.restart_recommended_msg != null,
        nbpkg_disabled: $state.notebook.nbpkg?.enabled === false || $state.notebook.nbpkg?.waiting_for_permission_but_probably_disabled === true,

        // 预览状态
        static_preview: $state.static_preview,
        inspecting_hidden_code: $state.inspecting_hidden_code,

        // 绑定状态
        bonds_disabled: !(
            $state.initializing ||
            $state.connected ||
            (launch_params.slider_server_url != null && ($state.slider_server?.connecting || $state.slider_server?.interactive))
        ),

        // Binder 状态
        offer_binder: $state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.binder_url != null,
        offer_local: $state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.pluto_server_url != null,
        binder: launch_params.binder_url != null && $state.backend_launch_phase != null,

        // 代码差异状态
        code_differs: $state.notebook.cell_order.some(
            (cell_id) => $state.cell_inputs_local[cell_id] != null && $state.notebook.cell_inputs[cell_id].code !== $state.cell_inputs_local[cell_id].code
        ),

        // 录制状态
        recording_waiting_to_start: $state.recording_waiting_to_start,
        is_recording: $state.is_recording,
        isolated_cell_view: launch_params.isolated_cell_ids != null && launch_params.isolated_cell_ids.length > 0,

        // HTML 安全状态
        sanitize_html: $state.notebook.process_status === ProcessStatus.waiting_for_permission,
    }))
}

// 单元格操作相关的派生状态
export function createCellStore(editorStore) {
    return derived(editorStore, ($state) => ({
        // 获取所有单元格
        allCells: $state.notebook.cell_order,

        // 获取选中的单元格
        selectedCells: $state.selected_cells,

        // 获取活动单元格
        activeCell: $state.selected_cells.length === 1 ? $state.selected_cells[0] : null,

        // 获取单元格输入
        getCellInput: (cell_id) => $state.cell_inputs_local[cell_id] || $state.notebook.cell_inputs[cell_id],

        // 检查单元格是否有本地修改
        hasLocalChanges: (cell_id) => {
            const local = $state.cell_inputs_local[cell_id]
            const remote = $state.notebook.cell_inputs[cell_id]
            return local != null && local.code !== remote.code
        },

        // 获取最近创建的单元格
        lastCreatedCell: $state.last_created_cell,
    }))
}

// 创建动作 store
export function createActionsStore(editorStore, client = null, launch_params = {}) {
    const actions = {
        // 获取笔记本
        get_notebook: () => {
            return editorStore.get().notebook || {}
        },

        // 获取会话选项
        get_session_options: () => client?.session_options,

        // 获取启动参数
        get_launch_params: () => launch_params,

        // 发送消息
        send: (message_type, ...args) => client?.send(message_type, ...args),

        // 获取发布的对象
        get_published_object: (objectid) => {
            const state = editorStore.get()
            return state.notebook.published_objects[objectid]
        },

        // 更新笔记本
        update_notebook: (updateFn) => {
            editorStore.update((state) => {
                updateFn(state.notebook)
                return state
            })
        },

        // 设置文档查询
        set_doc_query: (query) => {
            editorStore.update((state) => ({ ...state, desired_doc_query: query }))
        },

        // 设置本地单元格
        set_local_cell: async (cell_id, new_val) => {
            return editorStore.setStatePromise((state) => {
                state.cell_inputs_local[cell_id] = { code: new_val }
                state.selected_cells = []
            })
        },

        // 设置未提交的全局定义
        set_unsubmitted_global_definitions: async (cell_id, new_val) => {
            return editorStore.setStatePromise((state) => {
                state.unsumbitted_global_definitions[cell_id] = new_val
            })
        },

        // 获取未提交的全局定义
        get_unsubmitted_global_definitions: () => {
            const state = editorStore.get()
            return _.pick(state.unsumbitted_global_definitions, state.notebook.cell_order)
        },

        // 聚焦邻居单元格
        focus_on_neighbor: (cell_id, delta, line = delta === -1 ? Infinity : -1, ch = 0) => {
            const state = editorStore.get()
            const i = state.notebook.cell_order.indexOf(cell_id)
            const new_i = i + delta

            if (new_i >= 0 && new_i < state.notebook.cell_order.length) {
                window.dispatchEvent(
                    new CustomEvent("cell_focus", {
                        detail: {
                            cell_id: state.notebook.cell_order[new_i],
                            line: line,
                            ch: ch,
                        },
                    })
                )
            }
        },

        // 添加反序列化的单元格
        add_deserialized_cells: async (data, index_or_id, deserializer) => {
            const { deserialize_cells } = await import("../common/Serialization.js")
            const deserializerFn = deserializer || deserialize_cells

            const new_codes = deserializerFn(data)
            const new_cells = new_codes.map((code) => ({
                cell_id: uuidv4(),
                code: code,
                code_folded: false,
                metadata: { ...DEFAULT_CELL_METADATA },
            }))

            const state = editorStore.get()
            let index

            if (typeof index_or_id === "number") {
                index = index_or_id
            } else {
                index = state.notebook.cell_order.indexOf(index_or_id)
                if (index !== -1) {
                    index += 1
                }
            }

            if (index === -1) {
                index = state.notebook.cell_order.length
            }

            // 更新本地状态
            await editorStore.setStatePromise((state) => {
                state.selected_cells = []
                state.last_created_cell = new_cells[0]?.cell_id

                new_cells.forEach((cell) => {
                    state.cell_inputs_local[cell.cell_id] = cell
                })
            })

            // 更新笔记本状态
            actions?.update_notebook?.((notebook) => {
                new_cells.forEach((cell) => {
                    notebook.cell_inputs[cell.cell_id] = {
                        ...cell,
                        code: "",
                        metadata: { ...DEFAULT_CELL_METADATA },
                    }
                })

                notebook.cell_order = [
                    ...notebook.cell_order.slice(0, index),
                    ...new_cells.map((x) => x.cell_id),
                    ...notebook.cell_order.slice(index, Infinity),
                ]
            })
        },

        // 包装远程单元格
        wrap_remote_cell: async (cell_id, block_start = "begin", block_end = "end") => {
            const state = editorStore.get()
            const cell = state.notebook.cell_inputs[cell_id]
            const new_code = `${block_start}\n\t${cell.code.replace(/\n/g, "\n\t")}\n${block_end}`

            await editorStore.setStatePromise((state) => {
                state.cell_inputs_local[cell_id] = { code: new_code }
            })

            // 这里需要调用 set_and_run_multiple，但依赖于 client
            // await actions.set_and_run_multiple([cell_id])
        },

        // 分割远程单元格
        split_remote_cell: async (cell_id, boundaries, submit = false) => {
            const { slice_utf8 } = await import("../common/UnicodeTools.js")
            const state = editorStore.get()
            const cell = state.notebook.cell_inputs[cell_id]

            const old_code = cell.code
            const padded_boundaries = [0, ...boundaries]
            const parts = boundaries.map((b, i) => slice_utf8(old_code, padded_boundaries[i], b).trim()).filter((x) => x !== "")

            const cells_to_add = parts.map((code) => ({
                cell_id: uuidv4(),
                code: code,
                code_folded: false,
                metadata: { ...DEFAULT_CELL_METADATA },
            }))

            // 更新本地状态
            await editorStore.setStatePromise((state) => {
                cells_to_add.forEach((cell) => {
                    state.cell_inputs_local[cell.cell_id] = cell
                })
            })

            // 更新笔记本状态
            actions?.update_notebook?.((notebook) => {
                delete notebook.cell_inputs[cell_id]

                cells_to_add.forEach((cell) => {
                    notebook.cell_inputs[cell.cell_id] = cell
                })

                notebook.cell_order = notebook.cell_order.flatMap((c) => {
                    if (cell_id === c) {
                        return cells_to_add.map((x) => x.cell_id)
                    } else {
                        return [c]
                    }
                })
            })

            if (submit) {
                // await actions.set_and_run_multiple(cells_to_add.map((c) => c.cell_id))
            }
        },
    }

    return actions
}

// 创建专门的 UI 状态 store
export function createUIStore(editorStore) {
    return derived(editorStore, ($state) => ({
        // 导出菜单
        exportMenuOpen: $state.export_menu_open,

        // 滚动状态
        scroller: $state.scroller,

        // 选中状态
        selectedCells: $state.selected_cells,
        hasSelection: $state.selected_cells.length > 0,

        // 录制状态
        isRecording: $state.is_recording,
        recordingWaiting: $state.recording_waiting_to_start,

        // UI 禁用状态
        disableUI: $state.disable_ui,
        staticPreview: $state.static_preview,
        inspectingHidden: $state.inspecting_hidden_code,
    }))
}
