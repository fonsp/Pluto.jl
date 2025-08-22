export const packageReviseWorker = (packageName: string, path: string) => `### A Pluto.jl notebook ###
# v0.20.16

using Markdown
using InteractiveUtils

# ╔═╡ 7735b275-295d-42ce-8d17-19a10b494320
begin
    import Pkg
    Pkg.add("PlutoLinks")
    Pkg.add("Revise")
	Pkg.add("AbstractPlutoDingetjes")
    Pkg.develop(path="${path}")
	using PlutoLinks, Revise
end

# ╔═╡ 37f18ca2-d376-4dad-acb5-b21639355488
@revise using ${packageName}

# ╔═╡ 00000000-0000-0208-1991-000000000000
begin
    using AbstractPlutoDingetjes
    function 🪟(a)
        io = IOBuffer()
        show(io, a)
        return String(take!(io))
    end
	function eval_in_pluto(x::String)
		id = PlutoRunner.moduleworkspace_count[]
		new_workspace_name = Symbol("workspace#", id)
		Core.eval(getproperty(Main, new_workspace_name), Meta.parse(x))
	end
	AbstractPlutoDingetjes.Display.with_js_link(eval_in_pluto)
end

# ╔═╡ 17640727-380e-4c1b-8f0c-dbea48bb3098

# ╔═╡ Cell order:
# ╠═7735b275-295d-42ce-8d17-19a10b494320
# ╠═37f18ca2-d376-4dad-acb5-b21639355488
# ╠═17640727-380e-4c1b-8f0c-dbea48bb3098
# ╠═00000000-0000-0208-1991-000000000000`
