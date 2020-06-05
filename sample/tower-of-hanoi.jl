### A Pluto.jl notebook ###
# v0.9.3

using Markdown

# ╔═╡ 5b2ee40e-a2b8-11ea-0fef-c35fe6918860
md"""
# The tower of Hanoi

The tower of hanoi is a famous puzzle.

![setup of the tower of a hanoi](https://upload.wikimedia.org/wikipedia/commons/0/07/Tower_of_Hanoi.jpeg)

The game consists of three rods with disks stacked on top of them. The puzzle will start with all the disk in a stack on one of the rods (like in the picture). The goal is to move all the discs to a single stack on  different rod.

To move the disks, you have to follow the following rules:

* You can move only one disk at a time.
* For each move, you have to take the upper disk from one of the stacks, and place it on top of another stack or empty rod.
* You cannot place a larger disk on top of a smaller disk.

This notebook will define a Julia implementation of the puzzle. It's up to you to write an algorithm that solves it.
"""

# ╔═╡ 95fbd0d2-a2b9-11ea-0682-fdf783251797
md"""
## Setting up the game pieces

What does a Julia implementation look like? We're not really interested in writing code that will manipulate physical disks. Our final goal is a function that will give us a _recipe_ to solve the tower of hanoi, which is just a list of moves to make. Because of that, we can use a lot of abstraction in our implementation, and keep the data structures as simple as possible.

To start, we have to define some representation of the disks and the stacks. The disks have one important property, which is that they are ordered. We can use integers to represent them.
"""

# ╔═╡ 620d6834-a2ba-11ea-150a-2132bb54e4b3
num_disks = 8

# ╔═╡ 35ada214-a32c-11ea-0da3-d5d494b28467
md"""(Side note: the number of disks is arbitrary. When testing your function, you may want to set it to 1 or 2 to start.)"""

# ╔═╡ 7243cc8e-a2ba-11ea-3f29-99356f0cdcf4
all_disks = 1:num_disks

# ╔═╡ 7e1ba2ac-a2ba-11ea-0134-2f61ed75be18
md"""
A single stack can be represented as an array with all the disks in it. We will list them from top to bottom.
"""

# ╔═╡ 43781a52-a339-11ea-3803-e56e2d08aa83
first_stack = collect(all_disks)

# ╔═╡ b648ab70-a2ba-11ea-2dcc-55b630e44325
md"""
Now we have to make three of those. 
"""

# ╔═╡ 32f26f80-a2bb-11ea-0f2a-3fc631ada63d
starting_stacks = [first_stack, [], []]

# ╔═╡ e347f1de-a2bb-11ea-06e7-87cca6f2a240
md"""
## Defining the rules

Now that we have our "game board", we can implement the rules.

To start, we make two functions for states. A state of the game is just an array of stacks.

We will define a function that checks if a state is okay according to the rules. To be legal, all the stacks should be in the correct order, so no larger disks on top of smaller disks. 

Another good thing to check: no disks should have appeared or disappeared since we started!
"""

# ╔═╡ 512fa6d2-a2bd-11ea-3dbe-b935b536967b
function islegal(stacks)
	order_correct = all(issorted, stacks)
	
	#check if we use the same disk set that we started with
	
	disks_in_state = sort([disk for stack in stacks for disk in stack])
	disks_complete = disks_in_state == all_disks
	
	order_correct && disks_complete
end

# ╔═╡ c56a5858-a2bd-11ea-1d96-77eaf5e74925
md"""
Another function for states: check if we are done! We can assume that we already checked if the state was legal. So we know that all the disks are there and they are ordered correctly.  To check if we are finished, we just need to check if the last stack contains all the disks.
"""

# ╔═╡ d5cc41e8-a2bd-11ea-39c7-b7df8de6ae3e
function iscomplete(stacks)
	last(stacks) == all_disks
end

# ╔═╡ 53374f0e-a2c0-11ea-0c91-97474780721e
md"""
Now the only rules left to implement are the rules for moving disks. 

We could implement this as another check on states, but it's easier to just write a legal `move` function. Your solution will specify moves for the `move` function, so this will be the only way that the stacks are actually manipulated. That we, we are sure that nothing fishy is happening.

We will make our `move` function so that its input consists of a state of the game, and instructions for what to do. Its output will be the new state of the game.

So what should those instructions look like? It may seem intuitive to give a _disk_ that should be moved, but that's more than we need. After all, we are only allowed to take the top disk from one stack, and move it to the top of another. So we only have to say which _stacks_ we are moving between.

(Note that the `move` function is okay with moving a larger disk on top of a smaller disk. We already implemented that restriction in `islegal`.)
"""

# ╔═╡ e915394e-a2c0-11ea-0cd9-1df6fd3c7adf
function move(stacks, source::Int, target::Int)
	#check if the from stack if not empty
	if isempty(stacks[source])
		error("Error: attempted to move disk from empty stack")
	end
	
	new_stacks = deepcopy(stacks)
	
	disk = popfirst!(new_stacks[source]) #take disk
	pushfirst!(new_stacks[target], disk) #put on new stack
	
	return new_stacks
end

# ╔═╡ 87b2d164-a2c4-11ea-3095-916628943879
md"""
## Solving the problem

We have implemented the game pieces and the rules, so you can start working on your solution.

To do this, you can fill in the `solve(stacks)` function. This function should give a solution for the given `stacks`, by moving all the disks from stack 1 to stack 3.

As output, `solve` should give a recipe, that tells us what to do. This recipe should be an array of moves. Each moves is a `(source, target)` tuple, specifying from which stack to which stack you should move.

For example, it might look like this:
"""

# ╔═╡ 29b410cc-a329-11ea-202a-795b31ce5ad5
function wrong_solution(stacks)::Array{Tuple{Int, Int}}
	return [(1,2), (2,3), (2,1), (1,3)]
end

# ╔═╡ ea24e778-a32e-11ea-3f11-dbe9d36b1011
md"""
Now you can work on building an actual solution. Some tips:
* `solve(stacks)` can keep track of the board if you want, but it doesn't have to.
* The section below will actually run your moves, which is very useful for checking them.
* If you want, you can change `num_disks` to 1 or 2. That can be a good starting point.
"""

# ╔═╡ 010dbdbc-a2c5-11ea-34c3-837eae17416f
function solve(stacks)::Array{Tuple{Int, Int}}
	
	#what to do?
	
	return []
end

# ╔═╡ 3eb3c4c0-a2c5-11ea-0bcc-c9b52094f660
md"""
## Checking solutions

This is where we can check a solution. We start with a function that takes our recipe and runs it.
"""

# ╔═╡ 4709db36-a327-11ea-13a3-bbfb18da84ce
function run_solution(solver::Function, start = starting_stacks)
	moves = solver(deepcopy(start)) #apply the solver
	
	all_states = Array{Any,1}(undef, length(moves) + 1)
	all_states[1] = starting_stacks
	
	for (i, m) in enumerate(moves)
		try
			all_states[i + 1] = move(all_states[i], m[1], m[2])
		catch
			all_states[i + 1] = missing
		end
	end
	
	return all_states
end

# ╔═╡ 372824b4-a330-11ea-2f26-7b9a1ad018f1
md"""
You can use this function to see what your solution does.

If `run_solution` tries to make an impossible move, it will give `missing` from that point onwards. Look at what happens in the `wrong_solution` version and compare it to the moves in `wrong_solution`.
"""

# ╔═╡ d2227b40-a329-11ea-105c-b585d5fcf970
run_solution(wrong_solution)

# ╔═╡ 9173b174-a327-11ea-3a69-9f7525f2e7b4
run_solution(solve)

# ╔═╡ bb5088ec-a330-11ea-2c41-6b8b92724b3b
md"""
Now that we have way to run a recipe, we can check if its output is correct. We will check if all the intermediate states are legal and the final state is the finished puzzle.
"""

# ╔═╡ 10fb1c56-a2c5-11ea-2a06-0d8c36bfa138
function check_solution(solver::Function, start = starting_stacks)
	try
		#run the solution
		all_states = run_solution(solver, start)
		
		#check if each state is legal
		all_legal = all(islegal, all_states)
		
		#check if the final state is is the completed puzzle
		complete = (iscomplete ∘ last)(all_states)
		
		all_legal && complete
	catch
		#return false if we encountered an error
		return false
	end
end

# ╔═╡ 8ea7f944-a329-11ea-22cc-4dbd11ec0610
check_solution(solve)

# ╔═╡ e54add0a-a330-11ea-2eeb-1d42f552ba38
if check_solution(solve)
	if num_disks >= 8
		md"""
		Congratulations, your solution works!
		"""
	else
		md"""
		Your solution works for $(num_disks) disks. Change `num_disks` to see if it works for 8 or more.
		"""
	end
else
	md"""
	The `solve` function doesn't work yet. Keep working on it!
	"""
end

# ╔═╡ Cell order:
# ╟─5b2ee40e-a2b8-11ea-0fef-c35fe6918860
# ╟─95fbd0d2-a2b9-11ea-0682-fdf783251797
# ╠═620d6834-a2ba-11ea-150a-2132bb54e4b3
# ╟─35ada214-a32c-11ea-0da3-d5d494b28467
# ╠═7243cc8e-a2ba-11ea-3f29-99356f0cdcf4
# ╟─7e1ba2ac-a2ba-11ea-0134-2f61ed75be18
# ╠═43781a52-a339-11ea-3803-e56e2d08aa83
# ╟─b648ab70-a2ba-11ea-2dcc-55b630e44325
# ╠═32f26f80-a2bb-11ea-0f2a-3fc631ada63d
# ╟─e347f1de-a2bb-11ea-06e7-87cca6f2a240
# ╠═512fa6d2-a2bd-11ea-3dbe-b935b536967b
# ╟─c56a5858-a2bd-11ea-1d96-77eaf5e74925
# ╠═d5cc41e8-a2bd-11ea-39c7-b7df8de6ae3e
# ╟─53374f0e-a2c0-11ea-0c91-97474780721e
# ╠═e915394e-a2c0-11ea-0cd9-1df6fd3c7adf
# ╟─87b2d164-a2c4-11ea-3095-916628943879
# ╠═29b410cc-a329-11ea-202a-795b31ce5ad5
# ╟─ea24e778-a32e-11ea-3f11-dbe9d36b1011
# ╠═010dbdbc-a2c5-11ea-34c3-837eae17416f
# ╟─3eb3c4c0-a2c5-11ea-0bcc-c9b52094f660
# ╠═4709db36-a327-11ea-13a3-bbfb18da84ce
# ╟─372824b4-a330-11ea-2f26-7b9a1ad018f1
# ╠═d2227b40-a329-11ea-105c-b585d5fcf970
# ╠═9173b174-a327-11ea-3a69-9f7525f2e7b4
# ╟─bb5088ec-a330-11ea-2c41-6b8b92724b3b
# ╠═10fb1c56-a2c5-11ea-2a06-0d8c36bfa138
# ╠═8ea7f944-a329-11ea-22cc-4dbd11ec0610
# ╟─e54add0a-a330-11ea-2eeb-1d42f552ba38
