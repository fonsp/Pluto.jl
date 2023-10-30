### A Pluto.jl notebook ###
# v0.19.9

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end

# ╔═╡ 14158eb0-d45c-11ea-088f-330e45412320
a = 2

# ╔═╡ 2ed4bb92-d45c-11ea-0b31-2d8e32ce7b44
b = 6

# ╔═╡ 03664f5c-d45c-11ea-21b6-91cd647a07aa
md"# Mathematics in Julia 🍕
This is an introduction to programming.  Let's get started!

## Let's make a calculator!

First let's do some simple math with setting **a = $a**, **b = $b** and **c = a * b**.  What will **c** equal?

Type in the cells (with the coloured background) below and press **`Shift-Enter`** or the click the right-arrow button (▶️) to the right to execute the cell after changing the values."

# ╔═╡ e5e0a0da-d45c-11ea-1042-e9b5d0654d4f
md"Fix the value of `c` below to make it `c = a * b`"

# ╔═╡ 30f0f882-d45c-11ea-2adc-7d84ecf8a7a6
c = 10

# ╔═╡ 262b312a-d460-11ea-26c5-df30459effc5
people = 10

# ╔═╡ 2ea7f162-d460-11ea-0e8e-25340e2e64da
avg = 2.5

# ╔═╡ 3da812c6-d460-11ea-0170-79fbb6a4347c
slices = 8

# ╔═╡ a38cb92e-d45e-11ea-2959-05be909befb2
md"""### Now you have a calculator!

You did multiplication above.  Here's how you do other mathematical operations:

Operation | Type This
:------------ | :-------------:
add | +
subtract | -
multiply | *
divide | /
power | ^

### Pizza Slices

Let's try this out on a problem.  Let's say you want to order pizzas for $people people (**people = $people**) and each person wants $avg slices on average (**avg = $avg**).  A pizza has $slices slices per pizza (**slices = $slices**).  How many pizzas should you order (**pizzas = ?**)?  So we have the following

Meaning | Variable
:------ | :--------:
Number of people | people
Average number of slices each person eats | avg
Number of slices on a piece of pizza | slices

"""

# ╔═╡ 4dff4b5e-d461-11ea-29c8-d548fdb5f08b
md"Edit the equation below to calculate the number of pizzas to order using the variables above for **people**, **avg**, and **slices**:"

# ╔═╡ 444e2fa4-d460-11ea-12aa-57e0576c2d66
pizzas = 1

# ╔═╡ 3c12f2b4-d471-11ea-2d37-539f061f7cf2
r = 6

# ╔═╡ d9c31dfa-d470-11ea-23b2-838975b71f7c
md"""## Writing your own math functions

The area of a pizza is ``A = \pi r^2``.  Lets try calculating the area of a pizza that has a radius of $r inches (**r = $6**).  Type **pi** to get the value of ``\pi`` and **r^2** to get the radius squared.
"""

# ╔═╡ 50f0f6d6-d471-11ea-304e-8f72e7ef9d7e
A =  r^2

# ╔═╡ f907e46a-d471-11ea-07e5-f30e2aab3d08
md"""The diameter of a pizza is often stated on a menu so let's define a **formula** to calculate the area of a pizza given the diameter **d**.

We do this by writing a formula like this: `area(d) = pi * (d/2)^2`

Let's write that below:
"""

# ╔═╡ cb36a9ee-d472-11ea-1835-bf7963137e18
area(d) = pi * (d / 2)^2

# ╔═╡ d9575e9c-d472-11ea-1eda-2d335d039f28
md"""Now we have a function called **area** that we can pass any diameter and it will return the area of a pizza (or circle), let's try that with the pizza from before with `area(2*r)` to get the area of the pizza:
"""

# ╔═╡ 04b010c0-d473-11ea-1767-136c7e26e122
A2 = area(r)

# ╔═╡ edb95b14-d473-11ea-3a5a-77382d31f941
md"""## Finding the best pizza deal

Let's see if a larger pizza is a better value by calculating the price per area.  There are 4 sizes: small, medium, large, extra large with the following prices:

Size     | Diameter (inches) | Price ($)
:------- | :---------------: | --------:
small    | 9  | 13.10
medium   | 13 | 20.95
large    | 15 | 24.90 
XL       | 17 | 30.95

### 1. How many small pizzas is the same as one XL pizza?

Edit the expression below:
"""

# ╔═╡ 637c26fa-d475-11ea-2c5b-2b0f4775b119
smalls_in_xl = 1

# ╔═╡ 5b07b8fe-d475-11ea-01aa-6b88d6ed8a05
md"""### 2. Calculate the cost per area of each pizza:
"""

# ╔═╡ 3823d09e-d474-11ea-194e-59b5805f303b
small = 13.10 / area(9)

# ╔═╡ 76c11174-d474-11ea-29c5-81856d47cf74
medium = 20.95 / area(13)

# ╔═╡ 8b12d200-d474-11ea-3035-01eccf39f917
large = 24.90 / area(15)

# ╔═╡ 962e6b86-d474-11ea-11a6-a1d11e33ae42
xl = 30.95 / area(17)

# ╔═╡ a42e4eb0-d474-11ea-316a-3d864451bc01
md"Which size of pizza is the best deal?  Write your answer below and assign it to the variable **best_value**."

# ╔═╡ 16ec3f32-d4ff-11ea-20e2-5bc6dd5db083
best_value = small

# ╔═╡ cb419286-d4ff-11ea-1d7f-af5c8574b775
md"""### 3. Is this a good deal?

San Marinos has a special **\"Buy two medium pizzas and save \$5\"**.  Is this a better deal than buying a extra-large pizza?

Calculate the total cost of two medium pizzas deal (saving \$5):"""

# ╔═╡ f147b6cc-d4ff-11ea-05ad-6f5b441e5d1b
two_medium_cost = 20.95 * 1 - 0

# ╔═╡ 0d76d97c-d500-11ea-2433-e96c6fc43b05
md"Calculate the total area of two medium pizzas:"

# ╔═╡ 19eb2a82-d500-11ea-3782-596adc689382
two_medium_area = 1 * area(13)

# ╔═╡ 20a1e9cc-d500-11ea-3d9b-279c71bc20f1
md"Now calculate cost per area by taking the total cost of two medium pizzas and divide by the total area:"

# ╔═╡ 70e85498-d500-11ea-35af-474574f5c011
two_medium_deal = 1

# ╔═╡ 57f024ae-d500-11ea-1cc4-ed28348fdf93
md"""Is it a better deal to get two medium pizzas for \$5 off or to just buy an extra-large?"""

# ╔═╡ 180c8fdc-d503-11ea-04ca-bf2c07fd1c17
md"""### 4. Advanced Problem

A new worker at a pizza shop was getting paid for cutting pizza into pieces.  The pieces of pizza could be any size.  Calculate the maximum number of pieces the worker could make with two cuts of the pizza."""

# ╔═╡ 6494e270-d503-11ea-38a7-df96e7f0a241
cuts2 = 1

# ╔═╡ 92b4a012-d503-11ea-15a2-1f3a446d3284
md"Now what about 3 cuts across the pizza?  What is the maximum number of pieces that can be made with **3 cuts**?"

# ╔═╡ a05aae8e-d506-11ea-190f-57e9ce53b8b9
cuts3 = 1

# ╔═╡ 2eb9a560-d507-11ea-3b8b-9d06678fe131
md"Now, how many pieces can be made with **4 cuts**?"

# ╔═╡ 5a8ede88-d507-11ea-30d9-c99a67243781
cuts4 = 1

# ╔═╡ d1e3dec0-d507-11ea-1213-d37a9325ee2f
md"Are you starting to see a pattern?  Can you figure out a formula for how many pieces of pizza can be made with \"n\" cuts?  Make a table and fill in the number of pieces for a number of cuts and see if you can find the pattern:

Cuts | Pieces
:--- | ------:
0    |   1
1    |   2
2    |   4
3    |   
4    |   
"

# ╔═╡ 97bfd13c-dcc2-11ea-0067-ad8c2c6517fc
md"To get an extra hint, figure out how many slices we can get from **5 cuts**:"

# ╔═╡ bae0cb62-dcc2-11ea-0667-512e1c407d40
cuts5 = 1

# ╔═╡ e0cb2822-dcc2-11ea-2c85-5748bfe526dc
md"Have you found the pattern? Write down the formula below:"

# ╔═╡ f5f89724-d507-11ea-0a93-6d904f36bbe4
function pieces(n)
	return n
end

# ╔═╡ 03249876-d508-11ea-16bb-fd5afed37a1f
md"""##### Let's test your formula!"""

# ╔═╡ bd9f3d24-d509-11ea-165d-3d465a0b4542
md"""Move the slider to change the number of cuts: 

$(@bind n html"<input type=range max=50>")"""

# ╔═╡ b8644fb0-daa6-11ea-1e94-9bf46e7b0fad
hint(text) = Markdown.MD(Markdown.Admonition("hint", "Hint", [text]));

# ╔═╡ 8700d986-d475-11ea-0d0e-790448cf92ba
let
	ans = (pi * (17 / 2)^2) / (pi * (9 / 2)^2)
	if smalls_in_xl == 1
		hint(md"""The diameter of the XL pizza is 17 inches while the diameter of the small pizza is 9 inches.  Use the **area()** function from before to find the area of each and divide them.""")
	elseif smalls_in_xl < ans - 4 * eps(ans)
		md"""Keep trying, your answer is too low."""
	elseif smalls_in_xl > ans + 4 * eps(ans)
		md"""Keep trying, your answer is too high."""
	else
		md"""**Great!** You got it right. Let's move on."""
	end
end

# ╔═╡ 2814a1d4-dcc0-11ea-3d42-f52765e478fe
hint(md"For each extra cut, start out with the solution for the previous number. When you add one extra cut, how many new slices do you get?")

# ╔═╡ 48647ab2-daa5-11ea-0494-ef87be7cbf7c
hint(md"A new cut will create the maximum number of _new slices_ if it intersects all previous cuts.")

# ╔═╡ 8cada086-daa5-11ea-220c-0f660938b604
if cuts5 == 5 + 4 + 3 + 2 + 1 + 1
	hint(md"To get the maximum number of pieces with 5 cuts it will be ``5 + 4 + 3 + 2 + 1``, plus 1 extra for the original pizza with 0 cuts. To find the formula of a sequence of numbers group them like so: ``5 + (4 + 1) + (3 + 2) = 3 * 5``.")
else
	md""
end

# ╔═╡ 4119d19e-dcbc-11ea-3ec8-271e88e1afca
almost(text) = Markdown.MD(Markdown.Admonition("warning", "Almost there!", [text]));

# ╔═╡ 921bba30-dcbc-11ea-13c3-87554722da8a
keep_working(text=md"The answer is not quite right.") = Markdown.MD(Markdown.Admonition("danger", "Keep working on it!", [text]));

# ╔═╡ 5a6d1a8e-dcbc-11ea-272a-6f769c8d309c
correct(text=md"Great! You got the right answer! Let's move on to the next section.") = Markdown.MD(Markdown.Admonition("correct", "Got it!", [text]));

# ╔═╡ 33b1975c-d45c-11ea-035f-ab76e46a31ed
if c == a * b
	correct(md"""**Great!** The value of c = $c.  So you now have a simple computer!
	
	Now go back above and change the value of **a = $a** to **a = $(a + 3)** and press **`Shift-Enter`**.
	What is the new value of **c**?  Notice how all the values get updated in this notebook!
	""")
else
	keep_working()
end

# ╔═╡ f26d50da-d46b-11ea-0c2d-77ca13532b3d
if pizzas == people * avg / slices
	almost(md"Yes that is right! But we should round $pizzas up to an integer, otherwise the restaurant will be confused. 

Try `ceil(...)`!")
elseif pizzas == ceil(people * avg / slices)
	correct(md"Yes that is right, that's a lot of pizza! Excellent, you figured out we need to round up the number of pizzas!")
else
	keep_working()
end

# ╔═╡ 5c4a5f22-d471-11ea-260f-9338d8bfa2d6
if A != pi * r^2
	keep_working(md"Let's fix the above cell before we move on!  Find the formula to calculate the area using **pi** and **r**.")
else
	correct(md"""**Great!**  You figured it out.  Keep going.""")
end

# ╔═╡ a07e5c3e-d476-11ea-308c-718f8f128334
if A2 != pi * (12 / 2)^2
	hint(md"Keep trying to get the right answer.  
	**Hint**: you need to multiply the radius by 2 to convert it into the diameter.")
else
	correct()
end

# ╔═╡ 1ba2c208-d4ff-11ea-0a8e-e75bf7e1c3e6
if !isapprox(best_value, xl)
	hint(md"No need to copy these digits yourself - what should we assign to **best_value**?")
else
	correct()
end

# ╔═╡ 6ae748b2-d503-11ea-1c51-6b2df24fd212
if cuts2 != 4 
	hint(md"The cuts must go all the way across the pizza!")
else
	correct(md"Awesome!")
end

# ╔═╡ a679bddc-d506-11ea-143a-6d4dcd70e918
if cuts3 == 6 
	almost(md"""Close but not quite. Who said that pizza slices need to look like pizza slices?""")
elseif cuts3 == 7
	correct(md"You got it right.  Now for something harder...")
else
	hint(md"Try drawing it out on a piece of paper.")
end

# ╔═╡ 5df7eefc-d507-11ea-0d1f-45b224a04774
if cuts4 == 11
	correct(md"That was a tough question.  How did you figure it out?  You tried hard.")
elseif cuts4 < 10
	hint(md"Draw it out on a piece of paper.  You can make more pieces with 4 cuts.")
elseif cuts4 < 11
	hint(md"Getting close but you can make more pieces with 4 cuts.")
else
	hint(md"That is too high. Only straight lines!")
end

# ╔═╡ e80986c6-d509-11ea-12e3-f79a54b5ab31
if pieces(n) ==  n * (n + 1) / 2 + 1
	md"""_Testing..._
	
	**For $n cuts, you predict $(pieces(n)) pieces.**
	
	$(correct(md"Well done!"))"""
else
	md"""_Testing..._
	
	**For $n cuts, you predict $(pieces(n)) pieces.**
	
	$(keep_working(md"The answer should be $(Int(n*(n+1)/2+1))."))"""
end

# ╔═╡ Cell order:
# ╟─03664f5c-d45c-11ea-21b6-91cd647a07aa
# ╠═14158eb0-d45c-11ea-088f-330e45412320
# ╠═2ed4bb92-d45c-11ea-0b31-2d8e32ce7b44
# ╟─e5e0a0da-d45c-11ea-1042-e9b5d0654d4f
# ╠═30f0f882-d45c-11ea-2adc-7d84ecf8a7a6
# ╟─33b1975c-d45c-11ea-035f-ab76e46a31ed
# ╟─a38cb92e-d45e-11ea-2959-05be909befb2
# ╠═262b312a-d460-11ea-26c5-df30459effc5
# ╠═2ea7f162-d460-11ea-0e8e-25340e2e64da
# ╠═3da812c6-d460-11ea-0170-79fbb6a4347c
# ╟─4dff4b5e-d461-11ea-29c8-d548fdb5f08b
# ╠═444e2fa4-d460-11ea-12aa-57e0576c2d66
# ╟─f26d50da-d46b-11ea-0c2d-77ca13532b3d
# ╟─d9c31dfa-d470-11ea-23b2-838975b71f7c
# ╠═3c12f2b4-d471-11ea-2d37-539f061f7cf2
# ╠═50f0f6d6-d471-11ea-304e-8f72e7ef9d7e
# ╟─5c4a5f22-d471-11ea-260f-9338d8bfa2d6
# ╟─f907e46a-d471-11ea-07e5-f30e2aab3d08
# ╠═cb36a9ee-d472-11ea-1835-bf7963137e18
# ╟─d9575e9c-d472-11ea-1eda-2d335d039f28
# ╠═04b010c0-d473-11ea-1767-136c7e26e122
# ╟─a07e5c3e-d476-11ea-308c-718f8f128334
# ╟─edb95b14-d473-11ea-3a5a-77382d31f941
# ╠═637c26fa-d475-11ea-2c5b-2b0f4775b119
# ╟─8700d986-d475-11ea-0d0e-790448cf92ba
# ╟─5b07b8fe-d475-11ea-01aa-6b88d6ed8a05
# ╠═3823d09e-d474-11ea-194e-59b5805f303b
# ╠═76c11174-d474-11ea-29c5-81856d47cf74
# ╠═8b12d200-d474-11ea-3035-01eccf39f917
# ╠═962e6b86-d474-11ea-11a6-a1d11e33ae42
# ╟─a42e4eb0-d474-11ea-316a-3d864451bc01
# ╠═16ec3f32-d4ff-11ea-20e2-5bc6dd5db083
# ╟─1ba2c208-d4ff-11ea-0a8e-e75bf7e1c3e6
# ╟─cb419286-d4ff-11ea-1d7f-af5c8574b775
# ╠═f147b6cc-d4ff-11ea-05ad-6f5b441e5d1b
# ╟─0d76d97c-d500-11ea-2433-e96c6fc43b05
# ╠═19eb2a82-d500-11ea-3782-596adc689382
# ╟─20a1e9cc-d500-11ea-3d9b-279c71bc20f1
# ╠═70e85498-d500-11ea-35af-474574f5c011
# ╟─57f024ae-d500-11ea-1cc4-ed28348fdf93
# ╟─180c8fdc-d503-11ea-04ca-bf2c07fd1c17
# ╠═6494e270-d503-11ea-38a7-df96e7f0a241
# ╟─6ae748b2-d503-11ea-1c51-6b2df24fd212
# ╟─92b4a012-d503-11ea-15a2-1f3a446d3284
# ╠═a05aae8e-d506-11ea-190f-57e9ce53b8b9
# ╟─a679bddc-d506-11ea-143a-6d4dcd70e918
# ╟─2eb9a560-d507-11ea-3b8b-9d06678fe131
# ╠═5a8ede88-d507-11ea-30d9-c99a67243781
# ╟─5df7eefc-d507-11ea-0d1f-45b224a04774
# ╟─d1e3dec0-d507-11ea-1213-d37a9325ee2f
# ╟─2814a1d4-dcc0-11ea-3d42-f52765e478fe
# ╟─48647ab2-daa5-11ea-0494-ef87be7cbf7c
# ╟─97bfd13c-dcc2-11ea-0067-ad8c2c6517fc
# ╠═bae0cb62-dcc2-11ea-0667-512e1c407d40
# ╟─8cada086-daa5-11ea-220c-0f660938b604
# ╟─e0cb2822-dcc2-11ea-2c85-5748bfe526dc
# ╠═f5f89724-d507-11ea-0a93-6d904f36bbe4
# ╟─03249876-d508-11ea-16bb-fd5afed37a1f
# ╟─bd9f3d24-d509-11ea-165d-3d465a0b4542
# ╟─e80986c6-d509-11ea-12e3-f79a54b5ab31
# ╟─b8644fb0-daa6-11ea-1e94-9bf46e7b0fad
# ╟─4119d19e-dcbc-11ea-3ec8-271e88e1afca
# ╟─921bba30-dcbc-11ea-13c3-87554722da8a
# ╟─5a6d1a8e-dcbc-11ea-272a-6f769c8d309c
