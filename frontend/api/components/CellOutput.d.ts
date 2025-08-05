export class CellOutput extends Component<any, any> {
    constructor();
    state: {
        output_changed_once: boolean;
    };
    old_height: number;
    resize_observer: ResizeObserver;
    shouldComponentUpdate({ last_run_timestamp, sanitize_html }: {
        last_run_timestamp: any;
        sanitize_html: any;
    }): boolean;
    componentDidUpdate(old_props: any): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): import("../imports/Preact.js").ReactElement;
}
export function PlutoImage({ body, mime }: {
    body: any;
    mime: any;
}): import("../imports/Preact.js").ReactElement;
export function OutputBody({ mime, body, cell_id, persist_js_state, last_run_timestamp, sanitize_html }: {
    mime: string;
    body: any;
    cell_id: string;
    persist_js_state: boolean | string;
    last_run_timestamp: number | null;
    sanitize_html?: boolean | string;
}): import("../imports/Preact.js").ReactElement;
export function RawHTMLContainer({ body, className, persist_js_state, last_run_timestamp, sanitize_html, sanitize_html_message }: {
    body: any;
    className?: string;
    persist_js_state?: boolean;
    last_run_timestamp: any;
    sanitize_html?: boolean;
    sanitize_html_message?: boolean;
}): import("../imports/Preact.js").ReactElement;
export function highlight(code_element: HTMLElement, language: any): void;
export function generateCopyCodeButton(pre: HTMLElement | null): void;
export function generateCopyHeaderIdButton(header: HTMLHeadingElement, pluto_actions: any): void;
export function ANSITextOutput({ body }: {
    body: any;
}): import("../imports/Preact.js").ReactElement;
export type PlutoScript = HTMLScriptElement;
import { Component } from "../imports/Preact.js";
