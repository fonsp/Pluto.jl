import { assertEquals as untyped_assertEquals } from "https://deno.land/std@0.123.0/testing/asserts.ts"
import { jl, as_node, as_doc, JuliaCodeObject, as_string } from "../lezer_template.js"
import { explore_variable_usage } from "../scopestate_statefield.js"

/**
 * @template T
 * @param {T} a
 * @param {T} b
 **/
export let assertEquals = (a, b) => untyped_assertEquals(a, b)

/**
 * @param {import("../scopestate_statefield.js").ScopeState} scopestate
 */
let simplify_scopestate = (scopestate) => {
    let { definitions, usages } = scopestate
    return {
        defined: new Set(Array.from(definitions.keys())),
        local_used: new Set(usages.filter((x) => x.definition != null).map((x) => x.name)),
        global_used: new Set(usages.filter((x) => x.definition == null).map((x) => x.name)),
    }
}

/**
 * @param {import("../lezer_template.js").JuliaCodeObject} input
 * @param {{
 *  defined?: Array<string>,
 *  local_used?: Array<string>,
 *  global_used?: Array<string>,
 * }} expected
 */
export let test_scopestate = (input, expected) => {
    let scopestate = {
        defined: [],
        local_used: [],
        global_used: [],
    }
    assertEquals(simplify_scopestate(explore_variable_usage(as_node(input).cursor, as_doc(input))), {
        defined: new Set(expected.defined),
        local_used: new Set(expected.local_used),
        global_used: new Set(expected.global_used),
    })
}

/**
 * @param {JuliaCodeObject} code
 */
export function test_implicit(code) {
    let expected_scopestate = { defined: [], local_used: [], global_used: [] }

    for (let variable of as_string(code).matchAll(/(macro_)?(global|local|defined)(_[a-z0-9_]+)?/g)) {
        let [variable_name, is_macro, usage_type] = variable

        if (is_macro != null) {
            variable_name = `@${variable_name}`
        }

        let index = variable.index
        if (usage_type === "global") {
            expected_scopestate.global_used.push(variable_name)
        } else if (usage_type === "local") {
            expected_scopestate.local_used.push(variable_name)
        } else if (usage_type === "defined") {
            expected_scopestate.defined.push(variable_name)
        }
    }

    return test_scopestate(code, expected_scopestate)
}
