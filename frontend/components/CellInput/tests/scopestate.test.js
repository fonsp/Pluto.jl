import { jl } from "../lezer_template.js"
import { test_implicit } from "./scopestate_helpers.js"
// @ts-ignore
import chalk from "https://deno.land/x/chalk_deno@v4.1.1-deno/source/index.js"

let broken = (fn) => {
    try {
        console.log()
        fn()
        console.log(chalk.green("BROKEN TEST PASSED???"))
    } catch (error) {
        console.log(chalk.blue("Broken test failed as expected"))
    }
}

Deno.test("Function call", () => {
    test_implicit(jl`global_call(global_argument1, global_argument2...)`)
})

Deno.test("Simple definition", () => {
    test_implicit(jl`defined = 10`)
})

Deno.test("Tuple destructuring", () => {
    test_implicit(jl`(defined_1, defined_2, defined_3...) = global_call()`)
})

// Need to fix this later
Deno.test("BROKEN Named destructuring", () => {
    broken(() => {
        test_implicit(jl`(; irrelevant_1=defined_1, irrelevant_2=defined_2) = global_call()`)
    })
})

Deno.test("Array comprehension", () => {
    test_implicit(jl`(local_x + global_const for local_x in global_xs)`)
    test_implicit(jl`(
      local_x + local_y + global_const
      for local_x in global_xs
      for local_y in [local_x, local_x * 2]
    )`)
    test_implicit(jl`(local_x for local_x in global_xs if local_x > global_const)`)
})

Deno.test("BROKEN Array comprehension with comma but VERY WEIRD", () => {
    // So... `for x in xs, y in ys` does resolve the `_ in _`'s from right to left...
    // Except..... it then specifically "unbinds" the defined variables.....
    // So in this case, even though `irrelevant` might be globally defined,
    // this will ALWAYS say `irrelevant is not defined`, because it is "overshadowed" by the `for irrelevant in global_ys`.
    broken(() => {
        test_implicit(jl`(local_x + global_const for local_x in irrelevant, for irrelevant in global_ys)`)
    })
})

Deno.test("BROKEN Array comprehension with comma", () => {
    broken(() => {
        test_implicit(jl`(local_x for global_array in global_array_array, for local_x in global_array)`)
    })
})

Deno.test("Function definition", () => {
    test_implicit(jl`
        function defined_function(local_argument1, local_argument2...; local_argument3, local_argument4...)
            local_argument1, local_argument2, local_argument3, local_argument4
            global_var1, global_var2
        end
    `)
})

Deno.test("Function definition", () => {
    test_implicit(jl`
        function defined_function(local_argument1 = global_default)
            local_argument1
        end
    `)
})

Deno.test("Function definition where", () => {
    test_implicit(jl`
        function defined_function(local_argument1) where {local_type}
            local_argument1, local_type
        end
    `)
})

Deno.test("Function definition returntype", () => {
    test_implicit(jl`begin
        function defined_function(local_argument1)::global_type
            local_argument1
        end
    end`)
})

Deno.test("Function expression", () => {
    test_implicit(jl`defined_fn = (local_argument1, local_argument2) -> (local_argument1, local_argument2, global_var1, global_var2)`)
})

Deno.test("Let block", () => {
    test_implicit(jl`defined_outside = let local_let = global_let
        local_inside = local_let
        local_inside * global_inside
    end`)
})

Deno.test("Imports", () => {
    test_implicit(jl`import defined_module`)
    test_implicit(jl`import X: defined_specific1, defined_specific2`)
    test_implicit(jl`import X: defined_specific3, irrelevant as defined_alias`)
    test_implicit(jl`import X.defined_specific4`)
    test_implicit(jl`import X.irrelevant as defined_alias2`)
})

Deno.test("Typed struct", () => {
    test_implicit(jl`begin
        struct defined_struct{local_type} <: global_type{local_type, global_type2}
            g
            y::global_type3
            z = global_var
            x::local_type = global_var2
        end
  end`)
})

Deno.test("Quotes", () => {
    test_implicit(jl`quote
        irrelevant_1 = irrelevant_2
        irrelevant_3 = $(global_var)
    end`)
})

Deno.test("Nested Quotes", () => {
    test_implicit(jl`quote
            :($irrelevant)
            :($$global_var)
        end
    end`)
})

Deno.test("Macros", () => {
    test_implicit(jl`global_used.@irrelevant`)
    test_implicit(jl`@global_but_not_macro.irrelevant`)
    test_implicit(jl`@macro_global`)
})

Deno.test("Lonely bare tuple", () => {
    test_implicit(jl`defined, = (global_var,)`)
})

Deno.test("Very, very lonely arguments", () => {
    test_implicit(jl`global_var(;)`)
})
