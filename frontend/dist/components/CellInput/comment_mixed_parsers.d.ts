export function toggleComment(target: any): boolean;
export function toggleLineComment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export function lineComment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export function lineUncomment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export function toggleBlockComment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export function blockComment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export function blockUncomment({ state, dispatch }: {
    state: any;
    dispatch: any;
}): boolean;
export const commentKeymap: {
    key: string;
    run: (target: any) => boolean;
}[];
