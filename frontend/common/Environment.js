function environment({
    client,
    editor,
    imports: {
        preact: { html, useEffect, useState, useMemo },
    },
}) {
    const noop = () => false

    return {
        custom_editor_header_component: noop,
        custom_welcome: noop,
        custom_recent: noop,
        custom_filepicker: noop,
    }
}

export default environment
