### A JIVEbook.jl notebook ###
# v0.0.2

#> custom_attrs = ["hide-enabled"]

using Markdown
using InteractiveUtils
using JIVECore
using PlutoPlotly, PlutoUI
import Main.PlutoRunner.JIVECore.Data.image_data as image_data
import Main.PlutoRunner.JIVECore.Data.image_keys as image_keys

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end

# ╔═╡ 72c073fd-5f1b-4af0-901b-aaa901f0f273
begin
	using PlutoDevMacros
	using PlutoUI
	using PlutoExtras
	using Dates
	using Colors
end

# ╔═╡ 70dc8fa0-cc32-4ebe-af0d-62b5bb3a82ed
@fromparent begin
	using ^
	using >.HypertextLiteral
end

# ╔═╡ 7bd46437-8af0-4a15-87e9-1508869e1600
ExtendedTableOfContents()

# ╔═╡ acba5003-a456-4c1a-a53f-71a3bec30251
md"""
# Tests
"""

# ╔═╡ 51a36d49-1dad-4340-8671-a6a63eb367a2
enable_plutoplotly_offline()

# ╔═╡ c4e4400e-e063-4236-96e5-ca3a60313e37
md"""
## Layout Range
"""

# ╔═╡ e047e1b8-1a41-402b-8ed0-90cccbf0c166
md"""
We test that providing the range as an array is respected (See [Issue 25](https://github.com/JuliaPluto/PlutoPlotly.jl/issues/25))
"""

# ╔═╡ 7c50f0f4-bc18-4f12-a8b6-5eaba151c923
plot(scatter(;y = rand(10)), Layout(;
		yaxis_range = [0, 2]
	))

# ╔═╡ 6d49055d-0347-4bce-a2c5-f1568596e2e6
md"""
## Image
"""

# ╔═╡ c56df6f6-865e-4af8-b8c0-429b021af1eb
md"""
This is testing the expected behavior of image traces as per [Issue #16](https://github.com/JuliaPluto/PlutoPlotly.jl/issues/16)
"""

# ╔═╡ 7ba8b496-f7c4-4fbc-a168-dc3d7af92d0c
image_issue = image(;z = rand(3,6,4)*255)

# ╔═╡ f6ed3a0a-e548-4b99-9cf7-085991a5c99e
plot(image_issue)

# ╔═╡ 0f9f50f8-95c8-4cb5-96f2-e4ce177ca2dd
Plot(image_issue)

# ╔═╡ 1939f0c9-3780-4fc4-898a-5b0a66333274
md"""
We also want to support matrix of vectors for this (see [Issue #47](https://github.com/JuliaPluto/PlutoPlotly.jl/issues/47))
"""

# ╔═╡ e74be489-35b7-469c-adbf-d1d484738a67
let
	rand_c = rand(RGB, 6, 4)
	z = map(c -> [c.r, c.g, c.b] .* 255, rand_c)
	plot(image(;z))
end

# ╔═╡ 359d22e8-b13d-420b-b409-b18136c3ff3b
md"""
## Colors.jl colors
"""

# ╔═╡ e54cc4c4-2a93-4d44-90ed-5944edbf4b0f
let
	red = scatter(;y=rand(10), line_color = RGB(1,0,0))
	green_transp = scatter(;y=rand(10), line_color = RGBA(0,1,0, .3))
	plot([red, green_transp])
end

# ╔═╡ 3e5b09a9-6d18-4d2f-a37b-ac260ea36646
md"""
## Respect provided height/width
"""

# ╔═╡ 070820c5-082f-4428-8d5e-1fdd1ce29eba
plot(rand(10), Layout(
		width = 400,
		height= 300
	))

# ╔═╡ 0c30855c-6542-4b1a-9427-3a8427e75210
md"""
## Slider + UIRevision
"""

# ╔═╡ de0cb780-ff4e-4236-89c4-4c3163337cfc
@bind clk Clock()

# ╔═╡ dd23fe10-a8d5-461a-85a8-e03468cdcd97
@bind N Slider(50:50:250)
# N =let 
# 	clk
# 	rand(50:100)
# end

# ╔═╡ 8bf75ceb-e4ae-4c6c-8ab0-a81350f19bc7
pp = Plot(scatter3d(x = rand(N), y = rand(N), z = rand(N), mode="markers"), Layout(
	uirevision = 1,
	scene = attr(
		xaxis_range = [-1,2],
		yaxis_range = [-1,2],
		zaxis_range = [-1,2],
		aspectmode = "cube",
	),
	height = 550
	# autosize = true,
));

# ╔═╡ ccf62e33-8fcf-45d9-83ed-c7de80800b76
let
	p = PlutoPlot(pp)
	add_plotly_listener!(p, "plotly_relayout", htl_js("""
	(e) => {

	console.log(e)
	//console.log(PLOT._fullLayout._preGUI)
    
    
	var eye = e['scene.camera']?.eye;

    if (eye) {
		console.log('update: ', eye);
	} else {
		console.log(e)
	}
	console.log('div: ',PLOT._fullLayout.scene.camera.eye)
   	console.log('plot_obj: ',plot_obj.layout.scene?.camera?.eye)
	
}
	"""))
	PlutoPlotly._show(p)
end

# ╔═╡ 1460ece1-7828-4e93-ac37-e979b874b492
md"""
## @bind click
"""

# ╔═╡ 18c80ea2-0df4-40ea-bd87-f8fee463161e
@bind asdasd let
	p = PlutoPlot(Plot(scatter(y = rand(10), name = "test", showlegend=true)))
	add_plotly_listener!(p,"plotly_click", "
	(e) => {

	console.log(e)
    let dt = e.points[0]
	PLOT.value = [dt.x, dt.y]
	PLOT.dispatchEvent(new CustomEvent('input'))
}
	")
	p
end

# ╔═╡ ce29fa1f-0c52-4d38-acbd-0a96cb3b9ce6
asdasd

# ╔═╡ c3e29c94-941d-4a52-a358-c4ffbfc8cab8
md"""
## @bind filtering
"""

# ╔═╡ b0473b9a-2db5-4d03-8344-b8eaf8428d6c
points = [(rand(),rand()) for _ in 1:10000]

# ╔═╡ 73945da3-af45-41fb-9c5d-6fbba6362256
@bind limits let
	p = Plot(
		scatter(x = first.(points), y = last.(points), mode = "markers")
	)|> PlutoPlot
	add_plotly_listener!(p, "plotly_relayout", "
	e => {
	//console.log(e)
	let layout = PLOT.layout
	let asd = {xaxis: layout.xaxis.range, yaxis: layout.yaxis.range}
	PLOT.value = asd
	PLOT.dispatchEvent(new CustomEvent('input'))
	}
	")
end

# ╔═╡ ea9faecf-ecd7-483b-99ad-ede08ba05383
visible_points = let
	if ismissing(limits)
		points
	else
		xrange = limits["xaxis"]
		yrange = limits["yaxis"]
		func(x,y) = x >= xrange[1] && x <= xrange[2] && y >= yrange[1] && y <= yrange[2]
		filter(x -> func(x...), points)
	end
end

# ╔═╡ 684ef6d7-c1ae-4af3-b1bd-f54bc29d7b53
length(visible_points)

# ╔═╡ f8f7b530-1ded-4ce0-a7d9-a8c92afb95c7
md"""
## Multiple Listeners
"""

# ╔═╡ c3b1a198-ef19-4a54-9c32-d9ea32a63812
let
	p = PlutoPlot(Plot(rand(10), Layout(uirevision = 1)))
	add_plotly_listener!(p, "plotly_relayout", htl_js("""
function(e) {
    
	console.log('listener 1')
	
}
	"""))
	add_plotly_listener!(p, "plotly_relayout", htl_js("""
function(e) {
    
	console.log('listener 2')
	
}
	"""))
	@htl "$p"
end

# ╔═╡ e9fc2030-c2f0-48e9-a807-424039e796b2
let
	p = PlutoPlot(Plot(rand(10), Layout(uirevision = 1)))
	add_plotly_listener!(p, "plotly_relayout", htl_js("""
function(e) {
    
	console.log('listener 1')
	
}
	"""))
	add_plotly_listener!(p, "plotly_relayout", htl_js("""
function(e) {
    
	console.log('listener 2')
	
}
	"""))
	p.plotly_listeners
end

# ╔═╡ de101f40-27db-43ea-91ed-238502ceaaf7
md"""
## JS Listener
"""

# ╔═╡ 6c709fa0-7a53-4554-ab2a-d8181267ec93
lololol = 1

# ╔═╡ 671296b9-6743-48d6-9c4d-1beac2b505b5
let
	lololol
	p = PlutoPlot(Plot(rand(10), Layout(uirevision = 1)))
	add_js_listener!(p, "mousedown", htl_js("""
function(e) {
    
	console.log('MOUSEDOWN!')
	
}
	"""))
end

# ╔═╡ 6128ff76-3f1f-4144-bb3d-f44678210013
md"""
## flexbox
"""

# ╔═╡ a5823eb2-3aaa-4791-bdc8-196eac2ccf2e
@htl """
<div style='height: 400px; display: flex'>
$(Plot(rand(10)) |> PlutoPlot)

$(Plot(rand(10)) |> PlutoPlot)
</div>
"""

# ╔═╡ b45cc21d-bfff-4375-a524-95108661a2ef
md"""
## flexbox + bind
"""

# ╔═╡ 4ea48316-62d9-4b24-bb1d-c9fd1db044dc
# When you add @bind, to allow automatic resizing you need to set the bond display property to 'contents'.
@htl """
<div style='height: 400px; display: flex'>
$(@bind asd plot(rand(10)))

$(plot(rand(10)))
</div>
<style>
	$(prepend_cell_selector(["bond"])) {
		display: contents;
	}
</style>
"""

# ╔═╡ e92a0cf8-f869-4737-a465-db17318498a2
asd

# ╔═╡ 62126774-e246-473b-9d0b-92e967cd36ac
md"""
## flexbox + PlutoUI.ExperimentalLayout.hbox
"""

# ╔═╡ cfa78790-aa4c-4c7b-8a9f-198987338516
# Without bonds, the plots resize automatically inside hbox
PlutoUI.ExperimentalLayout.hbox([plot(rand(10)), plot(rand(10))])

# ╔═╡ 340262a2-c823-4e19-8f19-9a05f4504bb5
# When you add @bind, to allow automatic resizing you need to set the bond display property to 'contents'.
@htl("""
$(PlutoUI.ExperimentalLayout.hbox([(@bind asdasd2_val plot(rand(10))), plot(rand(10))]))
<style>
	$(prepend_cell_selector(["bond"])) {
		display: contents;
	}
</style>
""")

# ╔═╡ aaf0fe61-d5e6-4d93-8a22-7f97f1249b35
md"""
## flexbox + uirevision
"""

# ╔═╡ 6e12592d-01fe-455a-a19c-7544258b9791
voila = 10

# ╔═╡ 36c4a5b1-03f2-4f5f-b9af-822a8f7c8cdf
let
	#  We need to add min-height: 0 to the top level flex children to avoid the issue in https://stackoverflow.com/questions/36247140/why-dont-flex-items-shrink-past-content-size 
	voila
	@htl """
<div style='height: 550px; display: flex; flex-direction: column;'>
<div style='display: flex; flex: 1 1 0; min-height: 0'>
$(Plot(rand(10), Layout(uirevision = 1)) |> PlutoPlot)

$(Plot(rand(10)) |> PlutoPlot)
</div>
<div style='display: flex; flex: 1 1 0; min-height: 0'>
$(Plot(rand(10)) |> PlutoPlot)

$(Plot(rand(10)) |> PlutoPlot)
</div>
</div>
"""
end

# ╔═╡ 38a81414-0bcd-4d71-af1d-fe154d2ae09a
md"""
## custom class
"""

# ╔═╡ 2dd5534f-ce46-4770-b0f3-6e16005b3a90
cl = ["test_css_class", "lol"]

# ╔═╡ f69c6955-800c-461e-b464-cab4989913f6
let
	p = PlutoPlot(Plot(rand(10)))
	for cn ∈ cl
		add_class!(p, cn)
	end
	p
end

# ╔═╡ bfe5f717-4702-4316-808a-726fefef9e7e
html"""
<style>
	.test_css_class {
		border: 2px;
		border-style: solid;
	}
</style>
"""

# ╔═╡ cb3f5ee4-5504-4337-8a8d-d45784f54c85
md"""
## Sphere
"""

# ╔═╡ e0271a15-08b5-470f-a2d2-6f064cd3a2b2
function sphere(radius, origin = [0,0,0]; N = 50)
u = range(0, 2π; length = N)
v = range(0, π, length = N)
x = [radius * cos(u) * sin(v) + origin[1] for u ∈ u, v ∈ v]
y = [radius * sin(u) * sin(v) + origin[2] for u ∈ u, v ∈ v]
z = [radius * cos(v) + origin[3] for u ∈ u, v ∈ v]
	surface(;x,y,z)
end

# ╔═╡ cb1f840f-8d99-4076-9554-7d8ba56e9865
@bind M Slider(0:90)

# ╔═╡ 22245242-80a6-4a5b-815e-39b469002f84
let
	s = sphere(1)
	r = 2
	i = 0
	# M = 90
	x = [r*cosd(M)]
	y = [r*sind(M)]
	z = [0]
	sat = scatter3d(;x,y,z, mode = "markers")
	data = [s,sat]
	plot(data, Layout(
		uirevision = 1,
		scene = attr(;
		xaxis_range = [-3,3],
		yaxis_range = [-3,3],
		zaxis_range = [-3,3],
		aspectmode = "cube",
	),
	))
end

# ╔═╡ ebdc0ebc-da58-49c8-a992-5924045c2cac
md"""
## Plot Dates
"""

# ╔═╡ 6d74e3fa-1806-40b0-9995-c1555519603d
let
	x = Date.(2000:2020)
	y = rand(length(x))
	plot(scatter(;x,y,name = "values", showlegend = true), Layout(
		template = "none"
	))
end

# ╔═╡ 7054b9ce-cd00-42cf-b81c-bc27b29f4714
md"""
## Heatmap/Contour tests
"""

# ╔═╡ 5b5293bf-81b3-4e80-995a-f15f91971bd4
md"""
This is testing the expected behavior of heatmap and contour plots as per [https://github.com/JuliaPlots/PlotlyJS.jl/issues/355](https://github.com/JuliaPlots/PlotlyJS.jl/issues/355)
"""

# ╔═╡ 3612826c-0af0-4fef-aafe-112a2948f669
let
	plasma = [[0.0, "#0c0786"],
	          [0.1, "#40039c"],
	          [0.2, "#6a00a7"],
	          [0.3, "#8f0da3"],
	          [0.4, "#b02a8f"],
	          [0.5, "#cb4777"],
	          [0.6, "#e06461"],
	          [0.7, "#f2844b"],
	          [0.8, "#fca635"],
	          [0.9, "#fcce25"],
	          [1.0, "#eff821"]] 
	plot(heatmap(z=[1 24 30; 28 18 40; 36 54  7], colorscale=plasma), Layout(
		template = "none",
		yaxis = attr(
			scaleanchor = "x",
			scaleratio = 1,
		)
	))
end

# ╔═╡ ce90eb60-98ed-4901-9218-ed8466bb03c7
let
	a, b = -1., 1.
	c, d= 0., 1.
	nx, ny= 200, 100
	hx = (b-a)/(nx-1)
	x = a:hx:b
	hy = (d-c)/(ny-1)
	y=c:hy:d
	X = x' .* ones(length(y))
	Y = ones(length(x))'.*y
	Z= sin.(pi*pi*(X.*X+Y.*Y));
	# print(size(Z))
	plot(contour(x=x, y=y, z=Z), Layout(width=650, height=350, template = "none"))
end

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Colors = "5ae59095-9a9b-59fe-a467-6f913c188581"
Dates = "ade2ca70-3891-5945-98fb-dc099432e06a"
PlutoDevMacros = "a0499f29-c39b-4c5c-807c-88074221b949"
PlutoExtras = "ed5d0301-4775-4676-b788-cf71e66ff8ed"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
Colors = "~0.12.10"
PlutoDevMacros = "~0.7.2"
PlutoExtras = "~0.7.12"
PlutoUI = "~0.7.58"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.10.0"
manifest_format = "2.0"
project_hash = "b19cebbc09904d344f1a75767d597eb0075f0a44"

[[deps.AbstractPlutoDingetjes]]
deps = ["Pkg"]
git-tree-sha1 = "0f748c81756f2e5e6854298f11ad8b2dfae6911a"
uuid = "6e696c72-6542-2067-7265-42206c756150"
version = "1.3.0"

[[deps.ArgTools]]
uuid = "0dad84c5-d112-42e6-8d28-ef12dabb789f"
version = "1.1.1"

[[deps.Artifacts]]
uuid = "56f22d72-fd6d-98f1-02f0-08ddc0907c33"

[[deps.Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[deps.ColorTypes]]
deps = ["FixedPointNumbers", "Random"]
git-tree-sha1 = "eb7f0f8307f71fac7c606984ea5fb2817275d6e4"
uuid = "3da002f7-5984-5a60-b8a6-cbb66c0b333f"
version = "0.11.4"

[[deps.Colors]]
deps = ["ColorTypes", "FixedPointNumbers", "Reexport"]
git-tree-sha1 = "fc08e5930ee9a4e03f84bfb5211cb54e7769758a"
uuid = "5ae59095-9a9b-59fe-a467-6f913c188581"
version = "0.12.10"

[[deps.CompilerSupportLibraries_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "e66e0078-7015-5450-92f7-15fbd957f2ae"
version = "1.0.5+1"

[[deps.Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[deps.DocStringExtensions]]
deps = ["LibGit2"]
git-tree-sha1 = "2fb1e02f2b635d0845df5d7c167fec4dd739b00d"
uuid = "ffbed154-4ef7-542d-bbb7-c09d3a79fcae"
version = "0.9.3"

[[deps.Downloads]]
deps = ["ArgTools", "FileWatching", "LibCURL", "NetworkOptions"]
uuid = "f43a241f-c20a-4ad4-852c-f6b1247861c6"
version = "1.6.0"

[[deps.FileWatching]]
uuid = "7b1f6079-737a-58dc-b8bc-7a2ca5c1b5ee"

[[deps.FixedPointNumbers]]
deps = ["Statistics"]
git-tree-sha1 = "335bfdceacc84c5cdf16aadc768aa5ddfc5383cc"
uuid = "53c48c17-4a7d-5ca2-90c5-79b7896eea93"
version = "0.8.4"

[[deps.Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "179267cfa5e712760cd43dcae385d7ea90cc25a4"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.5"

[[deps.HypertextLiteral]]
deps = ["Tricks"]
git-tree-sha1 = "7134810b1afce04bbc1045ca1985fbe81ce17653"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.5"

[[deps.IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "8b72179abc660bfab5e28472e019392b97d0985c"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.4"

[[deps.InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[deps.JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "31e996f0a15c7b280ba9f76636b3ff9e2ae58c9a"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.4"

[[deps.LibCURL]]
deps = ["LibCURL_jll", "MozillaCACerts_jll"]
uuid = "b27032c2-a3e7-50c8-80cd-2d36dbcbfd21"
version = "0.6.4"

[[deps.LibCURL_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll", "Zlib_jll", "nghttp2_jll"]
uuid = "deac9b47-8bc7-5906-a0fe-35ac56dc84c0"
version = "8.4.0+0"

[[deps.LibGit2]]
deps = ["Base64", "LibGit2_jll", "NetworkOptions", "Printf", "SHA"]
uuid = "76f85450-5226-5b5a-8eaa-529ad045b433"

[[deps.LibGit2_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll"]
uuid = "e37daf67-58a4-590a-8e99-b0245dd2ffc5"
version = "1.6.4+0"

[[deps.LibSSH2_jll]]
deps = ["Artifacts", "Libdl", "MbedTLS_jll"]
uuid = "29816b5a-b9ab-546f-933c-edad1886dfa8"
version = "1.11.0+1"

[[deps.Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[deps.LinearAlgebra]]
deps = ["Libdl", "OpenBLAS_jll", "libblastrampoline_jll"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[deps.Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[deps.MIMEs]]
git-tree-sha1 = "65f28ad4b594aebe22157d6fac869786a255b7eb"
uuid = "6c6e2e6c-3030-632d-7369-2d6c69616d65"
version = "0.1.4"

[[deps.MacroTools]]
deps = ["Markdown", "Random"]
git-tree-sha1 = "2fa9ee3e63fd3a4f7a9a4f4744a52f4856de82df"
uuid = "1914dd2f-81c6-5fcd-8719-6d5c9610ff09"
version = "0.5.13"

[[deps.Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[deps.MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"
version = "2.28.2+1"

[[deps.Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[deps.MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"
version = "2023.1.10"

[[deps.NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"
version = "1.2.0"

[[deps.OpenBLAS_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "Libdl"]
uuid = "4536629a-c528-5b80-bd46-f80d51c5b363"
version = "0.3.23+2"

[[deps.Parsers]]
deps = ["Dates", "PrecompileTools", "UUIDs"]
git-tree-sha1 = "8489905bcdbcfac64d1daa51ca07c0d8f0283821"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.8.1"

[[deps.Pkg]]
deps = ["Artifacts", "Dates", "Downloads", "FileWatching", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "Serialization", "TOML", "Tar", "UUIDs", "p7zip_jll"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
version = "1.10.0"

[[deps.PlutoDevMacros]]
deps = ["AbstractPlutoDingetjes", "DocStringExtensions", "HypertextLiteral", "InteractiveUtils", "MacroTools", "Markdown", "Pkg", "Random", "TOML"]
git-tree-sha1 = "2944f76ac8c11c913a620da0a6b035e2fadf94c1"
uuid = "a0499f29-c39b-4c5c-807c-88074221b949"
version = "0.7.2"

[[deps.PlutoExtras]]
deps = ["AbstractPlutoDingetjes", "HypertextLiteral", "InteractiveUtils", "Markdown", "PlutoDevMacros", "PlutoUI", "REPL"]
git-tree-sha1 = "93d8c75734da9192d0639406fe6fb446be0fba4f"
uuid = "ed5d0301-4775-4676-b788-cf71e66ff8ed"
version = "0.7.12"

[[deps.PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "ColorTypes", "Dates", "FixedPointNumbers", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "MIMEs", "Markdown", "Random", "Reexport", "URIs", "UUIDs"]
git-tree-sha1 = "71a22244e352aa8c5f0f2adde4150f62368a3f2e"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.58"

[[deps.PrecompileTools]]
deps = ["Preferences"]
git-tree-sha1 = "5aa36f7049a63a1528fe8f7c3f2113413ffd4e1f"
uuid = "aea7be01-6a6a-4083-8856-8a6e6704d82a"
version = "1.2.1"

[[deps.Preferences]]
deps = ["TOML"]
git-tree-sha1 = "9306f6085165d270f7e3db02af26a400d580f5c6"
uuid = "21216c6a-2e73-6563-6e65-726566657250"
version = "1.4.3"

[[deps.Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[deps.REPL]]
deps = ["InteractiveUtils", "Markdown", "Sockets", "Unicode"]
uuid = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"

[[deps.Random]]
deps = ["SHA"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[deps.Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[deps.SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"
version = "0.7.0"

[[deps.Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[deps.Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[deps.SparseArrays]]
deps = ["Libdl", "LinearAlgebra", "Random", "Serialization", "SuiteSparse_jll"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"
version = "1.10.0"

[[deps.Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"
version = "1.10.0"

[[deps.SuiteSparse_jll]]
deps = ["Artifacts", "Libdl", "libblastrampoline_jll"]
uuid = "bea87d4a-7f5b-5778-9afe-8cc45184846c"
version = "7.2.1+1"

[[deps.TOML]]
deps = ["Dates"]
uuid = "fa267f1f-6049-4f14-aa54-33bafae1ed76"
version = "1.0.3"

[[deps.Tar]]
deps = ["ArgTools", "SHA"]
uuid = "a4e569a6-e804-4fa4-b0f3-eef7a1d5b13e"
version = "1.10.0"

[[deps.Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[deps.Tricks]]
git-tree-sha1 = "eae1bb484cd63b36999ee58be2de6c178105112f"
uuid = "410a4b4d-49e4-4fbc-ab6d-cb71b17b3775"
version = "0.1.8"

[[deps.URIs]]
git-tree-sha1 = "67db6cc7b3821e19ebe75791a9dd19c9b1188f2b"
uuid = "5c2747f8-b7ea-4ff2-ba2e-563bfd36b1d4"
version = "1.5.1"

[[deps.UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[deps.Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"

[[deps.Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"
version = "1.2.13+1"

[[deps.libblastrampoline_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850b90-86db-534c-a0d3-1478176c7d93"
version = "5.8.0+1"

[[deps.nghttp2_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850ede-7688-5339-a07c-302acd2aaf8d"
version = "1.52.0+1"

[[deps.p7zip_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "3f19e933-33d8-53b3-aaab-bd5110c3b7a0"
version = "17.4.0+2"
"""

# ╔═╡ Cell order:
# ╠═7bd46437-8af0-4a15-87e9-1508869e1600
# ╠═72c073fd-5f1b-4af0-901b-aaa901f0f273
# ╠═70dc8fa0-cc32-4ebe-af0d-62b5bb3a82ed
# ╟─acba5003-a456-4c1a-a53f-71a3bec30251
# ╠═51a36d49-1dad-4340-8671-a6a63eb367a2
# ╟─c4e4400e-e063-4236-96e5-ca3a60313e37
# ╟─e047e1b8-1a41-402b-8ed0-90cccbf0c166
# ╠═7c50f0f4-bc18-4f12-a8b6-5eaba151c923
# ╟─6d49055d-0347-4bce-a2c5-f1568596e2e6
# ╟─c56df6f6-865e-4af8-b8c0-429b021af1eb
# ╠═7ba8b496-f7c4-4fbc-a168-dc3d7af92d0c
# ╠═f6ed3a0a-e548-4b99-9cf7-085991a5c99e
# ╠═0f9f50f8-95c8-4cb5-96f2-e4ce177ca2dd
# ╟─1939f0c9-3780-4fc4-898a-5b0a66333274
# ╠═e74be489-35b7-469c-adbf-d1d484738a67
# ╟─359d22e8-b13d-420b-b409-b18136c3ff3b
# ╠═e54cc4c4-2a93-4d44-90ed-5944edbf4b0f
# ╟─3e5b09a9-6d18-4d2f-a37b-ac260ea36646
# ╠═070820c5-082f-4428-8d5e-1fdd1ce29eba
# ╠═0c30855c-6542-4b1a-9427-3a8427e75210
# ╠═8bf75ceb-e4ae-4c6c-8ab0-a81350f19bc7
# ╠═de0cb780-ff4e-4236-89c4-4c3163337cfc
# ╠═dd23fe10-a8d5-461a-85a8-e03468cdcd97
# ╠═ccf62e33-8fcf-45d9-83ed-c7de80800b76
# ╟─1460ece1-7828-4e93-ac37-e979b874b492
# ╠═18c80ea2-0df4-40ea-bd87-f8fee463161e
# ╠═ce29fa1f-0c52-4d38-acbd-0a96cb3b9ce6
# ╟─c3e29c94-941d-4a52-a358-c4ffbfc8cab8
# ╠═b0473b9a-2db5-4d03-8344-b8eaf8428d6c
# ╠═73945da3-af45-41fb-9c5d-6fbba6362256
# ╠═684ef6d7-c1ae-4af3-b1bd-f54bc29d7b53
# ╠═ea9faecf-ecd7-483b-99ad-ede08ba05383
# ╟─f8f7b530-1ded-4ce0-a7d9-a8c92afb95c7
# ╠═c3b1a198-ef19-4a54-9c32-d9ea32a63812
# ╠═e9fc2030-c2f0-48e9-a807-424039e796b2
# ╟─de101f40-27db-43ea-91ed-238502ceaaf7
# ╠═6c709fa0-7a53-4554-ab2a-d8181267ec93
# ╠═671296b9-6743-48d6-9c4d-1beac2b505b5
# ╟─6128ff76-3f1f-4144-bb3d-f44678210013
# ╠═a5823eb2-3aaa-4791-bdc8-196eac2ccf2e
# ╟─b45cc21d-bfff-4375-a524-95108661a2ef
# ╠═4ea48316-62d9-4b24-bb1d-c9fd1db044dc
# ╠═e92a0cf8-f869-4737-a465-db17318498a2
# ╟─62126774-e246-473b-9d0b-92e967cd36ac
# ╠═cfa78790-aa4c-4c7b-8a9f-198987338516
# ╠═340262a2-c823-4e19-8f19-9a05f4504bb5
# ╟─aaf0fe61-d5e6-4d93-8a22-7f97f1249b35
# ╠═6e12592d-01fe-455a-a19c-7544258b9791
# ╠═36c4a5b1-03f2-4f5f-b9af-822a8f7c8cdf
# ╟─38a81414-0bcd-4d71-af1d-fe154d2ae09a
# ╠═2dd5534f-ce46-4770-b0f3-6e16005b3a90
# ╠═f69c6955-800c-461e-b464-cab4989913f6
# ╠═bfe5f717-4702-4316-808a-726fefef9e7e
# ╟─cb3f5ee4-5504-4337-8a8d-d45784f54c85
# ╠═e0271a15-08b5-470f-a2d2-6f064cd3a2b2
# ╠═cb1f840f-8d99-4076-9554-7d8ba56e9865
# ╠═22245242-80a6-4a5b-815e-39b469002f84
# ╟─ebdc0ebc-da58-49c8-a992-5924045c2cac
# ╠═6d74e3fa-1806-40b0-9995-c1555519603d
# ╟─7054b9ce-cd00-42cf-b81c-bc27b29f4714
# ╟─5b5293bf-81b3-4e80-995a-f15f91971bd4
# ╠═3612826c-0af0-4fef-aafe-112a2948f669
# ╠═ce90eb60-98ed-4901-9218-ed8466bb03c7
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
