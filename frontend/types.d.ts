declare global {
    /**
     * This namespace is meant for [PlutoDesktop](https://github.com/JuliaPluto/PlutoDesktop)
     * related types and interfaces.
     */
    namespace Desktop {
        /**
         * This type has to be in sync with the type "Channels"
         * defined in PlutoDesktop/{branch:master}/src/main/proload.ts
         */
        type Channels = "ipc-example"

        /**
         * This enum has to be in sync with the enum "PlutoExport"
         * defined in PlutoDesktop/{branch:master}/types/enums.ts
         *
         * @note Unfortunately enums can't be exported from .d.ts files.
         * Inorder to use this, just map integers to the enum values
         * - PlutoExport.FILE -> **0**
         * - PlutoExport.HTML -> **1**
         * - PlutoExport.STATE -> **2**
         * - PlutoExport.PDF -> **3**
         */
        enum PlutoExport {
            FILE,
            HTML,
            STATE,
            PDF,
        }

        /**
         * This type has to be in sync with the interface "Window"
         * defined in PlutoDesktop/{branch:master}/src/renderer/preload.d.ts
         */
        type PlutoDesktop = {
            ipcRenderer: {
                sendMessage(channel: Channels, args: unknown[]): void
                on(channel: string, func: (...args: unknown[]) => void): (() => void) | undefined
                once(channel: string, func: (...args: unknown[]) => void): void
            }
            fileSystem: {
                /**
                 * @param path path to a notebook, if already selected
                 * @param forceNew [default = false] If false and valid path is there,
                 * opens that notebook. If false and no path is there, opens the file selector.
                 * If true, opens a new blank notebook.
                 */
                openNotebook(path?: string, forceNew?: boolean): void
                shutdownNotebook(id?: string): void
                moveNotebook(id?: string): void
                exportNotebook(id: string, type: PlutoExport): void
            }
        }
    }
    interface Window {
        plutoDesktop?: Desktop.PlutoDesktop
    }
}

export {}
