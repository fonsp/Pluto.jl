### A Pluto.jl notebook ###
# v0.12.21

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

# ╔═╡ 7d550d46-7dc4-11eb-3df0-db7ad0594043
using PlutoUI

# ╔═╡ 8399ed34-7dc4-11eb-16ec-e572834e149d
@bind x Slider(1:10)

# ╔═╡ 88c83d42-7dc4-11eb-1b5e-a1ecad4b6ff1
x

# ╔═╡ Cell order:
# ╠═7d550d46-7dc4-11eb-3df0-db7ad0594043
# ╠═8399ed34-7dc4-11eb-16ec-e572834e149d
# ╠═88c83d42-7dc4-11eb-1b5e-a1ecad4b6ff1
