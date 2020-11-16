### A Pluto.jl notebook ###
# v0.12.8

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

# ╔═╡ efbb1f30-205c-11eb-30d2-834593401361
begin
	using Pkg
	Pkg.activate(mktempdir())
end

# ╔═╡ 6d16f300-205d-11eb-0af3-19f3cc77437f
begin
	Pkg.add("BenchmarkTools")
	using BenchmarkTools
	BenchmarkTools.DEFAULT_PARAMETERS.seconds = 1 # use only 1s for timing, faster but less precise
end

# ╔═╡ 9cb2c120-205d-11eb-0cd6-851fe590dd28
begin
	Pkg.add("PlutoUI")
	using PlutoUI
end

# ╔═╡ ddc7c8f0-205c-11eb-1644-95e93ea74f11
md"# Pluto Tricks and Best Practices"

# ╔═╡ e773ad10-205c-11eb-3da3-9b9d19fc3f38
md"""## Installing Packages

Note: the following steps will be replaced by a [much simpler and more elegant solution in the future](https://www.notion.so/Self-contained-reproducibility-995ffa5174894c26b897827bd2ce4990).
"""

# ╔═╡ 03b34620-205d-11eb-3490-e30282522cf8
md"First, create a temporary Julia package environment for the notebook dependencies. This way, your global package environment does not get polluted."

# ╔═╡ 2d7cc0d0-205d-11eb-0871-5b37b6135ee6
md"""Next, install your packages and `using` or `import` them. 
You can either put all packages in one block or split them into multiple blocks. 
Package-specific configuration should also be in this block, after the `using` or `import` statement."""

# ╔═╡ b15001b0-205d-11eb-25ce-172a85ca36ed
md"""You can put these cells in any order you want, the cell execution order is always correctly determinated by Pluto.
The install blocks for specific packages depend on `using Pkg`. Concrete usages of other packages depend on the `using` statements in their install blocks."""

# ╔═╡ 48e0aa72-205e-11eb-2915-b1df0ba5212e
md"## Mutating Functions"

# ╔═╡ d7b4b110-205e-11eb-1ccb-0399f0ce3033
md"""The cell ordering in Pluto notebooks should entierely be defined for didactic reasons and should not influence any calculatuion results.
"""

# ╔═╡ 4e125110-205e-11eb-3f12-dd7eaf0798e7
md"""It is not allowed to set the same variable in two different blocks because the result is ambigious. 

Unfortunately, there is no way for Pluto to identify if a variable is changed by a mutating function (the `!` is not a precise criterion because it does not indicate which function parameter is changed, and it is not technically enforced that mutating function names end with a `!`).
Therefore, it is possible to create a notebook where the calculation results are dependent on cell ordering.
"""

# ╔═╡ 313ff870-205f-11eb-3784-a793c5394934
a = [5, 7, 1, 3, 9]

# ╔═╡ 446984c0-205f-11eb-1e76-59a9e68e5b7d
a

# ╔═╡ 463962c0-205f-11eb-2e3d-77a96cbe676a
sort!(a);

# ╔═╡ 48c5da00-205f-11eb-17a2-eb04a5b393a3
a

# ╔═╡ 4977c4e0-205f-11eb-1089-09df8e971dd5
md"""😈 Here, the value of `a` depends on the order of cell execution, which may or may not be the order in which they are displayed in the notebook. 😈

Solution: most mutating Julia functions return the mutated variable. Use this to explicitly define cell dependencies.
"""

# ╔═╡ 7fb6f210-205f-11eb-0a61-c924e3858622
b = [5, 7, 1, 3, 9]

# ╔═╡ c9e6a510-205f-11eb-195f-e16c1c382fac
b_sorted = sort!(b);

# ╔═╡ eb275ee0-205f-11eb-19c2-0340ba91128a
b_sorted

# ╔═╡ fd873290-205f-11eb-26a8-e74b9a3db12c
md"Note that this does not increase memory usage - the returned variable is the same object as the mutated one, no copy is made."

# ╔═╡ ee3673a0-205f-11eb-083d-afaa119a885e
b === b_sorted

# ╔═╡ 13d72c30-2060-11eb-103a-abbee022e384
md"## Conditional Execution of Cells"

# ╔═╡ 19ff67d2-2060-11eb-16b3-dd34a1952d17
md"Pluto executes all cells in a notebook. If specific cells should not be executed per default, they could be defined conditional on a checkbox."

# ╔═╡ 41edb9e0-2060-11eb-1398-252fa29d08be
md"Execute me? $(@bind execute_me PlutoUI.CheckBox())"

# ╔═╡ 55f79412-2060-11eb-04c7-2b1dfaf78e05
if execute_me
	md"😎🚀💯"
else
	md"😴😴😴"
end

# ╔═╡ 7cd25340-2060-11eb-37bb-257d47816628
md"## Capturing Terminal Output"

# ╔═╡ 40077840-2061-11eb-355d-7b8a04bdfb8c
md"Use the function `with_terminal` from `PlutoUI` to display terminal output directly in a Pluto notebook."

# ╔═╡ cd1d2280-2060-11eb-0705-57e10606d4ba
with_terminal() do
	@code_native 1+2 # let's see the assembly code Julia generates!
	@btime 1+2 # surely Julia is cheating here 😉
end

# ╔═╡ 03f8fd80-2064-11eb-0e98-f3a7ce1ab6f4
md"In the future, this will [not be required anymore](https://www.notion.so/a-cooler-way-to-print-24e1c517c3f64bbbbcb97499e2539611)."

# ╔═╡ 63867ec0-2060-11eb-01cb-cdf3e5055c30
md"## Link to other notebooks using relative directories"

# ╔═╡ 9eb1c8a2-2061-11eb-391c-eb886d726a27
md"""Your presentation, etc. may consist of multiple notebooks and you may want to link them to start one notebook from an other one.

Due to this [issue](https://github.com/JuliaLang/julia/issues/38298) this is surprisingly tricky, but the following works:
"""

# ╔═╡ 9dc87a10-2061-11eb-097f-7bbe9e5c69d1
my_2nd_file = joinpath(pwd(), "my_2nd_file.jl") # absolute path to your 2nd notebook
# note that inlining this into the following markdown text does not work.

# ╔═╡ 7178f0c0-2061-11eb-2b25-25a81a88a650
# the `md` string macro does not interpolate the link correctly
Markdown.parse("For the Answer to the Ultimate Question of Life, the Universe, and Everything please open [`my_2nd_file.jl`](./open?path=$my_2nd_file).")

# ╔═╡ 4c94c6de-2060-11eb-23ee-fd9684d97792


# ╔═╡ 61e1451e-205e-11eb-1a16-f503b4d37923
x += 1

# ╔═╡ 5f849070-205e-11eb-2709-a962062194d6
x = 7

# ╔═╡ Cell order:
# ╟─ddc7c8f0-205c-11eb-1644-95e93ea74f11
# ╟─e773ad10-205c-11eb-3da3-9b9d19fc3f38
# ╟─03b34620-205d-11eb-3490-e30282522cf8
# ╠═efbb1f30-205c-11eb-30d2-834593401361
# ╟─2d7cc0d0-205d-11eb-0871-5b37b6135ee6
# ╠═6d16f300-205d-11eb-0af3-19f3cc77437f
# ╠═9cb2c120-205d-11eb-0cd6-851fe590dd28
# ╟─b15001b0-205d-11eb-25ce-172a85ca36ed
# ╟─48e0aa72-205e-11eb-2915-b1df0ba5212e
# ╟─d7b4b110-205e-11eb-1ccb-0399f0ce3033
# ╠═5f849070-205e-11eb-2709-a962062194d6
# ╠═61e1451e-205e-11eb-1a16-f503b4d37923
# ╟─4e125110-205e-11eb-3f12-dd7eaf0798e7
# ╠═313ff870-205f-11eb-3784-a793c5394934
# ╠═446984c0-205f-11eb-1e76-59a9e68e5b7d
# ╠═463962c0-205f-11eb-2e3d-77a96cbe676a
# ╠═48c5da00-205f-11eb-17a2-eb04a5b393a3
# ╟─4977c4e0-205f-11eb-1089-09df8e971dd5
# ╠═7fb6f210-205f-11eb-0a61-c924e3858622
# ╠═c9e6a510-205f-11eb-195f-e16c1c382fac
# ╠═eb275ee0-205f-11eb-19c2-0340ba91128a
# ╟─fd873290-205f-11eb-26a8-e74b9a3db12c
# ╠═ee3673a0-205f-11eb-083d-afaa119a885e
# ╟─13d72c30-2060-11eb-103a-abbee022e384
# ╟─19ff67d2-2060-11eb-16b3-dd34a1952d17
# ╠═41edb9e0-2060-11eb-1398-252fa29d08be
# ╠═55f79412-2060-11eb-04c7-2b1dfaf78e05
# ╟─7cd25340-2060-11eb-37bb-257d47816628
# ╟─40077840-2061-11eb-355d-7b8a04bdfb8c
# ╠═cd1d2280-2060-11eb-0705-57e10606d4ba
# ╟─03f8fd80-2064-11eb-0e98-f3a7ce1ab6f4
# ╟─63867ec0-2060-11eb-01cb-cdf3e5055c30
# ╟─9eb1c8a2-2061-11eb-391c-eb886d726a27
# ╠═9dc87a10-2061-11eb-097f-7bbe9e5c69d1
# ╠═7178f0c0-2061-11eb-2b25-25a81a88a650
# ╠═4c94c6de-2060-11eb-23ee-fd9684d97792
