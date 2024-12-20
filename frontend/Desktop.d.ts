 declare global {
    /**
     * This namespace is designed for [PlutoDesktop](https://github.com/JuliaPluto/PlutoDesktop)
     * related types and interfaces, facilitating native app integration.
     */
    namespace Desktop {
        /**
         * Enum for export types. Ensure this is in sync with "PlutoExport"
         * defined in `PlutoDesktop/{branch:master}/types/enums.ts`.
         *
         * @note Enums cannot be directly exported from `.d.ts` files. Use the integer mappings:
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
         * Type definition for PlutoDesktop functionalities.
         * Ensure sync with "Window" interface in `PlutoDesktop/{branch:master}/src/renderer/preload.d.ts`.
         */
        interface PlutoDesktop {
            ipcRenderer: {
                /**
                 * Sends a message to the main process via a specific channel.
                 * @param channel The name of the channel.
                 * @param args Arguments to send with the message.
                 */
                sendMessage(channel: string, args: unknown[]): void;

                /**
                 * Registers a listener for a specific channel.
                 * @param channel The name of the channel.
                 * @param func The callback to invoke when the event occurs.
                 * @returns A function to remove the listener or `undefined` if registration fails.
                 */
                on(channel: string, func: (...args: unknown[]) => void): (() => void) | undefined;

                /**
                 * Registers a one-time listener for a specific channel.
                 * @param channel The name of the channel.
                 * @param func The callback to invoke when the event occurs.
                 */
                once(channel: string, func: (...args: unknown[]) => void): void;
            };

            fileSystem: {
                /**
                 * Opens a notebook.
                 * @param type The type of operation: "url" | "path" | "new". Defaults to "new".
                 * @param pathOrURL The location of the file or URL to open. Optional for "new".
                 */
                openNotebook(type?: "url" | "path" | "new", pathOrURL?: string): void;

                /**
                 * Shuts down a notebook by its ID.
                 * @param id The ID of the notebook to shut down.
                 */
                shutdownNotebook(id?: string): void;

                /**
                 * Moves a notebook to a new location.
                 * @param id The ID of the notebook to move.
                 */
                moveNotebook(id?: string): void;

                /**
                 * Exports a notebook.
                 * @param id The ID of the notebook to export.
                 * @param type The export type as defined in `PlutoExport`.
                 */
                exportNotebook(id: string, type: PlutoExport): void;
            };
        }
    }

    /**
     * Extends the Window interface for native app integration.
     */
    interface Window {
        plutoDesktop?: Desktop.PlutoDesktop;
    }
}

export {};
