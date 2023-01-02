import { useMemo, useEffect, useState, html } from "../imports/Preact.js"

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

/**
 * @typedef PanelComponentBlock
 * @type {{panel: object, panelButton: object} | null}
 */
export const usePanelComponentFromEnv = () => {
    const [panel, setPanelComponent] = useState(/** @type { PanelComponentBlock } */ null)
    useEffect(() => {
        get_environment().then((e) => {
            const env = e({ imports: { preact: { useMemo, useEffect, useState, html } } })
            if (env.custom_panel && env.custom_panel_button)
                setPanelComponent({
                    panel: e.custon_panel,
                    panelButton: e.custom_panel_button,
                })
        })
    })
    return panel ?? {}
}

export default environment
