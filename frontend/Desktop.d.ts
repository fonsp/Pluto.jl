declare global {
    /**
     * This namespace is meant for [PlutoDesktop](https://github.com/JuliaPluto/PlutoDesktop)
     * related types and interfaces.
     */
    namespace Desktop {
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
                sendMessage(channel: String, args: unknown[]): void
                on(channel: string, func: (...args: unknown[]) => void): (() => void) | undefined
                once(channel: string, func: (...args: unknown[]) => void): void
            }
            fileSystem: {
                /**
                 * @param type [default = 'new'] whether you want to open a new notebook
                 * open a notebook from a path or from a url
                 * @param pathOrURL location to the file, not needed if opening a new file,
                 * opens that notebook. If false and no path is there, opens the file selector.
                 * If true, opens a new blank notebook.
                 */
                openNotebook(type?: "url" | "path" | "new", pathOrURL?: string): void
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
