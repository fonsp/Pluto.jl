/**
 * @typedef DropRulerProps
 * @type {{
 *   actions: any,
 *   selected_cells: string[],
 *   set_scroller: (enabled: any) => void
 *   serialize_selected: (id: string) => string | undefined,
 *   pluto_editor_element: HTMLElement,
 * }}
 */
/**
 * @augments Component<DropRulerProps,any>
 */
export class DropRuler extends Component<DropRulerProps, any> {
    constructor(props: DropRulerProps);
    dropee: HTMLElement;
    dropped: boolean;
    cell_edges: any[];
    pointer_position: {
        pageX: number;
        pageY: number;
    };
    precompute_cell_edges: () => void;
    getDropIndexOf: ({ pageX, pageY }: {
        pageX: any;
        pageY: any;
    }) => number;
    state: {
        drag_start: boolean;
        drag_target: boolean;
        drop_index: number;
    };
    componentDidMount(): void;
    lastenter: EventTarget;
    render(): import("../imports/Preact.js").ReactElement;
}
export type DropRulerProps = {
    actions: any;
    selected_cells: string[];
    set_scroller: (enabled: any) => void;
    serialize_selected: (id: string) => string | undefined;
    pluto_editor_element: HTMLElement;
};
import { Component } from "../imports/Preact.js";
