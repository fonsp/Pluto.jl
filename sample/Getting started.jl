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

# ╔═╡ b129ba7c-953a-11ea-3379-17adae34924c
md"# _Welcome to Pluto!_

Pluto is a programming environment for _Julia_, designed to be **interactive** and **helpful**. 

In this introduction, we will go through the basics of using Pluto. To make it interesting, this notebook does something special: it **changes while you work on it**. Computer magic ✨"

# ╔═╡ 4d88b926-9543-11ea-293a-1379b1b5ae64
md"## Cats
Let's say you're like my grandma, and you have a lot of cats. Our story will be about them."

# ╔═╡ 3e8e381e-953f-11ea-3d3e-71d0fea52560
cat = "Ks*;lj"

# ╔═╡ aeb3a6bc-9540-11ea-0b8f-6d37412bfe68
if cat == "Ks*;lj"
	md"Oh no! Someone messed with my pretty introduction. Change the code above to give our cat a proper name!"
else
	HTML("""<p><b>Well done, your cat is called $cat now.</b> This text gets updated every time you change the name. To see how the magic works, click on the <img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/eye-outline.svg" style="width: 1em; height: 1em; margin-bottom: -.2em;"> to the left of this text.</p>""")
end

# ╔═╡ 611c28fa-9542-11ea-1751-fbdedcfb7690
html"""<p>To edit any code, just click on it. When you're done programming, press the <img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/caret-forward-circle-outline.svg" style="width: 1em; height: 1em; margin-bottom: -.2em;"> in the lower-right corner of a cell to run the code. You can also use `Shift+Enter` if you are in a hurry.</p>"""

# ╔═╡ 6f7eecec-9543-11ea-1284-dd52fce3ecca
md"I feel like our cat needs a friend. Let's call them $(friend)."

# ╔═╡ a1a20314-9543-11ea-17de-0b658da18992
if !@isdefined friend
	md"Uh oh, what is this? I forgot to add a cell defining our friend. Can you do it for me?"
else
	md"**Well done!** $cat and $friend are both happy with your performance."
end

# ╔═╡ f112b662-9543-11ea-3dcb-2906a99b2188
html"""<p>A cell is a container for code & output. To add one, click on the <img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/add-outline.svg" style="width: 1em; height: 1em; margin-bottom: -.2em;"> above or below another cell. You can do it wherever you like. After you're done writing code in your cell, remember to run it!</p>"""

# ╔═╡ e0642f42-9545-11ea-14ee-fde52cb54ccc
md"## Feeding neighbors
Our cats have some neighbors. Let's involve them in the story too!"

# ╔═╡ 3653b1ac-9546-11ea-2a44-ddd3054636fe
neighbors = [cat, friend, "Smerfetka", "Latte"]

# ╔═╡ 19ff8d36-9547-11ea-0e08-e5cdd8338673
md"Now, if you're like my grandma, you're feeding the entire neighborhood by yourself. Let's see how many cans of cat food you need to prepare."

# ╔═╡ 270ac49e-9549-11ea-3ffd-71ddaee9f134
md"But what does `confusing_function` do? If you ever need help, click on 📚 **Live docs** in the lower right, and then place your cursor on the code you need help with. 

If you don't see it, then your screen is too small! Maybe you need to zoom out?"

# ╔═╡ 745a4584-954a-11ea-028e-59011f268ec6
cans_in_stock = "🥫🥫🥫🥫"

# ╔═╡ 55ad7422-954e-11ea-0a33-a3b03febb56e
if @isdefined cans_in_stock
	md"Actually, I have a hunch there will be another cat coming. Uncomment the code below (remove the #) to add one more can. Remember to run it after making the change!"
else
	md"**Whoopsie!** Because Pluto figures out execution order for you, it doesn't really make sense to assign to the same variable twice. A smarter way to plan ahead is to write `cans_in_stock = consumption` — Pluto will take care of updating everything."
end

# ╔═╡ eac62fea-954e-11ea-2768-39ce6f4059ab
# cans_in_stock = "🥫🥫🥫🥫🥫"

# ╔═╡ 6c8e2108-9550-11ea-014d-235770ed4771
md"## Saving cats and notebooks
Alright, we have a neighborhood full of well-fed cats. But oh no, here comes..."

# ╔═╡ 9e89fc9a-9550-11ea-14b4-7f0e96225ec0
scary_dog = "Piesio"

# ╔═╡ bdd5d268-9550-11ea-1046-31efedc36872
if @isdefined scary_dog
	md" $scary_dog is terrorizing the neighborhood! We must do something about it!"
else
	md"You saved the neighborhood! Referencing `scary_dog` leads to an `UndefVarError`, as if it never even existed."
end

# ╔═╡ 36cd006a-9551-11ea-3c0c-df8b7f2843c1
HTML("""<p>To delete a cell like the one defining $scary_dog, click on the <img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/close-circle-outline.svg" style="width: 1em; height: 1em; margin-bottom: -.2em;"> on the right of its code.</p>""")

# ╔═╡ fb4e471c-9551-11ea-1ab5-41bbd5de76b8
md"""
Speaking of saving, this notebook is autosaved whenever you change something. The default location for new notebooks is $(joinpath(first(DEPOT_PATH), "pluto_notebooks")), you can find it using your file explorer. To change the name or the directory of a notebook, scroll to the top - you enter the notebook's path next to the Pluto logo.
"""

# ╔═╡ 9d3af596-9554-11ea-21bd-bf427c91c424
md"## ⚡ Pluto power ⚡
Oof, that dog situation was intense. Let's give our cats superpowers to make sure it never happens again!"

# ╔═╡ 3150bf1a-9555-11ea-306f-0fd4d9229a51
md"Remember learning HTML in junior high? Now you can use it for something! Pluto lets you `@bind` variables to HTML elements. As always, every time you change something, Pluto knows what to update!"

# ╔═╡ f2c79746-9554-11ea-39ca-298fd09248ad
@bind power_level html"<input type='range'>"

# ╔═╡ 0b094cea-9556-11ea-268e-0d270fd04d56
md"The power level is $power_level, but we should do more than just say it - let's equip our cats with $power_level emoji!"

# ╔═╡ 1908f9f2-9557-11ea-2abd-dd52f8d776f4
power_emoji = "⚡"
power = repeat(power_emoji, power_level)

# ╔═╡ 784b1774-9557-11ea-315e-d1ea277ce0fd
if !@isdefined power
	md"Uh oh! Pluto doesn't support multiple expressions per cell. This is a conscious choice - this restriction helps you write less buggy code once you get used to it. To fix the code, you can either split the above cell, or wrap it in a `begin ... end` block. Both work."
else
	md"**Well done!** Your cats have powers now."
end

# ╔═╡ 5edadcd2-9554-11ea-1714-b5b7692c4797
html"""<p>We're almost done! It's time to share your amazing story. Scroll to the top of the notebook, and click on <img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/shapes-outline.svg" style="width: 1em; height: 1em; margin-bottom: -.2em;"> to see the export options - or you can always share this notebook's save file. (The file is pure Julia, by the way, and it's runnable! You'll learn more about this in the advanced introduction.)</p>"""

# ╔═╡ 4634c856-9553-11ea-008d-3539195970ea
md"## Final notes"

# ╔═╡ 4d0ebb46-9553-11ea-3431-2d203f594815
md"If anything about this introduction left you confused, something doesn't work, or you have a cool new idea - don't hesitate to contact us! You can do it right from this screen, using the `Instant feedback` form in the bottom right."

# ╔═╡ d736e096-9553-11ea-3ba5-277afde1afe7
md"Also, if you were wondering where `confusing_function` came from, here you go! Remember that you, too, can place code wherever you like."

# ╔═╡ 7366f1b6-954c-11ea-3f68-b12444c902c3
"""
confusing_function(text::String, array::Array)

Repeats the `text` as many times as there are elements in `array`.
"""
confusing_function(text::String, array::Array) = repeat(text, length(array))

# ╔═╡ a4a60262-9547-11ea-3a81-5bf7f9ee5d16
consumption = confusing_function("🥫", neighbors)

# ╔═╡ e11e1660-9549-11ea-22f6-8bb53dc045fe
md"Now we know to prepare $(length(consumption)) cans. Let's stock up!"

# ╔═╡ f27f90c2-954f-11ea-3f93-17acb2ce4280
md"We have $(length(cans_in_stock)) cans of cat food, and our cats need $(length(consumption)). Try adding another cat to the neighborhood to see what changes!"

# ╔═╡ 1deaaf36-9554-11ea-3dae-85851f73dbc6
md"**Have fun using Pluto!**

_~ Fons van der Plas & Nicholas Bochenski_"

# ╔═╡ Cell order:
# ╟─b129ba7c-953a-11ea-3379-17adae34924c
# ╟─4d88b926-9543-11ea-293a-1379b1b5ae64
# ╠═3e8e381e-953f-11ea-3d3e-71d0fea52560
# ╟─aeb3a6bc-9540-11ea-0b8f-6d37412bfe68
# ╟─611c28fa-9542-11ea-1751-fbdedcfb7690
# ╠═6f7eecec-9543-11ea-1284-dd52fce3ecca
# ╟─a1a20314-9543-11ea-17de-0b658da18992
# ╟─f112b662-9543-11ea-3dcb-2906a99b2188
# ╟─e0642f42-9545-11ea-14ee-fde52cb54ccc
# ╠═3653b1ac-9546-11ea-2a44-ddd3054636fe
# ╟─19ff8d36-9547-11ea-0e08-e5cdd8338673
# ╠═a4a60262-9547-11ea-3a81-5bf7f9ee5d16
# ╟─270ac49e-9549-11ea-3ffd-71ddaee9f134
# ╟─e11e1660-9549-11ea-22f6-8bb53dc045fe
# ╠═745a4584-954a-11ea-028e-59011f268ec6
# ╟─55ad7422-954e-11ea-0a33-a3b03febb56e
# ╠═eac62fea-954e-11ea-2768-39ce6f4059ab
# ╟─f27f90c2-954f-11ea-3f93-17acb2ce4280
# ╟─6c8e2108-9550-11ea-014d-235770ed4771
# ╠═9e89fc9a-9550-11ea-14b4-7f0e96225ec0
# ╟─bdd5d268-9550-11ea-1046-31efedc36872
# ╟─36cd006a-9551-11ea-3c0c-df8b7f2843c1
# ╟─fb4e471c-9551-11ea-1ab5-41bbd5de76b8
# ╟─9d3af596-9554-11ea-21bd-bf427c91c424
# ╟─3150bf1a-9555-11ea-306f-0fd4d9229a51
# ╠═f2c79746-9554-11ea-39ca-298fd09248ad
# ╟─0b094cea-9556-11ea-268e-0d270fd04d56
# ╠═1908f9f2-9557-11ea-2abd-dd52f8d776f4
# ╟─784b1774-9557-11ea-315e-d1ea277ce0fd
# ╟─5edadcd2-9554-11ea-1714-b5b7692c4797
# ╟─4634c856-9553-11ea-008d-3539195970ea
# ╟─4d0ebb46-9553-11ea-3431-2d203f594815
# ╟─d736e096-9553-11ea-3ba5-277afde1afe7
# ╟─7366f1b6-954c-11ea-3f68-b12444c902c3
# ╟─1deaaf36-9554-11ea-3dae-85851f73dbc6
