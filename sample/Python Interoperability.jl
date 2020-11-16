### A Pluto.jl notebook ###
# v0.12.10

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

# ╔═╡ 597c656a-26b5-11eb-337c-836f1c39d040
begin
	using Pkg
	Pkg.activate(mktempdir())
end

# ╔═╡ 0083de2a-1bb9-11eb-11b3-03ac86890a3a
begin
	ENV["PYTHON"] = "" # if empty, create own Conda environment for Julia
	Pkg.add(["Conda", "PyCall"])
	Pkg.build("PyCall")
	using Conda, PyCall
end

# ╔═╡ 704e6c02-26b5-11eb-2025-6139550dfdc8
begin
	Pkg.add("PlutoUI")
	using PlutoUI
end

# ╔═╡ dbc0f33e-265a-11eb-0a07-213a33c13318
md"# Using Python in Pluto.jl"

# ╔═╡ f6863f78-26b4-11eb-0841-93842f7ee001
md"""It is easy to call Python code from Julia, therefore Pluto.jl can be used for Python, too.

In the following, examples for Julia and Python interoperability are given.
"""

# ╔═╡ e9457cd2-265a-11eb-3624-19117e09b9eb
md"## Installation"

# ╔═╡ e240215e-2659-11eb-0903-edcbfc2e7c3f
md"""Install [Conda.jl](https://github.com/JuliaPy/Conda.jl) (for the installation of Python packages) and [PyCall.jl](https://github.com/JuliaPy/PyCall.jl) (for calling Python from Julia).

In the following, a new Conda Python environment is set up for usage with Julia. If an existing Python environment should be used, set the ˋPYTHONˋ environment variable below to the corresponding Python executable. 
"""

# ╔═╡ 0785b2bc-265a-11eb-224b-49f34462e8df
md"""Add Python packages via Conda.jl and import them with PyCall.

Note that installation and import of Python packages should be in the same cell so that Pluto knows that the 2nd depends on the 1st."""

# ╔═╡ ff986dac-1bb8-11eb-2545-21f87cdb52d6
begin
	Conda.add(["numpy", "pandas"])
	np = pyimport("numpy")
	pd = pyimport("pandas")
end

# ╔═╡ d78d13a4-265a-11eb-2599-518c1ee9b219
md"## Defining Python Functions"

# ╔═╡ 0dc3855e-265b-11eb-2f65-6b7eb69329ad
md"Arbitrary Python code can be executed using the ˋpy_strˋ macro of PyCall."

# ╔═╡ 20c6e43e-265b-11eb-169d-e9e5ab11e51e
py"""
def g(x):
	return x**2
"""

# ╔═╡ 8e64ad14-2660-11eb-00c3-8dfe678e927e
md"However, the name ˋgˋ is only known in Python, not in Julia. Even if accessed in Python in an other cell, it is not ensured that the Python name is recognized due to the implicit generation of Julia modules in Pluto."

# ╔═╡ 2f3c2092-265b-11eb-2d12-b5f0d5aa68ec
g(3) # this does not work because g is only defined in Python, not in Julia

# ╔═╡ d16a7df0-265b-11eb-3700-b13b17b2111e
py"g(4)" # this would work in a Julia script, but may not work in Pluto because of the implicit usage of multiple Julia modules in Pluto.

# ╔═╡ b9488c44-2660-11eb-0260-cfd8acf58898
md"The solution is to bind the Python object to a Julia name in the __same__ Pluto cell. This way, Pluto is aware of all name dependencies, like it would be for a normal Julia binding."

# ╔═╡ aa61216a-1c19-11eb-192d-fb968674a972
begin
	py"""
def f(x):
    return x**3
"""
	f = py"f"
end

# ╔═╡ c3cfd2ae-1c19-11eb-0122-cbf9fa004d56
z = f(7)

# ╔═╡ d5ec0e62-1c19-11eb-1cae-2d5f7a430ece
z2 = f(z)

# ╔═╡ a0b4470e-26b5-11eb-1f83-9bb70109bd5e
md"Of course, Python functions can be used together with reactive Pluto elements:"

# ╔═╡ 519e5858-26b5-11eb-3436-8f06d437b011
@bind x Slider(1:10, show_value=true)

# ╔═╡ 98c0fabc-26b5-11eb-2a75-b1412396661e
f(x)

# ╔═╡ b8c26548-2687-11eb-29fb-896a27362800
md"## Classes and Objects"

# ╔═╡ 45a668dc-26b1-11eb-10cf-af183ddfb428
md"The method described above does not only work for Python functions, but for arbitrary Python code, including classes."

# ╔═╡ c32067e2-2687-11eb-148e-5501621c5706
begin
	py"""
class MyComplex:
	def __init__(self, real, img=0):
		self.real=real
		self.img=img
	
	def __add__(self, y): # define addition
		if isinstance(y, MyComplex):
			return MyComplex(self.real + y.real, self.img + y.img)
		else:
			return MyComplex(self.real + y, self.img)
	
	def __radd__(self, y): # define addition of number with MyComplex
		return self + y
	
	def __repr__(self):
		return f"{self.real} + {self.img} i"
"""
	MyComplex = py"MyComplex"
end

# ╔═╡ 0ba49e5c-2688-11eb-0a79-4d6343cbcfad
c1 = MyComplex(5, 3)

# ╔═╡ 58692104-2688-11eb-3e3f-9109c04e8702
c2 = MyComplex(7, -6)

# ╔═╡ 60bf3aa0-2688-11eb-00bb-01f04dd5aa2e
c1 + c2, c1 + 42, 49 + c1

# ╔═╡ 4a911796-26b3-11eb-3efb-212b8abd1392
md"There is an alternative way to define Python classes using [Julia syntax](https://github.com/JuliaPy/PyCall.jl#defining-python-classes). This could result in more elegant code due to support of multiple dispatch."

# ╔═╡ 4cbb0106-26b2-11eb-09b7-2721d5f4afbe
@pydef mutable struct MyComplex2
	function __init__(self, real, img=0)
		self.real = real
		self.img = img
	end
	__add__(self, x) = MyComplex2(self.real + x.real, self.img + x.img)
	__add__(self, x:: Number) = MyComplex2(self.real + x, self.img)
	__radd__(self, x) = self + x
	__repr__(self) = "$(self.real) + $(self.img) * i"
end	

# ╔═╡ afdbda92-26b2-11eb-054d-7508f853ea7c
c1b = MyComplex2(5, 3)

# ╔═╡ b7d5a29e-26b2-11eb-1130-a3b905c71587
c2b = MyComplex2(7, -6)

# ╔═╡ e52fbcf4-26b2-11eb-0abd-4566d89cede4
c1b + c2b, c1b + 42, 49 + c1b

# ╔═╡ f1c0d3e8-265a-11eb-2ea0-25cd2f496fed
md"## Usage of Python Libraries - Example Pandas"

# ╔═╡ 497c606c-265a-11eb-16f6-77cd659a9940
md"""After importing the Python packages, they can be used directly in Julia.
The syntax may be a bit different compared to Python, e.g. using ˋDictˋ instead of ˋ{}ˋ.

Importing Pandas this way is for illustration purposes only, for serious work better use DataFrames.jl (native Julia DataFrames) or Pandas.jl (more convenient Julia wrapper over Python Pandas).

"""

# ╔═╡ ab95e8aa-1bb9-11eb-3ae4-897dc80f56b7
df = pd.DataFrame(Dict("a" => [1, 2, 3], "b" => [4, 5, 6]))

# ╔═╡ e5fdfac0-1bbc-11eb-31ad-cfe137ce445f
begin
	df2 = df.copy() # avoid in-place mutation of objects outside the cell they are defined
	df2.insert(2, "c", df.a * df.b) # syntax df["c"] = ... does not work
end

# ╔═╡ fdb5e42a-1bbc-11eb-1377-8d754c36eca1
df2

# ╔═╡ 9c340f08-1c19-11eb-16d9-31ffcd186445
df2.values # With ˋvaluesˋ numpy arrays are obtained, which are converted to Julia arrays by PyCall

# ╔═╡ f55a75f8-2660-11eb-194d-d9330ad0949b
f(df2.a.values)

# ╔═╡ 5a3f73de-26b5-11eb-2a84-897b3dd60901
md"# Appendix"

# ╔═╡ Cell order:
# ╟─dbc0f33e-265a-11eb-0a07-213a33c13318
# ╟─f6863f78-26b4-11eb-0841-93842f7ee001
# ╟─e9457cd2-265a-11eb-3624-19117e09b9eb
# ╟─e240215e-2659-11eb-0903-edcbfc2e7c3f
# ╠═0083de2a-1bb9-11eb-11b3-03ac86890a3a
# ╟─0785b2bc-265a-11eb-224b-49f34462e8df
# ╠═ff986dac-1bb8-11eb-2545-21f87cdb52d6
# ╟─d78d13a4-265a-11eb-2599-518c1ee9b219
# ╟─0dc3855e-265b-11eb-2f65-6b7eb69329ad
# ╠═20c6e43e-265b-11eb-169d-e9e5ab11e51e
# ╟─8e64ad14-2660-11eb-00c3-8dfe678e927e
# ╠═2f3c2092-265b-11eb-2d12-b5f0d5aa68ec
# ╠═d16a7df0-265b-11eb-3700-b13b17b2111e
# ╟─b9488c44-2660-11eb-0260-cfd8acf58898
# ╠═aa61216a-1c19-11eb-192d-fb968674a972
# ╠═c3cfd2ae-1c19-11eb-0122-cbf9fa004d56
# ╠═d5ec0e62-1c19-11eb-1cae-2d5f7a430ece
# ╟─a0b4470e-26b5-11eb-1f83-9bb70109bd5e
# ╠═519e5858-26b5-11eb-3436-8f06d437b011
# ╠═98c0fabc-26b5-11eb-2a75-b1412396661e
# ╟─b8c26548-2687-11eb-29fb-896a27362800
# ╟─45a668dc-26b1-11eb-10cf-af183ddfb428
# ╠═c32067e2-2687-11eb-148e-5501621c5706
# ╠═0ba49e5c-2688-11eb-0a79-4d6343cbcfad
# ╠═58692104-2688-11eb-3e3f-9109c04e8702
# ╠═60bf3aa0-2688-11eb-00bb-01f04dd5aa2e
# ╟─4a911796-26b3-11eb-3efb-212b8abd1392
# ╠═4cbb0106-26b2-11eb-09b7-2721d5f4afbe
# ╠═afdbda92-26b2-11eb-054d-7508f853ea7c
# ╠═b7d5a29e-26b2-11eb-1130-a3b905c71587
# ╠═e52fbcf4-26b2-11eb-0abd-4566d89cede4
# ╟─f1c0d3e8-265a-11eb-2ea0-25cd2f496fed
# ╟─497c606c-265a-11eb-16f6-77cd659a9940
# ╠═ab95e8aa-1bb9-11eb-3ae4-897dc80f56b7
# ╠═e5fdfac0-1bbc-11eb-31ad-cfe137ce445f
# ╠═fdb5e42a-1bbc-11eb-1377-8d754c36eca1
# ╠═9c340f08-1c19-11eb-16d9-31ffcd186445
# ╠═f55a75f8-2660-11eb-194d-d9330ad0949b
# ╟─5a3f73de-26b5-11eb-2a84-897b3dd60901
# ╠═597c656a-26b5-11eb-337c-836f1c39d040
# ╠═704e6c02-26b5-11eb-2025-6139550dfdc8
