export namespace mod_d_command {
    let key: string;
    function run({ state, dispatch }: EditorView): boolean;
    function shift({ state, dispatch }: EditorView): boolean;
    let preventDefault: boolean;
}
import { EditorView } from "../../imports/CodemirrorPlutoSetup.js";
