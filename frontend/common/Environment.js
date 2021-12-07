/**
 * Hook into Pluto's front-end and customize the behavior
 */
const noop = () => false
export default {
    custom_data: {},
    custom_open_url_param: undefined,
    on_mount: noop,
    on_close: noop,
    on_move: noop,
}
