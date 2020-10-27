###
# BONDS
###

module Bonds

import ..PlutoRunner

export @bind, fake_bind, Bond

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
    Bond(element, defines::Symbol) = showable(MIME"text/html"(), element) ? new(element, defines) : error("""Can only bind to html-showable objects, ie types T for which show(io, ::MIME"text/html", x::T) is defined.""")
end

import Base: show
import Markdown: withtag
function show(io::IO, ::MIME"text/html", bond::Bond)
    withtag(io, :bond, :def => bond.defines) do 
        show(io, MIME"text/html"(), bond.element)
    end
end

"""
    `@bind symbol element`

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
            local el = $(esc(element))
            global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : missing
			      $(PlutoRunner.Bond)(el, $(Meta.quot(def)))
		    end
	  else
		    :(throw(ArgumentError("""\nMacro example usage: \n\n\t@bind my_number html"<input type='range'>"\n\n""")))
	  end
end

"""
Will be inserted in saved notebooks that use the @bind macro, make sure that they still contain legal syntax when executed as a vanilla Julia script. Overloading `Base.get` for custom UI objects gives bound variables a sensible value.
"""
const fake_bind = """macro bind(def, element)
    quote
        local el = \$(esc(element))
        global \$(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : missing
        el
    end
end"""

end
