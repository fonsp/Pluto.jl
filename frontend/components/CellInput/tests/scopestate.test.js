import { assertEquals as untyped_assertEquals } from "https://deno.land/std@0.123.0/testing/asserts.ts"
import { jl, as_node, as_doc, JuliaCodeObject, as_string } from "../lezer_template.js"
import { explore_variable_usage } from "../go_to_definition_plugin.js"

/**
 * @template T
 * @param {T} a
 * @param {T} b
 **/
let assertEquals = (a, b) => untyped_assertEquals(a, b)

/**
 * @param {import("../go_to_definition_plugin.js").ScopeState} scopestate
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
let test_scopestate = (input, expected) => {
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
function test(code) {
    let expected_scopestate = { defined: [], local_used: [], global_used: [] }

    for (let variable of as_string(code).matchAll(/(global|local|defined)_[a-z0-9]*/g)) {
        let [variable_name, usage_type] = variable
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

Deno.test("Function call", () => {
    test(jl`global_call(global_argument1, global_argument2...)`)
})

Deno.test("Simple definition", () => {
    test(jl`defined_ = 10`)
})

Deno.test("Array comprehension", () => {
    test(jl`(local_x + global_const for local_x in global_xs)`)
    test(jl`(
      local_x + local_y + global_const
      for local_x in global_xs
      for local_y in [local_x, local_x * 2]
    )`)
    test(jl`(local_x for local_x in global_xs if local_x > global_const)`)
})

Deno.test("BROKEN Array comprehension with comma but VERY WEIRD", () => {
    // So... `for x in xs, y in ys` does resolve the `_ in _`'s from right to left...
    // Except..... it then specifically "unbinds" the defined variables.....
    // So in this case, even though `irrelevant` might be globally defined,
    // this will ALWAYS say `irrelevant is not defined`, because it is "overshadowed" by the `for irrelevant in global_ys`.
    test(jl`(local_x + global_const for local_x in irrelevant, for irrelevant in global_ys)`)
})

Deno.test("BROKEN Array comprehension with comma", () => {
    test(jl`(local_x for global_array in global_array_array, for local_x in global_array)`)
})

Deno.test("Function definition", () => {
    test(jl`
        function defined_function(local_argument1, local_argument2...; local_argument3, local_argument4...)
            local_argument1, local_argument2, local_argument3, local_argument4
            global_var1, global_var2
        end
    `)
})

Deno.test("Function definition where", () => {
    test(jl`
        function defined_function(local_argument1) where {local_type}
            local_argument1, local_type
        end
    `)
})

Deno.test("Function definition returntype", () => {
    test(jl`begin
        function defined_function(local_argument1)::global_type
            local_argument1
        end
    end`)
})

Deno.test("Function expression", () => {
    test(jl`defined_fn = (local_argument1, local_argument2) -> (local_argument1, local_argument2, global_var1, global_var2)`)
})

Deno.test("Let block", () => {
    test(jl`defined_outside = let local_let = global_let
        local_inside = local_let
        local_inside * global_inside
    end`)
})

Deno.test("Imports", () => {
    test(jl`import defined_module`)
    test(jl`import X: defined_specific1, defined_specific2`)
    test(jl`import X: defined_specific3, irrelevant as defined_alias`)
    test(jl`import X.defined_specific4`)
    test(jl`import X.irrelevant as defined_alias2`)
})

Deno.test("Typed struct", () => {
    test(jl`begin
        struct defined_struct{local_type} <: global_type{local_type, global_type2}
            g
            y::global_type3
            z = global_var
            x::local_type = global_var2
        end
  end`)
})
