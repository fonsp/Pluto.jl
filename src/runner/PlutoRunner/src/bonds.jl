import Base64
import UUIDs: UUID

const registered_bond_elements = Dict{Symbol, Any}()

function transform_bond_value(s::Symbol, value_from_js)
    element = get(registered_bond_elements, s, nothing)
    return try
        transform_value_ref[](element, value_from_js)
    catch e
        @error "🚨 AbstractPlutoDingetjes: Bond value transformation errored." exception=(e, catch_backtrace())
        (;
            message=Text("🚨 AbstractPlutoDingetjes: Bond value transformation errored."),
            exception=Text(
                sprint(showerror, e, stacktrace(catch_backtrace()))
            ),
            value_from_js,
        )
    end
end

function get_bond_names(cell_id)
    get(cell_registered_bond_names, cell_id, Set{Symbol}())
end

function possible_bond_values(s::Symbol; get_length::Bool=false)
    element = registered_bond_elements[s]
    possible_values = possible_bond_values_ref[](element)

    if possible_values === :NotGiven
        # Short-circuit to avoid the checks below, which only work if AbstractPlutoDingetjes is loaded.
        :NotGiven
    elseif possible_values isa AbstractPlutoDingetjes.Bonds.InfinitePossibilities
        # error("Bond \"$s\" has an unlimited number of possible values, try changing the `@bind` to something with a finite number of possible values like `PlutoUI.CheckBox(...)` or `PlutoUI.Slider(...)` instead.")
        :InfinitePossibilities
    elseif (possible_values isa AbstractPlutoDingetjes.Bonds.NotGiven)
        # error("Bond \"$s\" did not specify its possible values with `AbstractPlutoDingetjes.Bond.possible_values()`. Try using PlutoUI for the `@bind` values.")

        # If you change this, change it everywhere in this file.
        :NotGiven
    else
        get_length ?
            try
                length(possible_values)
            catch
                length(make_serializable(possible_values))
            end :
            make_serializable(possible_values)
    end
end

make_serializable(x::Any) = x
make_serializable(x::Union{AbstractVector,AbstractSet,Base.Generator}) = collect(x)
make_serializable(x::Union{Vector,Set,OrdinalRange}) = x


"""
_“The name is Bond, James Bond.”_

Wraps around an `element` and not much else. When you `show` a `Bond` with the `text/html` MIME type, you will get:

```html
<bond def="\$(bond.defines)">
\$(repr(MIME"text/html"(), bond.element))
</bond>
```

For example, `Bond(html"<input type=range>", :x)` becomes:

```html
<bond def="x">
<input type=range>
</bond>
```

The actual reactive-interactive functionality is not done in Julia - it is handled by the Pluto front-end (JavaScript), which searches cell output for `<bond>` elements, and attaches event listeners to them. Put on your slippers and have a look at the JS code to learn more.
"""
struct Bond
    element::Any
    defines::Symbol
    unique_id::String
    Bond(element, defines::Symbol) = showable(MIME"text/html"(), element) ? new(element, defines, Base64.base64encode(rand(UInt8,9))) : error("""Can only bind to html-showable objects, ie types T for which show(io, ::MIME"text/html", x::T) is defined.""")
end

function create_bond(element, defines::Symbol, cell_id::UUID)
    push!(cell_registered_bond_names[cell_id], defines)
    registered_bond_elements[defines] = element
    Bond(element, defines)
end

function Base.show(io::IO, m::MIME"text/html", bond::Bond)
    Markdown.withtag(io, :bond, :def => bond.defines, :unique_id => bond.unique_id) do
        show(io, m, bond.element)
    end
end

const initial_value_getter_ref = Ref{Function}(element -> missing)
const transform_value_ref = Ref{Function}((element, x) -> x)
const possible_bond_values_ref = Ref{Function}((_args...; _kwargs...) -> :NotGiven)

"""
```julia
@bind symbol element
```

Return the HTML `element`, and use its latest JavaScript value as the definition of `symbol`.

# Example

```julia
@bind x html"<input type=range>"
```
and in another cell:
```julia
x^2
```

The first cell will show a slider as the cell's output, ranging from 0 until 100.
The second cell will show the square of `x`, and is updated in real-time as the slider is moved.
"""
macro bind(def, element)
	if def isa Symbol
		quote
			$(load_integrations_if_needed)()
			local el = $(esc(element))
			global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : $(initial_value_getter_ref)[](el)
			PlutoRunner.create_bond(el, $(Meta.quot(def)), $(GiveMeCellID()))
		end
	else
		:(throw(ArgumentError("""\nMacro example usage: \n\n\t@bind my_number html"<input type='range'>"\n\n""")))
	end
end

"""
Will be inserted in saved notebooks that use the @bind macro, make sure that they still contain legal syntax when executed as a vanilla Julia script. Overloading `Base.get` for custom UI objects gives bound variables a sensible value.
Also turns off Runic and JuliaFormatter formatting to avoid issues with the formatter trying to change code that the user does not control. See https://domluna.github.io/JuliaFormatter.jl/stable/#Turn-off/on-formatting or https://github.com/fredrikekre/Runic.jl?tab=readme-ov-file#toggle-formatting
"""
const fake_bind = """
macro bind(def, element)
    #! format: off
    return quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = \$(esc(element))
        global \$(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
    #! format: on
end"""

