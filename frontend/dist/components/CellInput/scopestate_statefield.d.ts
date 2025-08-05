export function explore_variable_usage(tree: TreeCursor | SyntaxNode, doc: Text, _scopestate: any, verbose?: boolean): ScopeState;
/**
 * @type {StateField<ScopeState>}
 */
export let ScopeStateField: StateField<ScopeState>;
export type TreeCursor = import("../../imports/CodemirrorPlutoSetup.js").TreeCursor;
export type SyntaxNode = TreeCursor["node"];
export type Range = {
    from: number;
    to: number;
};
export type Definition = Range & {
    valid_from: number;
};
export type ScopeState = {
    usages: Array<{
        usage: Range;
        definition: Range | null;
        name: string;
    }>;
    definitions: Map<string, Definition>;
    locals: Array<{
        definition: Range;
        validity: Range;
        name: string;
    }>;
};
import { Text } from "../../imports/CodemirrorPlutoSetup.js";
import { StateField } from "../../imports/CodemirrorPlutoSetup.js";
