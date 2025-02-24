### A Pluto.jl notebook ###
# v0.20.4

using Markdown
using InteractiveUtils

# ╔═╡ e19bd550-c9dd-11ef-02bd-795cab4c96c6
begin

	# false && Pkg.activate()


	
	import A
	import B, C as eeeEE, FIFIFIFI
	using XXD: asdf, E
	using Dee: asdeeef, eeeE

	if false
		:(import AA)
	end
end

# ╔═╡ d0ee4518-406a-4628-ac4a-30d5fa11f5a7
md"""
# Difficult syntax
"""

# ╔═╡ e746ef9c-47c1-4d5d-bce1-4616f25ff586
( 1 + 2)

# ╔═╡ 5666ac41-9e8d-40fc-89be-e2a6c1637da5
# https://github.com/fonsp/Pluto.jl/issues/2382
@a f(x-1 : g(x))

# ╔═╡ bf834c19-3d0d-4989-9ba3-ef7cb77f9a00
# https://github.com/fonsp/Pluto.jl/issues/1921
begin
	# double click me
	abc
	ab!
	aπc
	@ab
	ab😎
	a😎c
	🌟🌟🌟
end

# ╔═╡ 3da33f9d-1240-4522-9463-8772b0c2539a
# https://github.com/fonsp/Pluto.jl/issues/2063
@amacro begin
    x = a : b:c
end

# ╔═╡ f248e96a-4050-4888-940b-f38158c102fe


# ╔═╡ daba5486-8d5e-4fce-959b-251e821e5dea
# https://github.com/fonsp/Pluto.jl/issues/2639
let x = 1 end

# ╔═╡ 287dd3c7-33e6-482d-9639-d502fcff9234
# https://github.com/fonsp/Pluto.jl/issues/2639
let f() = 1 end

# ╔═╡ 6db1e583-54f2-4d8f-9181-a7913345c7fd
# https://github.com/fonsp/Pluto.jl/issues/2095
Bool <: Integer

# ╔═╡ 3571549e-335b-4fbb-944f-d071db32b29f
(z for z in z)

# ╔═╡ 7d8f150f-0625-463b-a964-34cd7cc8fda2
# https://github.com/fonsp/Pluto.jl/issues/2731
let
	f() = let (x,y) = z
		"$x"
	end
	# this doesn't look like a "comment" at all
	# that's better
end

# ╔═╡ 8dec1241-8bd9-4c60-935a-9230b39813b7
# https://github.com/fonsp/Pluto.jl/issues/2875
"const x = hey there!

# ╔═╡ 466cd22c-bc46-4e35-b3c8-b6f884fd0858
# https://github.com/fonsp/Pluto.jl/issues/2875
md"""

asdf

sdf [23]()

# asf _sdf_

sdf

# ╔═╡ 259280cc-5468-4e7d-94c5-6679d7059685
#  https://github.com/fonsp/Pluto.jl/issues/3065
x.var"abc"
x.var"# abc"
var"# abc"

# ╔═╡ 908c565f-ea71-488c-8298-0c31757fb80c
# https://github.com/fonsp/Pluto.jl/issues/3080
# https://github.com/JuliaPluto/lezer-julia/issues/24
[@show (index) for index in eachindex(r_v)]

# ╔═╡ 0402fff9-ea92-4302-861d-f40fba31ee61
# https://github.com/fonsp/Pluto.jl/issues/3116
quote
	@huh begin
		a(x,y) = a(x)y(y)
	end
end

# ╔═╡ e397f96e-8f91-4de6-9b12-730ae38ecc27
# https://github.com/fonsp/Pluto.jl/issues/3131
a = r"aa" => s""
b = a"s"

# ╔═╡ 1e5b8ba7-a0d4-458e-b6c3-10152e87b328
md"""
# Scope stuff
"""

# ╔═╡ 2a022568-47c9-4668-b91e-1bbc834e8d00
quote
end

# ╔═╡ d321e6ca-91a8-4e9b-9f54-be97735ab866


# ╔═╡ 3a9fc24d-6767-4e48-b912-863c2cd6ddbc
begin
	a, b = 123, 33
end

# ╔═╡ e45548dc-cf3c-4ddd-be78-e2776380f172
(zzz,zzz2) = [a,a]

# ╔═╡ c93f0182-3e16-4ff5-a612-5cd2e70d249f
(
	a + b
	for a in 1:10
)

# ╔═╡ 2bdbece1-f111-40ee-b6f0-5cbd79fc4ff7
for a = b, a=b
	let
		b
	end   
end   

# ╔═╡ 06f8bd08-a036-4534-863c-0f1470f62baa
a, b

# ╔═╡ 0fb082a6-bc05-4dd7-9535-0f4fb3cdadb8
try
	a
catch a
	a
end

# ╔═╡ b57da300-58b5-498b-9798-c565dbb74026
f(g((args...; kwarg1=dict[index], karg2=kwarg2) -> X))


# ╔═╡ 63bd761a-1bc4-4859-a0c2-bbbeff613cba
for a in b:c, (b,c) in a:c
	a + b + c + d 
end  

# ╔═╡ a219d3da-3201-4a76-8d26-1df5251a2890
for a = b:c
	a + b + c + d
end

# ╔═╡ 5daae1d8-a122-48e5-b6d4-918df4120e3d
fa(x, n) = g(a)    

# ╔═╡ 71690dcf-d3a9-49e6-9f59-adbb5b379571
begin
	∘(x, n) = g(a + a)     
end

# ╔═╡ 43a2db54-a64f-49e8-9edc-2726becb7a38
Fⁿ(x, n) = ∘(fill(F, n)...)(x);     

# ╔═╡ 74022839-85be-44b6-9dd0-7c9eaba70053
macro yay(xs...)
xs[1]
end

# ╔═╡ 10742d7d-81b5-436c-9ac8-04f920373c9c
@yay 123 a b = 1

# ╔═╡ 698876c5-8dec-49df-8309-63e69ddf0f1a
[
	a b
	a a
]

# ╔═╡ 3af8b76a-6534-44d6-8456-59a1b139efb2
begin
	a + b
	
	let a = 123
	
		a + b
	end
	let b = 123
	
		a + b
	end
	
	let a = 123
	
		let b = 123
		
			a + b
		end
	end

	a + b
end

# ╔═╡ b7d6a7fc-8286-4cf9-af62-4dedefc66c97
x(a) = a + b

# ╔═╡ 69acb688-3726-4252-b7e2-f496181d2aa6
# https://github.com/fonsp/Pluto.jl/issues/2382
f(x-1 : g(x))

# ╔═╡ c88fe37a-c2e6-46f1-b92b-98737437a741
# https://github.com/fonsp/Pluto.jl/issues/2575
[√p for p in x]

# ╔═╡ 17c063da-5bdd-4ee1-b881-42acc6777610
# https://github.com/fonsp/Pluto.jl/issues/2724
let
	x
	[f(y[i]) for i in v] 
end

# ╔═╡ 8b6d03e1-2196-47e3-9a60-c1245c7b7849
asdf() do a, b
	x + a + b + c
end

# ╔═╡ 57b3a2b8-ee9c-45dd-9819-fdb561135cb1
ff2(a) = begin
	a + b
end

# ╔═╡ 45171038-97f5-4662-acd1-da7748443700
z[a][2] = 22233

# ╔═╡ d4786341-13ab-4a79-8077-a66ffe09427a
z.a = 123

# ╔═╡ ac4d6ffd-4d5a-4932-ba35-1c5a56b42122
let

	zzz.a.b

	a.zzz.b
	a.zzz.b(b)

	a[b]

end

# ╔═╡ 3a506c19-2928-40ab-b6b9-e9288dd31eeb
let
	a = b

	a + b
end

# ╔═╡ 40079547-4cfc-4557-8e88-b2182903f9fb
yoo(x,y) = 123333

# ╔═╡ 9f9e083f-87c2-4c83-89bc-90a4e5f42c96
function() 
	z + yef
end   

# ╔═╡ 85eaec36-5b60-4852-a0b0-d1b477d7b43e
a, b

# ╔═╡ bf1140c5-e0b7-42a2-94fe-623fd4c8b8dc


# ╔═╡ 4a4e0029-899e-46e5-a101-90d8a64de073
# @quickactivate

# ╔═╡ b6ece33c-8f33-4219-b711-ef3ebb30b0bb


# ╔═╡ 67150120-fc85-448f-91c4-aaf69145900c
md"""
# Package imports
"""

# ╔═╡ 20276c02-8e7c-41a6-ad3d-5ce84eadf025
md"""
# Mixed mode
"""

# ╔═╡ 5360ae7a-b43c-404b-b039-76485d12fa2f
md"""

# asdfasdf

<html>




</html>
 
"""; # sdf

# ╔═╡ e9019c45-4609-4640-8a6f-345129c54ac4
@aaa """


"""

# ╔═╡ 422b8bb5-d910-4aaa-b8c2-a781c0b8b6f0
@aaa("""


""")

# ╔═╡ 62b805db-2028-40b0-b412-4c91d15ad338
c = d = e = f= g =h=i=j=k=l=m=n=o=p=q=r=9

# ╔═╡ 5b62306f-c730-42f0-85dd-8692ca8b50fa
function f(by, y; by=213, beeyt)
		sdf
end

# ╔═╡ a35574d7-c7eb-4ffa-b8ef-5e8aef7aa3e9
begin
	function ff(a, b=2; c=2, d)
		a + b + c + d + e + f
	end      
	xxx 
end 

# ╔═╡ 99c58cfd-e400-458d-8304-8c68bce3a769
begin
	ff(a, b=2; c=2, d) = a + b + c + d + f
	xxx 
end 

# ╔═╡ Cell order:
# ╟─d0ee4518-406a-4628-ac4a-30d5fa11f5a7
# ╠═e746ef9c-47c1-4d5d-bce1-4616f25ff586
# ╠═e45548dc-cf3c-4ddd-be78-e2776380f172
# ╠═5b62306f-c730-42f0-85dd-8692ca8b50fa
# ╠═b57da300-58b5-498b-9798-c565dbb74026
# ╠═69acb688-3726-4252-b7e2-f496181d2aa6
# ╠═5666ac41-9e8d-40fc-89be-e2a6c1637da5
# ╠═bf834c19-3d0d-4989-9ba3-ef7cb77f9a00
# ╠═3da33f9d-1240-4522-9463-8772b0c2539a
# ╠═c88fe37a-c2e6-46f1-b92b-98737437a741
# ╠═f248e96a-4050-4888-940b-f38158c102fe
# ╠═daba5486-8d5e-4fce-959b-251e821e5dea
# ╠═287dd3c7-33e6-482d-9639-d502fcff9234
# ╠═6db1e583-54f2-4d8f-9181-a7913345c7fd
# ╠═17c063da-5bdd-4ee1-b881-42acc6777610
# ╠═3571549e-335b-4fbb-944f-d071db32b29f
# ╠═7d8f150f-0625-463b-a964-34cd7cc8fda2
# ╠═8dec1241-8bd9-4c60-935a-9230b39813b7
# ╠═466cd22c-bc46-4e35-b3c8-b6f884fd0858
# ╠═259280cc-5468-4e7d-94c5-6679d7059685
# ╠═908c565f-ea71-488c-8298-0c31757fb80c
# ╠═0402fff9-ea92-4302-861d-f40fba31ee61
# ╠═e397f96e-8f91-4de6-9b12-730ae38ecc27
# ╠═c93f0182-3e16-4ff5-a612-5cd2e70d249f
# ╟─1e5b8ba7-a0d4-458e-b6c3-10152e87b328
# ╠═63bd761a-1bc4-4859-a0c2-bbbeff613cba
# ╠═a219d3da-3201-4a76-8d26-1df5251a2890
# ╠═2bdbece1-f111-40ee-b6f0-5cbd79fc4ff7
# ╠═06f8bd08-a036-4534-863c-0f1470f62baa
# ╠═8b6d03e1-2196-47e3-9a60-c1245c7b7849
# ╠═2a022568-47c9-4668-b91e-1bbc834e8d00
# ╠═0fb082a6-bc05-4dd7-9535-0f4fb3cdadb8
# ╠═a35574d7-c7eb-4ffa-b8ef-5e8aef7aa3e9
# ╠═99c58cfd-e400-458d-8304-8c68bce3a769
# ╠═5daae1d8-a122-48e5-b6d4-918df4120e3d
# ╠═71690dcf-d3a9-49e6-9f59-adbb5b379571
# ╠═43a2db54-a64f-49e8-9edc-2726becb7a38
# ╠═d321e6ca-91a8-4e9b-9f54-be97735ab866
# ╠═3a9fc24d-6767-4e48-b912-863c2cd6ddbc
# ╠═62b805db-2028-40b0-b412-4c91d15ad338
# ╠═74022839-85be-44b6-9dd0-7c9eaba70053
# ╠═10742d7d-81b5-436c-9ac8-04f920373c9c
# ╠═698876c5-8dec-49df-8309-63e69ddf0f1a
# ╠═3af8b76a-6534-44d6-8456-59a1b139efb2
# ╠═b7d6a7fc-8286-4cf9-af62-4dedefc66c97
# ╠═57b3a2b8-ee9c-45dd-9819-fdb561135cb1
# ╠═45171038-97f5-4662-acd1-da7748443700
# ╠═d4786341-13ab-4a79-8077-a66ffe09427a
# ╠═ac4d6ffd-4d5a-4932-ba35-1c5a56b42122
# ╠═3a506c19-2928-40ab-b6b9-e9288dd31eeb
# ╠═40079547-4cfc-4557-8e88-b2182903f9fb
# ╠═9f9e083f-87c2-4c83-89bc-90a4e5f42c96
# ╠═85eaec36-5b60-4852-a0b0-d1b477d7b43e
# ╠═bf1140c5-e0b7-42a2-94fe-623fd4c8b8dc
# ╠═4a4e0029-899e-46e5-a101-90d8a64de073
# ╠═b6ece33c-8f33-4219-b711-ef3ebb30b0bb
# ╟─67150120-fc85-448f-91c4-aaf69145900c
# ╠═e19bd550-c9dd-11ef-02bd-795cab4c96c6
# ╟─20276c02-8e7c-41a6-ad3d-5ce84eadf025
# ╠═5360ae7a-b43c-404b-b039-76485d12fa2f
# ╠═e9019c45-4609-4640-8a6f-345129c54ac4
# ╠═422b8bb5-d910-4aaa-b8c2-a781c0b8b6f0
