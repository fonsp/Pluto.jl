### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end

# ╔═╡ 2e54b8fc-7852-11ec-27d7-df0bfe7f344a
using PlutoUI

# ╔═╡ 257ee9b0-d955-43d2-9c94-245716708a2d
using HypertextLiteral

# ╔═╡ 82c316c7-a279-4728-b16a-921d7fc52886


# ╔═╡ 0b19e53d-eb7a-42b6-a7db-d95bc8c63eae
import MarkdownLiteral: @mdx

# ╔═╡ 0c0bab41-a020-41a0-83ad-0c57b4699ffa
const Layout = PlutoUI.ExperimentalLayout

# ╔═╡ c097b477-e154-47eb-b7d9-a4d2981dcf0e
padded(x) = Layout.Div([x]; style=Dict("padding" => "0em 1em"))

# ╔═╡ ddccf592-0d0f-475c-81ae-067c37ba3f7e
const all_directions = ["North", "East", "South", "West"]

# ╔═╡ d441b495-a00c-4de3-a232-7c75f55fc95b
function Carousel2(
		elementsList;
		wraparound::Bool=false,
		peek::Bool=true,
	)
	
	@assert peek
	
    carouselHTML = map(elementsList) do element
		Layout.Div([element]; class="carousel-slide")
    end

	h = Layout.Div([
		@htl("""
		<style>
	    .carousel-box{
	        width: 100%;
	        overflow: hidden;
	    }
	    .carousel-container{
	        top: 0;
	        left: 0;
	        display: flex;
	        width: 100%;
	        flex-flow: row nowrap;
	        transform: translate(10%, 0px);
	        transition: transform 200ms ease-in-out;
	    }
	    .carousel-controls{
	        display: flex;
	        justify-content: center;
	        align-items: center;
	    }
	    .carousel-controls button{
	        margin: 8px;
	        width: 6em;
	    }
	    .carousel-slide {
	        min-width: 80%;
			overflow-x: auto;
	    }
	    </style>
		"""),
		
		Layout.Div([
			Layout.Div(carouselHTML; class="carousel-container")
		]; class="carousel-box"),
		@htl("""
		<div class="carousel-controls">
	        <button data-value="-1">Previous</button>
	        <button data-value="1">Next</button>
	    </div>
		"""),
		@htl("""
		<script>
		// Here is a little trick!
		// We include the number of elements inside the code, which will make this script re-run whenever it changes. Pluto only re-renders HTML when it changed.
		const max = $(length(elementsList))

        let div = currentScript.closest(".carousel-wrapper")
		let bound_element = div.parentElement.tagName === "PLUTO-DISPLAY" ? div.parentElement : div
		bound_element.value = 1
		let count = 0

		let buttons = div.querySelectorAll("button")

		const update_ui = () => {
			buttons[0].disabled = !$(wraparound) && count === 0
			buttons[1].disabled = !$(wraparound) && count === max - 1
		
			div.querySelector(".carousel-container").style = `transform: translate(\${10-count*80}%, 0px)`;
		}

		Object.defineProperty(bound_element, "value", {
			get: () => count + 1,
			set: (new_value) => {
				count = new_value - 1
				update_ui()
			}
		})


		const mod = (n, m) => ((n % m) + m) % m
		const clamp = (x, a, b) => Math.max(Math.min(x, b), a)
		
		const onclick = (e) => {
			const new_count = count + parseInt(e.target.dataset.value)
			if($(wraparound)){
				count = mod(new_count, max)
			} else {
				count = clamp(new_count, 0, max - 1)
			}
			
            
			bound_element.dispatchEvent(new CustomEvent("input"))
			update_ui()
            e.preventDefault()
        }

		// This code is in a requestIdleCallback because we need the buttons to be rendered before we can select them.
		requestIdleCallback(() => {
        	buttons = div.querySelectorAll("button")
	        buttons.forEach(button => button.addEventListener("click", onclick))
			update_ui()
		})
		
	    </script>
		"""),
	]; class="carousel-wrapper")
	
	# BondDefault(h,1)
	h
end

# ╔═╡ fa0b6647-6911-4c27-a1a6-240d215331d1
function Carousel(
		elementsList;
		wraparound::Bool=false,
		peek::Bool=true,
	)
	
	@assert peek
	
    carouselHTML = map(elementsList) do element
        @htl("""<div class="carousel-slide">
            $(element)
        </div>""")
    end
	
    h = @htl("""
<div>
    <style>
    .carousel-box{
        width: 100%;
        overflow: hidden;
    }
    .carousel-container{
        top: 0;
        left: 0;
        display: flex;
        width: 100%;
        flex-flow: row nowrap;
        transform: translate(10%, 0px);
        transition: transform 200ms ease-in-out;
    }
    .carousel-controls{
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .carousel-controls button{
        margin: 8px;
        width: 6em;
    }
    .carousel-slide {
        min-width: 80%;
    }
    </style>
		
    <script>
        const div = currentScript.parentElement
        const buttons = div.querySelectorAll("button")
		
		const max = $(length(elementsList))

		let count = 0
		
		const mod = (n, m) => ((n % m) + m) % m
		const clamp = (x, a, b) => Math.max(Math.min(x, b), a)
		
		const update_ui = (count) => {
			buttons[0].disabled = !$(wraparound) && count === 0
			buttons[1].disabled = !$(wraparound) && count === max - 1
		
			div.querySelector(".carousel-container").style = `transform: translate(\${10-count*80}%, 0px)`;
		}
		
		const onclick = (e) => {
			const new_count = count + parseInt(e.target.dataset.value)
			if($(wraparound)){
				count = mod(new_count, max)
			} else {
				count = clamp(new_count, 0, max - 1)
			}
			
            
			div.value = count + 1
			div.dispatchEvent(new CustomEvent("input"))
			update_ui(div.value - 1)
            e.preventDefault()
        }
        buttons.forEach(button => button.addEventListener("click", onclick))
        div.value = count + 1
		update_ui(div.value - 1)
    </script>
		
    <div class="carousel-box">
        <div class="carousel-container">
            $(carouselHTML)
        </div>
    </div>
		
    <div class="carousel-controls">
        <button data-value="-1">Previous</button>
        <button data-value="1">Next</button>
    </div>
</div>
    """)
	
	# BondDefault(h,1)
	h
end

# ╔═╡ 6c84a84f-9ead-4091-819e-0de088e2dd4d
function wind_speeds(directions)
	PlutoUI.combine() do Child
		@htl("""
		<h6>Wind speeds</h6>
		<ul>
		$([
			@htl("<li>$(name): $(Child(name, Slider(1:100)))</li>")
			for name in directions
		])
		</ul>
		""")
	end
end


# ╔═╡ e866282e-7c63-4364-b344-46f4c6ad165c
dogscats() = PlutoUI.combine() do Child
	md"""
	# Hi there!

	I have $(
		Child(Slider(1:10))
	) dogs and $(
		Child(Slider(5:100))
	) cats.

	Would you like to see them? $(Child(CheckBox(true)))
	"""
end

# ╔═╡ cd3b9ad1-8efc-4f92-96d0-b9b038d8cfae
md"""
## MultiCheckBox copy

This is a version of MultiCheckBox from PlutoUI that did not support synchronizing multiple bonds, i.e. it doesn't have `Object.defineProperty(wrapper, "input", {get, set})`.

This means that this won't work be synced:

```julia
bond = @bind value MultiCheckbox([1,2])
```

```julia
bond
```

We need this for the test to be extra sensitive.
"""

# ╔═╡ 79b6ac0f-4d0b-485f-8fb0-9849932dc34e
import AbstractPlutoDingetjes.Bonds

# ╔═╡ eaad4fed-ea22-4132-a84a-429f486ddce2
subarrays(x) = (
	x[collect(I)]
	for I in Iterators.product(Iterators.repeated([true,false],length(x))...) |> collect |> vec
)

# ╔═╡ 146474b5-9aa6-4000-867d-ba91e4061d9b
begin
    local result = begin
    """
    ```julia
    MultiCheckBox(options::Vector; [default::Vector], [orientation ∈ [:row, :column]], [select_all::Bool])
    ```
    
    A group of checkboxes - the user can choose which of the `options` to return.
    The value returned via `@bind` is a list containing the currently checked items.

    See also: [`MultiSelect`](@ref).

    `options` can also be an array of pairs `key::Any => value::String`. The `key` is returned via `@bind`; the `value` is shown.

    # Keyword arguments
    - `defaults` specifies which options should be checked initally.
    - `orientation` specifies whether the options should be arranged in `:row`'s `:column`'s.
    - `select_all` specifies whether or not to include a "Select All" checkbox.

    # Examples
    ```julia
    @bind snacks MultiCheckBox(["🥕", "🐟", "🍌"]))
    
    if "🥕" ∈ snacks
        "Yum yum!"
    end
    ```
    
    ```julia
    @bind functions MultiCheckBox([sin, cos, tan])
    
    [f(0.5) for f in functions]
    ```

    ```julia
    @bind snacks MultiCheckBox(["🥕" => "🐰", "🐟" => "🐱", "🍌" => "🐵"]; default=["🥕", "🍌"])
    ```

    ```julia
    @bind animals MultiCheckBox(["🐰", "🐱" , "🐵", "🐘", "🦝", "🐿️" , "🐝",  "🐪"]; orientation=:column, select_all=true)
    ```
    """
    struct MultiCheckBox{BT,DT}
        options::AbstractVector{Pair{BT,DT}}
        default::Union{Missing,AbstractVector{BT}}
        orientation::Symbol
        select_all::Bool
    end
    end

    MultiCheckBox(options::AbstractVector{<:Pair{BT,DT}}; default=missing, orientation=:row, select_all=false) where {BT,DT} = MultiCheckBox(options, default, orientation, select_all)
        
    MultiCheckBox(options::AbstractVector{BT}; default=missing, orientation=:row, select_all=false) where BT = MultiCheckBox{BT,BT}(Pair{BT,BT}[o => o for o in options], default, orientation, select_all)

    function Base.show(io::IO, m::MIME"text/html", mc::MultiCheckBox)
        @assert mc.orientation == :column || mc.orientation == :row "Invalid orientation $(mc.orientation). Orientation should be :row or :column"

        defaults = coalesce(mc.default, [])

		# Old:
		# checked = [k in defaults for (k,v) in mc.options]
		# 
		# More complicated to fix https://github.com/JuliaPluto/PlutoUI.jl/issues/106
		defaults_copy = copy(defaults)
		checked = [
			let
				i = findfirst(isequal(k), defaults_copy)
				if i === nothing
					false
				else
					deleteat!(defaults_copy, i)
					true
				end
			end
		for (k,v) in mc.options]
		
        show(io, m, @htl("""
        <plj-multi-checkbox style="flex-direction: $(mc.orientation);"></plj-multi-checkbox>
        <script type="text/javascript">
		const labels = $([string(v) for (k,v) in mc.options]);
		const values = $(1:length(mc.options));
		const checked = $(checked);
		const includeSelectAll = $(mc.select_all);

		const container = (currentScript ? currentScript : this.currentScript).previousElementSibling
		
		const my_id = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
		
		// Add checkboxes
		const inputEls = []
		for (let i = 0; i < labels.length; i++) {
			const boxId = `\${my_id}-box-\${i}`
		
			const item = document.createElement('div')
		
			const checkbox = document.createElement('input')
			checkbox.type = 'checkbox'
			checkbox.id = boxId
			checkbox.name = labels[i]
			checkbox.value = values[i]
			checkbox.checked = checked[i]
			inputEls.push(checkbox)
			item.appendChild(checkbox)
		
			const label = document.createElement('label')
			label.htmlFor = boxId
			label.innerText = labels[i]
			item.appendChild(label)
		
			container.appendChild(item)
		}
		
		function setValue() {
			container.value = inputEls.filter((o) => o.checked).map((o) => o.value)
		}
		// Add listeners
		function sendEvent() {
			setValue()
			container.dispatchEvent(new CustomEvent('input'))
		}
		
		function updateSelectAll() {}
		
		if (includeSelectAll) {
			// Add select-all checkbox.
			const selectAllItem = document.createElement('div')
			selectAllItem.classList.add(`select-all`)
		
			const selectID = `\${my_id}-select-all`
		
			const selectAllInput = document.createElement('input')
			selectAllInput.type = 'checkbox'
			selectAllInput.id = selectID
			selectAllItem.appendChild(selectAllInput)
		
			const selectAllLabel = document.createElement('label')
			selectAllLabel.htmlFor = selectID
			selectAllLabel.innerText = 'Select All'
			selectAllItem.appendChild(selectAllLabel)
		
			container.prepend(selectAllItem)
		
			function onSelectAllClick(event) {
				event.stopPropagation()
				inputEls.forEach((o) => (o.checked = this.checked))
				sendEvent()
			}
			selectAllInput.addEventListener('click', onSelectAllClick)
            selectAllInput.addEventListener('input', e => e.stopPropagation())
		
			/// Taken from: https://stackoverflow.com/questions/10099158/how-to-deal-with-browser-differences-with-indeterminate-checkbox
			/// Determine the checked state to give to a checkbox
			/// with indeterminate state, so that it becomes checked
			/// on click on IE, Chrome and Firefox 5+
			function getCheckedStateForIndeterminate() {
				// Create a unchecked checkbox with indeterminate state
				const test = document.createElement('input')
				test.type = 'checkbox'
				test.checked = false
				test.indeterminate = true
		
				// Try to click the checkbox
				const body = document.body
				body.appendChild(test) // Required to work on FF
				test.click()
				body.removeChild(test) // Required to work on FF
		
				// Check if the checkbox is now checked and cache the result
				if (test.checked) {
					getCheckedStateForIndeterminate = function () {
						return false
					}
					return false
				} else {
					getCheckedStateForIndeterminate = function () {
						return true
					}
					return true
				}
			}
		
			updateSelectAll = function () {
				const checked = inputEls.map((o) => o.checked)
				if (checked.every((x) => x)) {
					selectAllInput.checked = true
					selectAllInput.indeterminate = false
				} else if (checked.some((x) => x)) {
					selectAllInput.checked = getCheckedStateForIndeterminate()
					selectAllInput.indeterminate = true
				} else {
					selectAllInput.checked = false
					selectAllInput.indeterminate = false
				}
			}
			// Call once at the beginning to initialize.
			updateSelectAll()
		}
		
		function onItemClick(event) {
			event.stopPropagation()
			updateSelectAll()
			sendEvent()
		}
		setValue()
		inputEls.forEach((el) => el.addEventListener('click', onItemClick))
		inputEls.forEach((el) => el.addEventListener('input', e => e.stopPropagation()))
		
        </script>
        <style type="text/css">
		plj-multi-checkbox {
			display: flex;
			flex-wrap: wrap;
			/* max-height: 8em; */
		}
		
		plj-multi-checkbox * {
			display: flex;
		}
		
		plj-multi-checkbox > div {
			margin: 0.1em 0.3em;
			align-items: center;
		}
		
		plj-multi-checkbox label,
		plj-multi-checkbox input {
			cursor: pointer;
		}
		
		plj-multi-checkbox .select-all {
			font-style: italic;
			color: hsl(0, 0%, 25%, 0.7);
		}
		</style>
        """))
    end

    Base.get(select::MultiCheckBox) = Bonds.initial_value(select)
    Bonds.initial_value(select::MultiCheckBox{BT,DT}) where {BT,DT} = 
        ismissing(select.default) ? BT[] : select.default
    Bonds.possible_values(select::MultiCheckBox) = 
        subarrays(map(string, 1:length(select.options)))
    
    function Bonds.transform_value(select::MultiCheckBox{BT,DT}, val_from_js) where {BT,DT}
        # val_from_js will be a vector of Strings, but let's allow Integers as well, there's no harm in that
        @assert val_from_js isa Vector
        
        val_nums = (
            v isa Integer ? v : tryparse(Int64, v)
            for v in val_from_js
        )
        
        BT[select.options[v].first for v in val_nums]
    end
    
    function Bonds.validate_value(select::MultiCheckBox, val)
        val isa Vector && all(val_from_js) do v
            val_num = v isa Integer ? v : tryparse(Int64, v)
            1 ≤ val_num ≤ length(select.options)
        end
    end
    result
end

# ╔═╡ 67e2cb97-e224-47ca-96ba-2e89d94959e7
ppp = @bind opop Slider(1:10);

# ╔═╡ b1c0d12c-f383-44fb-bcfe-4157a2801b9a
Layout.Div([
	ppp,
	@htl("""$(opop)""")
])

# ╔═╡ a060f034-b540-4b1e-a87f-7e6185e15646
directions_bond = @bind chosen_directions MultiCheckBox(all_directions);

# ╔═╡ 466bf852-144c-47df-98e1-89935754f5f1
chosen_directions_copy = chosen_directions

# ╔═╡ 6e26a930-1b49-4ff5-8704-9149d3cab7e9
speeds_bond = @bind speeds wind_speeds(chosen_directions);

# ╔═╡ ede20024-1aea-4d80-a19a-8a5ec88a00ac
data = map(speeds) do s
	rand(50) .+ s
end

# ╔═╡ acb08d1f-30f9-4e01-8216-3440c82714c7
pairs(speeds) |> collect

# ╔═╡ fffd6402-d508-48a6-abc6-3de333497787
big_input = Carousel2([
	md"""
	## Step 1: *directions*
	$(directions_bond)
	""" |> identity,
	
	md"""
	## Step 2: *speeds*
	$(speeds_bond)
	""" |> identity,

	md"""
	## Step 3: 🎉
	$(embed_display(
		data
	))
	""" |> identity,
	
	# md"""
	# ## Step 4: 📉
	# $(embed_display(
	# 	let
	# 		p = plot()
			
	# 		for (n,v) in pairs(data)
	# 			plot!(p, v; label=string(n))
	# 		end
	# 		p
	# 	end
	# ))
	# """ |> padded,
])

# ╔═╡ 0cb7b599-cec5-4391-9485-4e1c63cd9ff2
speeds_copy = speeds

# ╔═╡ ab108b97-4dd5-49e4-845c-2f0fab131f8a
Layout.vbox([
	directions_bond,
	speeds_bond,
	speeds
])

# ╔═╡ 596dbead-63ce-432a-8a0b-b3ea361e279e
xoxob = @bind xoxo Carousel2([md"# a",md"# b",3,rand(4)])

# ╔═╡ 8c96934c-3e23-45ed-b945-dce344bfb6eb
xoxob_again = xoxob

# ╔═╡ af1ad32b-af53-4865-9807-ba8d0fba2a8c
xoxo

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
AbstractPlutoDingetjes = "6e696c72-6542-2067-7265-42206c756150"
HypertextLiteral = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
MarkdownLiteral = "736d6165-7244-6769-4267-6b50796e6954"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
AbstractPlutoDingetjes = "~1.2.0"
HypertextLiteral = "~0.9.4"
MarkdownLiteral = "~0.1.1"
PlutoUI = "~0.7.52"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[AbstractPlutoDingetjes]]
deps = ["Pkg"]
git-tree-sha1 = "91bd53c39b9cbfb5ef4b015e8b582d344532bd0a"
uuid = "6e696c72-6542-2067-7265-42206c756150"
version = "1.2.0"

[[ArgTools]]
uuid = "0dad84c5-d112-42e6-8d28-ef12dabb789f"
version = "1.1.1"

[[Artifacts]]
uuid = "56f22d72-fd6d-98f1-02f0-08ddc0907c33"

[[Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[ColorTypes]]
deps = ["FixedPointNumbers", "Random"]
git-tree-sha1 = "eb7f0f8307f71fac7c606984ea5fb2817275d6e4"
uuid = "3da002f7-5984-5a60-b8a6-cbb66c0b333f"
version = "0.11.4"

[[CommonMark]]
deps = ["Crayons", "JSON", "PrecompileTools", "URIs"]
git-tree-sha1 = "532c4185d3c9037c0237546d817858b23cf9e071"
uuid = "a80b9123-70ca-4bc0-993e-6e3bcb318db6"
version = "0.8.12"

[[CompilerSupportLibraries_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "e66e0078-7015-5450-92f7-15fbd957f2ae"
version = "1.0.5+1"

[[Crayons]]
git-tree-sha1 = "249fe38abf76d48563e2f4556bebd215aa317e15"
uuid = "a8cc5b0e-0ffa-5ad4-8c14-923d3ee1735f"
version = "4.1.1"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[Downloads]]
deps = ["ArgTools", "FileWatching", "LibCURL", "NetworkOptions"]
uuid = "f43a241f-c20a-4ad4-852c-f6b1247861c6"
version = "1.6.0"

[[FileWatching]]
uuid = "7b1f6079-737a-58dc-b8bc-7a2ca5c1b5ee"

[[FixedPointNumbers]]
deps = ["Statistics"]
git-tree-sha1 = "335bfdceacc84c5cdf16aadc768aa5ddfc5383cc"
uuid = "53c48c17-4a7d-5ca2-90c5-79b7896eea93"
version = "0.8.4"

[[Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "8d511d5b81240fc8e6802386302675bdf47737b9"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.4"

[[HypertextLiteral]]
deps = ["Tricks"]
git-tree-sha1 = "c47c5fa4c5308f27ccaac35504858d8914e102f9"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.4"

[[IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "d75853a0bdbfb1ac815478bacd89cd27b550ace6"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.3"

[[InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "31e996f0a15c7b280ba9f76636b3ff9e2ae58c9a"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.4"

[[LibCURL]]
deps = ["LibCURL_jll", "MozillaCACerts_jll"]
uuid = "b27032c2-a3e7-50c8-80cd-2d36dbcbfd21"
version = "0.6.4"

[[LibCURL_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll", "Zlib_jll", "nghttp2_jll"]
uuid = "deac9b47-8bc7-5906-a0fe-35ac56dc84c0"
version = "8.4.0+0"

[[LibGit2]]
deps = ["Base64", "LibGit2_jll", "NetworkOptions", "Printf", "SHA"]
uuid = "76f85450-5226-5b5a-8eaa-529ad045b433"

[[LibGit2_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll"]
uuid = "e37daf67-58a4-590a-8e99-b0245dd2ffc5"
version = "1.6.4+0"

[[LibSSH2_jll]]
deps = ["Artifacts", "Libdl", "MbedTLS_jll"]
uuid = "29816b5a-b9ab-546f-933c-edad1886dfa8"
version = "1.11.0+1"

[[Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[LinearAlgebra]]
deps = ["Libdl", "OpenBLAS_jll", "libblastrampoline_jll"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[MIMEs]]
git-tree-sha1 = "65f28ad4b594aebe22157d6fac869786a255b7eb"
uuid = "6c6e2e6c-3030-632d-7369-2d6c69616d65"
version = "0.1.4"

[[Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[MarkdownLiteral]]
deps = ["CommonMark", "HypertextLiteral"]
git-tree-sha1 = "0d3fa2dd374934b62ee16a4721fe68c418b92899"
uuid = "736d6165-7244-6769-4267-6b50796e6954"
version = "0.1.1"

[[MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"
version = "2.28.2+1"

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"
version = "2023.1.10"

[[NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"
version = "1.2.0"

[[OpenBLAS_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "Libdl"]
uuid = "4536629a-c528-5b80-bd46-f80d51c5b363"
version = "0.3.23+2"

[[Parsers]]
deps = ["Dates", "PrecompileTools", "UUIDs"]
git-tree-sha1 = "716e24b21538abc91f6205fd1d8363f39b442851"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.7.2"

[[Pkg]]
deps = ["Artifacts", "Dates", "Downloads", "FileWatching", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "Serialization", "TOML", "Tar", "UUIDs", "p7zip_jll"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
version = "1.10.0"

[[PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "ColorTypes", "Dates", "FixedPointNumbers", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "MIMEs", "Markdown", "Random", "Reexport", "URIs", "UUIDs"]
git-tree-sha1 = "e47cd150dbe0443c3a3651bc5b9cbd5576ab75b7"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.52"

[[PrecompileTools]]
deps = ["Preferences"]
git-tree-sha1 = "03b4c25b43cb84cee5c90aa9b5ea0a78fd848d2f"
uuid = "aea7be01-6a6a-4083-8856-8a6e6704d82a"
version = "1.2.0"

[[Preferences]]
deps = ["TOML"]
git-tree-sha1 = "00805cd429dcb4870060ff49ef443486c262e38e"
uuid = "21216c6a-2e73-6563-6e65-726566657250"
version = "1.4.1"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[REPL]]
deps = ["InteractiveUtils", "Markdown", "Sockets", "Unicode"]
uuid = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"

[[Random]]
deps = ["SHA"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"
version = "0.7.0"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[SparseArrays]]
deps = ["Libdl", "LinearAlgebra", "Random", "Serialization", "SuiteSparse_jll"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"
version = "1.10.0"

[[Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"
version = "1.10.0"

[[SuiteSparse_jll]]
deps = ["Artifacts", "Libdl", "libblastrampoline_jll"]
uuid = "bea87d4a-7f5b-5778-9afe-8cc45184846c"
version = "7.2.1+1"

[[TOML]]
deps = ["Dates"]
uuid = "fa267f1f-6049-4f14-aa54-33bafae1ed76"
version = "1.0.3"

[[Tar]]
deps = ["ArgTools", "SHA"]
uuid = "a4e569a6-e804-4fa4-b0f3-eef7a1d5b13e"
version = "1.10.0"

[[Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[Tricks]]
git-tree-sha1 = "eae1bb484cd63b36999ee58be2de6c178105112f"
uuid = "410a4b4d-49e4-4fbc-ab6d-cb71b17b3775"
version = "0.1.8"

[[URIs]]
git-tree-sha1 = "67db6cc7b3821e19ebe75791a9dd19c9b1188f2b"
uuid = "5c2747f8-b7ea-4ff2-ba2e-563bfd36b1d4"
version = "1.5.1"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"

[[Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"
version = "1.2.13+1"

[[libblastrampoline_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850b90-86db-534c-a0d3-1478176c7d93"
version = "5.8.0+1"

[[nghttp2_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850ede-7688-5339-a07c-302acd2aaf8d"
version = "1.52.0+1"

[[p7zip_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "3f19e933-33d8-53b3-aaab-bd5110c3b7a0"
version = "17.4.0+2"
"""

# ╔═╡ Cell order:
# ╠═67e2cb97-e224-47ca-96ba-2e89d94959e7
# ╠═b1c0d12c-f383-44fb-bcfe-4157a2801b9a
# ╠═82c316c7-a279-4728-b16a-921d7fc52886
# ╠═ede20024-1aea-4d80-a19a-8a5ec88a00ac
# ╠═acb08d1f-30f9-4e01-8216-3440c82714c7
# ╠═c097b477-e154-47eb-b7d9-a4d2981dcf0e
# ╠═0b19e53d-eb7a-42b6-a7db-d95bc8c63eae
# ╠═2e54b8fc-7852-11ec-27d7-df0bfe7f344a
# ╠═0c0bab41-a020-41a0-83ad-0c57b4699ffa
# ╠═257ee9b0-d955-43d2-9c94-245716708a2d
# ╟─ddccf592-0d0f-475c-81ae-067c37ba3f7e
# ╠═fffd6402-d508-48a6-abc6-3de333497787
# ╠═a060f034-b540-4b1e-a87f-7e6185e15646
# ╠═466bf852-144c-47df-98e1-89935754f5f1
# ╠═6e26a930-1b49-4ff5-8704-9149d3cab7e9
# ╠═0cb7b599-cec5-4391-9485-4e1c63cd9ff2
# ╠═ab108b97-4dd5-49e4-845c-2f0fab131f8a
# ╠═596dbead-63ce-432a-8a0b-b3ea361e279e
# ╠═8c96934c-3e23-45ed-b945-dce344bfb6eb
# ╠═af1ad32b-af53-4865-9807-ba8d0fba2a8c
# ╠═d441b495-a00c-4de3-a232-7c75f55fc95b
# ╟─fa0b6647-6911-4c27-a1a6-240d215331d1
# ╟─6c84a84f-9ead-4091-819e-0de088e2dd4d
# ╟─e866282e-7c63-4364-b344-46f4c6ad165c
# ╟─cd3b9ad1-8efc-4f92-96d0-b9b038d8cfae
# ╠═79b6ac0f-4d0b-485f-8fb0-9849932dc34e
# ╟─eaad4fed-ea22-4132-a84a-429f486ddce2
# ╟─146474b5-9aa6-4000-867d-ba91e4061d9b
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
