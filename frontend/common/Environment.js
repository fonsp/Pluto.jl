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

export const get_environment = async (client) => {
    let environment // Draal this is for you
    // @ts-ignore
    if (!window.pluto_injected_environment) {
        const { default: env } = await import(client.session_options.server.injected_javascript_data_url)
        environment = env
    } else {
        // @ts-ignore
        environment = window.pluto_injected_environment.environment
    }
    return environment
}

export default environment
