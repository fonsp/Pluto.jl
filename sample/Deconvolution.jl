### A JIVEbook.jl notebook ###
# v0.0.2

using Markdown
using InteractiveUtils
using JIVECore
using PlutoPlotly, PlutoUI
import Main.PlutoRunner.JIVECore.Data.image_data as image_data
import Main.PlutoRunner.JIVECore.Data.image_keys as image_keys

# ╔═╡ 8cda66e0-9150-11f0-0810-71970ca2749f
image_data[JIVECore.Files.loadImage!(image_data, image_keys)]


# ╔═╡ 7dd6c408-1522-44eb-8f49-99c8f75fcb06
JIVECore.Visualize.gif(JIVECore.Process.autoContrast(image_data["Stack_1"]))

# ╔═╡ Cell order:
# ╟─8cda66e0-9150-11f0-0810-71970ca2749f
# ╠═7dd6c408-1522-44eb-8f49-99c8f75fcb06
