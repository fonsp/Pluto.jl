### A Pluto.jl notebook ###
# v0.10.2

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : missing
        el
    end
end

# ╔═╡ db24490e-7eac-11ea-094e-9d3fc8f22784
md"# Introducing _bound_ variables

With the new `@bind` macro, Pluto.jl can listen to real-time events from HTML objects!"

# ╔═╡ bd24d02c-7eac-11ea-14ab-95021678e71e
@bind x html"<input type=range>"

# ╔═╡ cf72c8a2-7ead-11ea-32b7-d31d5b2dacc2
md"This syntax displays the HTML object as the cell's output, and uses its latest value as the definition of `x`. Of course, the variable `x` is _reactive_, and all references to `x` come to life ✨

_Try it out!_ 👆" 

# ╔═╡ cb1fd532-7eac-11ea-307c-ab16b1977819
x

# ╔═╡ 816ea402-7eae-11ea-2134-fb595cca3068
md""

# ╔═╡ ce7bec8c-7eae-11ea-0edb-ad27d2df059d
md"### Combining bonds

The `@bind` macro returns a `Bond` object, which can be used inside Markdown and HTML literals:"

# ╔═╡ fc99521c-7eae-11ea-269b-0d124b8cbe48
begin
	🐶slider = @bind 🐶 html"<input type=range>"
	🐱slider = @bind 🐱 html"<input type=range>"
	
	md"""**How many pets do you have?**
	
	Dogs: $(🐶slider)

	Cats: $(🐱slider)"""
end

# ╔═╡ 1cf27d7c-7eaf-11ea-3ee3-456ed1e930ea
md"You have $(🐶) dogs and $(🐱) cats!"

# ╔═╡ e3204b38-7eae-11ea-32be-39db6cc9faba
md""

# ╔═╡ 5301eb68-7f14-11ea-3ff6-1f075bf73955
md"### Input types

You can use _any_ DOM element that fires an `input` event. For example:"

# ╔═╡ c7203996-7f14-11ea-00a3-8192ccc54bd6
md"""
`a = ` $(@bind a html"<input type=range >")

`b = ` $(@bind b html"<input type=text >")

`c = ` $(@bind c html"<input type=button value='Click'>")

`d = ` $(@bind d html"<input type=checkbox >")

`e = ` $(@bind e html"<select><option value='one'>First</option><option value='two'>Second</option></select>")

`f = ` $(@bind f html"<input type=color >")

"""

# ╔═╡ ede8009e-7f15-11ea-192a-a5c6135a9dcf
(a, b, c, d, e, f)

# ╔═╡ e2168b4c-7f32-11ea-355c-cf5932419a70
md"""**You can also use JavaScript to write more complicated input objects.** The `input` event can be triggered on any object using

```js
obj.dispatchEvent(new CustomEvent("input"))
```

Try drawing a rectangle in the canvas below 👇 and notice that the `area` variable updates."""

# ╔═╡ 7f4b0e1e-7f16-11ea-02d3-7955921a70bd
@bind dims html"""
<canvas width="200" height="200" style="position: relative"></canvas>

<script>
// 🐸 `currentScript` is the current script tag - we use it to select elements 🐸 //
const canvas = currentScript.closest('pluto-output').querySelector("canvas")
const ctx = canvas.getContext("2d")

var startX = 80
var startY = 40

function onmove(e){
	// 🐸 We send the value back to Julia 🐸 //
	canvas.value = [e.layerX - startX, e.layerY - startY]
	canvas.dispatchEvent(new CustomEvent("input"))

	ctx.fillStyle = '#ffecec'
	ctx.fillRect(0, 0, 200, 200)
	ctx.fillStyle = '#3f3d6d'
	ctx.fillRect(startX, startY, ...canvas.value)
}

canvas.onmousedown = e => {
	startX = e.layerX
	startY = e.layerY
	canvas.onmousemove = onmove
}

canvas.onmouseup = e => {
	canvas.onmousemove = null
}

// Fire a fake mousemoveevent to show something
onmove({layerX: 130, layerY: 160})

</script>
"""

# ╔═╡ 5876b98e-7f32-11ea-1748-0bb47823cde1
area = abs(dims[1] * dims[2])

# ╔═╡ 72c7f60c-7f48-11ea-33d9-c5ea55a0ad1f
dims

# ╔═╡ d774fafa-7f34-11ea-290d-37805806e14b
md""

# ╔═╡ 8db857f8-7eae-11ea-3e53-058a953f2232
md"""## Can I use it?

The `@bind` macro is **built into Pluto.jl** — it works without having to install a package. 

You can use the (tiny) package [`PlutoUI`](https://github.com/fonsp/PlutoUI.jl) for some predefined `<input>` HTML codes. For example, you use `PlutoUI` to write

```julia
@bind x Slider(5:15)
```

instead of 

```julia
@bind x html"<input type=range min=5 max=15>"
```

Have a look at the [sample notebook about PlutoUI](./sample/PlutoUI.jl.jl)!

_The `@bind` syntax in not limited to `html"..."` objects, but **can be used for any HTML-showable object!**_
"""

# ╔═╡ d5b3be4a-7f52-11ea-2fc7-a5835808207d
md"""#### More packages

In fact, **_any package_ can add bindable values to their objects**. For example, a geoplotting package could add a JS `input` event to their plot that contains the cursor coordinates when it is clicked. You can then use those coordinates inside Julia.

A package _does not need to add `Pluto.jl` as a dependency to do so_: only the `Base.show(io, MIME("text/html"), obj)` function needs to be extended to contain a `<script>` that triggers the `input` event with a value. (It's up to the package creator _when_ and _what_.) This _does not affect_ how the object is displayed outside of Pluto.jl: uncaught events are ignored by your browser."""

# ╔═╡ 36ca3050-7f36-11ea-3caf-cb10e945ca99
md"""## Tips

#### Wrap large code blocks
If you have a large block of code that depends on a bound variable `t`, it will be faster to wrap that code inside a function `f(my_t)` (which depends on `my_t` instead of `t`), and then _call_ that function from another cell, with `t` as parameter.

This way, only the Julia code "`f(t)`" needs to be lowered and re-evaluated, instead of the entire code block."""

# ╔═╡ 03701e62-7f37-11ea-3b9a-d9d5ae2344e6
md"""#### Separate definition and reference

If you put a bond and a reference to the same variable together, it will keep evaluating in a loop.

So **do not** write
```julia
md""\"$(@bind r html"<input type=range>")  $(r^2)""\"
```

Instead, create two cells:
```julia
md""\"$(@bind r html"<input type=range>")""\"
```
```julia
r^2
```
"""

# ╔═╡ 55783466-7eb1-11ea-32d8-a97311229e93
md""

# ╔═╡ 582769e6-7eb1-11ea-077d-d9b4a3226aac
md"## Behind the scenes

#### What is x?

It's an **`Int64`**! Not an Observable, not a callback function, but simply _the latest value of the input element_.

The update mechanism is _lossy_ and _lazy_, which means that it will skip values if your code is still running - and **only send the latest value when your code is ready again**. This is important when changing a slider from `0` to `100`, for example. If it would send all intermediate values, it might take a while for your code to process everything, causing a noticable lag."

# ╔═╡ 8f829274-7eb1-11ea-3888-13c00b3ba70f
md"""#### What does the macro do?

The `@bind` macro does not actually contain the interactivity mechanism, this is built into Pluto itself. Still, it does two things: it assigns a _default value_ to the variable (`missing` in most cases), and it wraps the second argument in a `PlutoRunner.Bond` object.

For example, _expanding_ the `@bind` macro turns this expression:

```julia
@bind x Slider(5:15)
```

into:
```julia
begin
	local el = Slider(5:15)
	global x = if applicable(Base.get, el)
		Base.get(el)
	else
		missing
	end
	PlutoRunner.Bond(el, :x)
end
```

The `if` block in the middle assigns an initial value to `x`, which will be `missing`, unless an extension of `Base.get` has been declared for the element. Most objects (like `html"<input>"` or `md"quelque chose"`) don't have a `Base.get` method defined. In fact, `Base.get` has _no_ single-argument methods by default, but you can write one for your special types!

Declaring a default value using `Base.get` is **not necessary**, as shown by the examples above, but the default value will be used for `x` if the `notebook.jl` file is _run as a plain julia file_, without Pluto's interactivity. The package [`PlutoUI`](https://github.com/fonsp/PlutoUI.jl) defines default values.

"""

# ╔═╡ ced18648-7eb2-11ea-2052-07795685f0da
md"#### JavaScript?

Yes! We are using `Generator.input` from [`observablehq/stdlib`](https://github.com/observablehq/stdlib#Generators_input) to create a JS _Generator_ (kind of like an Observable) that listens to `onchange`, `onclick` or `oninput` events, [depending on the element type](https://github.com/observablehq/stdlib#Generators_input).

This makes it super easy to create nice HTML/JS-based interaction elements - a package creator simply has to write a `show` method for MIME type `text/html` that creates a DOM object that triggers the `input` event. In other words, _Pluto's `@bind` will behave exactly like `viewof` in observablehq_.

_If you want to make a cool new UI, go to [observablehq.com/@observablehq/introduction-to-views](https://observablehq.com/@observablehq/introduction-to-views) to learn how._"

# ╔═╡ dddb9f34-7f37-11ea-0abb-272ef1123d6f
md""

# ╔═╡ 23db0e90-7f35-11ea-1c05-115773b44afa
md""

# ╔═╡ f7555734-7f34-11ea-069a-6bb67e201bdc
md"That's it for now! Let us know what you think using the feedback button below! 👇"

# ╔═╡ Cell order:
# ╟─db24490e-7eac-11ea-094e-9d3fc8f22784
# ╠═bd24d02c-7eac-11ea-14ab-95021678e71e
# ╟─cf72c8a2-7ead-11ea-32b7-d31d5b2dacc2
# ╠═cb1fd532-7eac-11ea-307c-ab16b1977819
# ╟─816ea402-7eae-11ea-2134-fb595cca3068
# ╟─ce7bec8c-7eae-11ea-0edb-ad27d2df059d
# ╠═fc99521c-7eae-11ea-269b-0d124b8cbe48
# ╠═1cf27d7c-7eaf-11ea-3ee3-456ed1e930ea
# ╟─e3204b38-7eae-11ea-32be-39db6cc9faba
# ╟─5301eb68-7f14-11ea-3ff6-1f075bf73955
# ╟─c7203996-7f14-11ea-00a3-8192ccc54bd6
# ╠═ede8009e-7f15-11ea-192a-a5c6135a9dcf
# ╟─e2168b4c-7f32-11ea-355c-cf5932419a70
# ╟─7f4b0e1e-7f16-11ea-02d3-7955921a70bd
# ╠═5876b98e-7f32-11ea-1748-0bb47823cde1
# ╠═72c7f60c-7f48-11ea-33d9-c5ea55a0ad1f
# ╟─d774fafa-7f34-11ea-290d-37805806e14b
# ╟─8db857f8-7eae-11ea-3e53-058a953f2232
# ╟─d5b3be4a-7f52-11ea-2fc7-a5835808207d
# ╟─36ca3050-7f36-11ea-3caf-cb10e945ca99
# ╟─03701e62-7f37-11ea-3b9a-d9d5ae2344e6
# ╟─55783466-7eb1-11ea-32d8-a97311229e93
# ╟─582769e6-7eb1-11ea-077d-d9b4a3226aac
# ╟─8f829274-7eb1-11ea-3888-13c00b3ba70f
# ╟─ced18648-7eb2-11ea-2052-07795685f0da
# ╟─dddb9f34-7f37-11ea-0abb-272ef1123d6f
# ╟─23db0e90-7f35-11ea-1c05-115773b44afa
# ╟─f7555734-7f34-11ea-069a-6bb67e201bdc
