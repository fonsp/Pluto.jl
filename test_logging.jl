### A Pluto.jl notebook ###
# v0.20.18

using Markdown
using InteractiveUtils

# ╔═╡ 1e5d7f80-4f5a-11ee-0a2a-9d9858885555
begin
    using Logging
    using ProgressLogging
end

# ╔═╡ 2a5d7f80-4f5a-11ee-0a2a-9d9858885555
md"# 测试日志功能"

# ╔═╡ 807fd796-e8bc-4564-ba6d-0780a0a01a20
# 普通日志输出
@info "这是一条信息日志"

# ╔═╡ bd1feb8b-64e5-4d77-9644-f70989d0e046
@warn "这是一条警告日志"

# ╔═╡ f3bbb4d5-ad4e-4c38-a93b-97830f1058a5
@error "这是一条错误日志"

# ╔═╡ 4a5d7f80-4f5a-11ee-0a2a-9d9858885555
# 进度日志
@progress for i in 1:10
    sleep(0.1)
    println("处理项目 $i")
end

# ╔═╡ 5a5d7f80-4f5a-11ee-0a2a-9d9858885555
# 标准输出
println("这是标准输出信息")

# ╔═╡ 6a5d7f80-4f5a-11ee-0a2a-9d9858885555
# 错误输出
println(stderr, "这是标准错误信息")

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Logging = "56ddb016-857b-54e1-b83d-db4d58db5568"
ProgressLogging = "33c8b6b6-d38a-422a-b730-caa89a2f386c"

[compat]
ProgressLogging = "~0.1.5"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.11.4"
manifest_format = "2.0"
project_hash = "441649fad9bd024fe6c956a94901cdd313909f58"

[[deps.Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"
version = "1.11.0"

[[deps.ProgressLogging]]
deps = ["Logging", "SHA", "UUIDs"]
git-tree-sha1 = "d95ed0324b0799843ac6f7a6a85e65fe4e5173f0"
uuid = "33c8b6b6-d38a-422a-b730-caa89a2f386c"
version = "0.1.5"

[[deps.Random]]
deps = ["SHA"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"
version = "1.11.0"

[[deps.SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"
version = "0.7.0"

[[deps.UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"
version = "1.11.0"
"""

# ╔═╡ Cell order:
# ╠═1e5d7f80-4f5a-11ee-0a2a-9d9858885555
# ╠═2a5d7f80-4f5a-11ee-0a2a-9d9858885555
# ╠═807fd796-e8bc-4564-ba6d-0780a0a01a20
# ╠═bd1feb8b-64e5-4d77-9644-f70989d0e046
# ╠═f3bbb4d5-ad4e-4c38-a93b-97830f1058a5
# ╠═4a5d7f80-4f5a-11ee-0a2a-9d9858885555
# ╠═5a5d7f80-4f5a-11ee-0a2a-9d9858885555
# ╠═6a5d7f80-4f5a-11ee-0a2a-9d9858885555
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
