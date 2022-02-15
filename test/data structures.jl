import Pluto: ImmutableVector, ImmutableSet, ImmutableDefaultDict, setdiffkeys

@testset "ImmutableCollections" begin
    
    
    
    

# ╔═╡ bd27d82e-62d6-422c-8fbe-61993dc4c268
@test isempty(ImmutableVector{Int}())

# ╔═╡ d4f2016a-b093-4619-9ccb-3e99bf6fdc9b
@test ImmutableVector{Int32}([1,2,3]).c |> eltype == Int32

# ╔═╡ 055f21c0-3741-4762-ac4e-4c89633afbc4
let
	x = [1,2,3]
	y = ImmutableVector(x)
	push!(x,4)
	@test y == [1,2,3]
end

# ╔═╡ 52310ade-6e06-4ab8-8589-444c161cd93b
let
	x = [1,2,3]
	y = ImmutableVector{Int32}(x)
	push!(x,4)
	@test y == [1,2,3]
end

# ╔═╡ d61600f0-2202-4228-8d35-380f732214e7
ImmutableSet()

# ╔═╡ d3871580-cd22-48c1-a1fd-d13a7f2f2135
ImmutableSet{Int}()

# ╔═╡ 2af00467-8bbf-49d8-bfe3-6f8d6307e900
ImmutableSet{Int64}(Set([1,2]); skip_copy=true)

# ╔═╡ 46836112-7c5c-4ffd-8d1e-93a2c8990b20
@test ImmutableSet{Int64}(Set([1,2]); skip_copy=true) == Set([1,2])

# ╔═╡ fd687b2e-8bec-48b2-810e-38ef00bf567b
let
	x = [1.1,2,3]
	y = ImmutableVector(x; skip_copy=true)
	push!(x,4)
	@test y == [1.1,2,3,4]
end

# ╔═╡ f4dddf0b-cf0a-41d0-880e-6a8fac7c60cb
let
	x = [1.1,2,3]
	y = ImmutableVector{Float64}(x; skip_copy=true)
	push!(x,4)
	@test y == [1.1,2,3,4]
end

# ╔═╡ 25c78371-f12d-44ae-b180-32b88d3aa4f5
@test eltype(ImmutableSet([2,3,4])) == Int

# ╔═╡ 45115ac6-6586-458c-83e6-d661c2ce8db2
let
	x = Set([1,2,3])
	y = ImmutableSet(x)
	push!(x,4)
	@test y == Set([1,2,3])
end

# ╔═╡ 4f26640d-31d2-44c4-bbba-82c18d7497ae
let
	x = Set([1.1,2,3])
	y = ImmutableSet(x; skip_copy=true)
	push!(x,4)
	@test y == Set([1.1,2,3,4])
end

# ╔═╡ eac9c95b-a2b6-4f1f-8cce-a2ad4c0972c5
@test union(ImmutableSet([1,2]),[2,3]) == ImmutableSet([1,2,3])

# ╔═╡ bff65a2c-8654-4403-8e34-58aac8616729
@test filter(x -> true, ImmutableVector([1,2,3])) == [1,2,3]

# ╔═╡ ce3cdb24-e851-4cc3-9955-b34fe358b41a
@test ImmutableVector([1,2,3])[2:end] isa ImmutableVector

# ╔═╡ c61196d6-f529-4883-b334-ed1b0f653acf


# ╔═╡ 5c2b3440-7231-42df-b4e5-619001d225a8
ImmutableSet([123,234])



@test setdiffkeys(Dict(1=>2,3=>4),[3]) == Dict(1=>2)

let
	d = setdiffkeys(ImmutableDefaultDict(() -> 7, Dict(1=>2,3=>4)),[3])
	@test d[1] == 2 && d[3] == 7
end

@test setdiff(ImmutableSet([1,2]), [2]) isa ImmutableSet

end