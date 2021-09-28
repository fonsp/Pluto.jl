### A Pluto.jl notebook ###
# v0.15.0

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

# ╔═╡ 571613a1-6b4b-496d-9a68-aac3f6a83a4b
using PlutoUI, HypertextLiteral

# ╔═╡ 97914842-76d2-11eb-0c48-a7eedca870fb
md"""
# Using _JavaScript_ inside Pluto

You have already seen that Pluto is designed to be _interactive_. You can make fantastic explorable documents using just the basic inputs provided by PlutoUI, together with the wide range of visualization libraries that Julia offers.

_However_, if you want to take your interactive document one step further, then Pluto offers a great framework for **combining Julia with HTML, CSS and _JavaScript_**.
"""

# ╔═╡ 168e13f7-2ff2-4207-be56-e57755041d36
md"""
## Prerequisites

This document assumes that you have used HTML, CSS and JavaScript before in another context. If you know Julia, and you want to add these web languages to your skillset, we encourage you to do so! It will be useful knowledge, also outside of Pluto.

"""

# ╔═╡ 28ae1424-67dc-4b76-a172-1185cc76cb59
html"""

<article class="learning">
	<h4>
		Learning HTML and CSS
	</h4>
	<p>
		It is easy to learn HTML and CSS because they are not 'programming languages' like Julia and JavaScript, they are <em>markup languages</em>: there are no loops, functions or arrays, you only <em>declare</em> how your document is structured (HTML) and what that structure looks like on a 2D color display (CSS).
	</p>
	<p>
		As an example, this is what this cell looks like, written in HTML and CSS:
	</p>
</article>


<style>

	article.learning {
		background: #fde6ea9c;
		padding: 1em;
		border-radius: 5px;
	}

	article.learning h4::before {
		content: "☝️";
	}

	article.learning p::first-letter {
		font-size: 1.5em;
		font-family: cursive;
	}

</style>
"""

# ╔═╡ ea39c63f-7466-4015-a66c-08bd9c716343
md"""
> My personal favourite resource for learning HTML and CSS is the [Mozilla Developer Network (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS). 
> 
> _-fons_
"""

# ╔═╡ 8b082f9a-073e-4112-9422-4087850fc89e
md"""
#### Learning JavaScript
After learning HTML and CSS, you can already spice up your Pluto notebooks but creating custom layouts, generated dynamically from Julia data. To take things to the next level, you can learn JavaScript. We recommend using an online resource for this. 

> My personal favourite is [javascript.info](https://javascript.info/), a high-quality, open source tutorial. I use it too!
> 
> _-fons_

It is hard to say whether it is easy to _learn JavaScript using Pluto_. On one hand, we highly recommend the high-quality public learning material that already exists for JavaScript, which is generally written in the context of writing traditional web apps. On the other hand, if you have a specific Pluto-related project in mind, then this could be a great motivator to continue learning!

A third option is to learn JavaScript using [observablehq.com](https://observablehq.com), an online reactive notebook for JavaScript (it's awesome!). Pluto's JavaScript runtime is designed to be very close to the way you write code in observable, so the skills you learn there will be transferable!

If you chose to learn JavaScript using Pluto, let me know how it went, and how we can improve! [fons@plutojl.org](mailto:fons@plutojl.org)
"""

# ╔═╡ d70a3a02-ef3a-450f-bf5a-4a0d7f6262e2
TableOfContents()

# ╔═╡ 5c5d2489-e48b-432f-94f8-b15333134e24
md"""
# Essentials

## Custom `@bind` output
"""

# ╔═╡ 75e1a973-7ef0-4ac5-b3e2-5edb63577927
md"""
**You can use JavaScript to write input widgets.** The `input` event can be triggered on any object using

```javascript
obj.value = ...
obj.dispatchEvent(new CustomEvent("input"))
```

For example, here is a button widget that will send the number of times it has been clicked as the value:

"""

# ╔═╡ e8d8a60e-489b-467a-b49c-1fa844807751
ClickCounter(text="Click") = @htl("""
<div>
<button>$(text)</button>

<script>

	// Select elements relative to `currentScript`
	var div = currentScript.parentElement
	var button = div.querySelector("button")

	// we wrapped the button in a `div` to hide its default behaviour from Pluto

	var count = 0

	button.addEventListener("click", (e) => {
		count += 1

		// we dispatch the input event on the div, not the button, because 
		// Pluto's `@bind` mechanism listens for events on the **first element** in the
		// HTML output. In our case, that's the div.

		div.value = count
		div.dispatchEvent(new CustomEvent("input"))
		e.preventDefault()
	})

	// Set the initial value
	div.value = count

</script>
</div>
""")

# ╔═╡ 9346d8e2-9ba0-4475-a21f-11bdd018bc60
@bind num_clicks ClickCounter()

# ╔═╡ 7822fdb7-bee6-40cc-a089-56bb32d77fe6
num_clicks

# ╔═╡ 701de4b8-42d3-46a3-a399-d7761dccd83d
md"""
As an exercise to get familiar with these techniques, you can try the following:
- 👉 Add a "reset to zero" button to the widget above.
- 👉 Make the bound value an array that increases size when you click, instead of a single number.
- 👉 Create a "two sliders" widget: combine two sliders (`<input type=range>`) into a single widget, where the bound value is the two-element array with both values.
- 👉 Create a "click to send" widget: combine a text input and a button, and only send the contents of the text field when the button is clicked, not on every keystroke.

Questions? Ask them on our [GitHub Discussions](https://github.com/fonsp/Pluto.jl/discussions)!
"""

# ╔═╡ 88120468-a43d-4d58-ac04-9cc7c86ca179
md"""
## Debugging

The HTML, CSS and JavaScript that you write run in the browser, so you should use the [browser's built-in developer tools](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_are_browser_developer_tools) to debug your code. 
"""

# ╔═╡ ea4b2da1-4c83-4a1f-8fc3-c71a120e58e1
html"""

<script>

console.info("Can you find this message in the console?")

</script>

"""

# ╔═╡ 08bdeaff-5bfb-49ab-b4cc-3a3446c63edc
@htl("""
	<style>
	.cool-class {
		font-size: 1.3rem;
		color: purple;
		background: lightBlue;
		padding: 1rem;
		border-radius: 1rem;
	}
	
	
	</style>
	
	<div class="cool-class">Can you find out which CSS class this is?</div>
	""")

# ╔═╡ 9b6b5da9-8372-4ebf-9c66-ae9fcfc45d47
md"""
## Selecting elements

When writing the javascript code for a widget, it is common to **select elements inside the widgets** to manipulate them. In the number-of-clicks example above, we selected the `<div>` and `<button>` elements in our code, to trigger the input event, and attach event listeners, respectively.

There are a numbers of ways to do this, and the recommended strategy is to **create a wrapper `<div>`, and use `currentScript.parentElement` to select it**.

### `currentScript`

When Pluto runs the code inside `<script>` tags, it assigns a reference to that script element to a variable called `currentScript`. You can then use properties like `previousElementSibling` or `parentElement` to "navigate to other elements".

Let's look at the "wrapper div strategy" again.

```htmlmixed
@htl("\""

<!-- the wrapper div -->
<div>

	<button id="first">Hello</button>
	<button id="second">Julians!</button>
	
	<script>
		var wrapper_div = currentScript.parentElement
		// we can now use querySelector to select anything we want
		var first_button = wrapper_div.querySelector("button#first")

		console.log(first_button)
	</script>
</div>
"\"")
```
"""

# ╔═╡ f18b98f7-1e0f-4273-896f-8a667d15605b
md"""
#### Why not just select on `document.body`?

In the example above, it would have been easier to just select the button directly, using:
```javascript
// ⛔ do no use:
var first_button = document.body.querySelector("button#first")
```

However, this becomes a problem when **combining using the widget multiple times in the same notebook**, since all selectors will point to the first instance. 

Similarly, try not to search relative to the `<pluto-cell>` or `<pluto-output>` element, because users might want to combine multiple instances of the widget in a single cell.
"""

# ╔═╡ 4a3398be-ee86-45f3-ac8b-f627a38c00b8
md"""
## Interpolation

Julia has a nice feature: _string interpolation_:
"""

# ╔═╡ 2d5fd611-284b-4428-b6a5-8909203990b9
who = "🌍"

# ╔═╡ 82de4674-9ecc-46c4-8a57-0b4453c579c3
"Hello $(who)!"

# ╔═╡ 70a415be-881a-4c01-9f8c-635b8b89e1ad
md"""
With some (frustrating) exceptions, you can also interpolate into Markdown literals:
"""

# ╔═╡ 730a692f-2bf2-4d5b-86da-6ab861e8b8ac
md"""
Hello $(who)!
"""

# ╔═╡ a45fdec4-2d4b-429b-b809-4c256b57fffe
md"""
**However**, you cannot interpolate into an `html"` string:
"""

# ╔═╡ c68ebd7b-5fb6-4527-ac34-33f9730e4587
html"""
<p>Hello $(who)!</p>
"""

# ╔═╡ 8c03139f-a94b-40cc-859f-0d86f1c72143
md"""

😢 For this feature, we highly recommend the new package [HypertextLiteral.jl](https://github.com/MechanicalRabbit/HypertextLiteral.jl), which has an `@htl` macro that supports interpolation:


### Interpolating into HTML -- HypertextLiteral.jl
"""

# ╔═╡ d8dcb044-0ac8-46d1-a043-1073bb6d1ff1
@htl("""
	<p> Hello $(who)!</p>
	""")

# ╔═╡ e7d3db79-8253-4cbd-9832-5afb7dff0abf
cool_features = [
	md"Interpolate any **HTML-showable object**, such as plots and images, or another `@htl` literal."
	md"Interpolated lists are expanded _(like in this cell!)_."
	"Easy syntax for CSS"
	]

# ╔═╡ bf592202-a9a4-4e9b-8433-fed55e3aa3bc
@htl("""
	<p>It has a bunch of very cool features! Including:</p>
	<ul>$([
		@htl(
			"<li>$(item)</li>"
		)
		for item in cool_features
	])</ul>
	""")

# ╔═╡ 5ac5b984-8c02-4b8d-a342-d0f05f7909ec
md"""
#### Why not just `HTML(...)`?

You might be thinking, why don't we just use the `HTML` function, together with string interpolation? The main problem is correctly handling HTML _escaping rules_. For example:
"""

# ╔═╡ ef28eb8d-ec98-43e5-9012-3338c3b84f1b
cool_elements = "<div> and <marquee>"

# ╔═╡ 1ba370cc-3631-47ea-9db5-75587e8e4ff3
HTML("""
<h6> My favourite HTML elements are $(cool_elements)!</h6>
""")

# ╔═╡ 7fcf2f3f-d902-4338-adf0-8ef181e79420
@htl("""
<h6> My favourite HTML elements are $(cool_elements)!</h6>
""")

# ╔═╡ 7afbf8ef-e91c-45b9-bf22-24201cbb4828
md"""
### Interpolating into JS -- _HypertextLiteral.jl_

As we see above, using HypertextLiteral.jl, we can interpolate objects (numbers, string, images) into HTML output, great! Next, we want to **interpolate _data_ into _scripts_**. Although you could use `JSON.jl`, HypertextLiteral.jl actually has this abality built-in! 

> When you **interpolate Julia objects into a `<script>` tag** using the `@htl` macro, it be converted to a JS object _automatically_. 
"""

# ╔═╡ b226da72-9512-4d14-8582-2f7787c25028
simple_data = (msg="Hello! ", times=3)

# ╔═╡ a6fd1f7b-a8fc-420d-a8bb-9f549842ad3e
@htl("""
	<script>

	// interpolate the data 🐸
	const data = $(simple_data)

	const span = document.createElement("span")
	span.innerText = data.msg.repeat(data.times)
	
	return span
	</script>
""")

# ╔═╡ 965f3660-6ec4-4a86-a2a2-c167dbe9315f
md"""
**Let's look at a more exciting example:**
"""

# ╔═╡ 00d97588-d591-4dad-9f7d-223c237deefd
@bind fantastic_x Slider(0:400)

# ╔═╡ 01ce31a9-6856-4ee7-8bce-7ce635167457
my_data = [
	(name="Cool", coordinate=[100, 100]),
	(name="Awesome", coordinate=[200, 100]),
	(name="Fantastic!", coordinate=[fantastic_x, 150]),
]

# ╔═╡ 21f57310-9ceb-423c-a9ce-5beb1060a5a3
@htl("""
	<script src="https://cdn.jsdelivr.net/npm/d3@6.2.0/dist/d3.min.js"></script>

	<script>

	// interpolate the data 🐸
	const data = $(my_data)

	const svg = DOM.svg(600,200)
	const s = d3.select(svg)

	s.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", d => d.coordinate[0])
		.attr("y", d => d.coordinate[1])
		.text(d => d.name)

	return svg
	</script>
""")

# ╔═╡ 7d9d6c28-131a-4b2a-84f8-5c085f387e85
md"""
#### Future: directly embedding data

In the future, you will be able to embed data directly into JavaScript, using Pluto's built-in, optimized data transfer. See [the Pull Request](https://github.com/fonsp/Pluto.jl/pull/1124) for more info.
"""

# ╔═╡ d83d57e2-4787-4b8d-8669-64ed73d79e73
md"""
## Script loading

To use external javascript dependencies, you can load them from a CDN, such as:
- [jsdelivr.com](https://www.jsdelivr.com/)
- [skypack.dev](https://www.skypack.dev/)

Just like when writing a browser app, there are two ways to import JS dependencies: a `<script>` tag, and the more modern ES6 import.

### Loading method 1: ES6 imports

we recommend that you use an [**ES6 import**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) if the library supports it.


##### Awkward note about syntax

Normally, you can import libraries inside JS using the import syntax:
```javascript
import confetti from 'https://cdn.skypack.dev/canvas-confetti'
import { html, render, useEffect } from "https://cdn.jsdelivr.net/npm/htm@3.0.4/preact/standalone.mjs"
```

In Pluto, this is [currently not yet supported](https://github.com/fonsp/Pluto.jl/issues/992), and you need to use a different syntax as workaround:
```javascript
const { default: confetti } = await import("https://cdn.skypack.dev/canvas-confetti@1")
const { html, render, useEffect } = await import( "https://cdn.jsdelivr.net/npm/htm@3.0.4/preact/standalone.mjs")
```
"""

# ╔═╡ 077c95cf-2a1b-459f-830e-c29c11a2c5cc
md"""

### Loading method 2: script tag

`<script src="...">` tags with a `src` attribute set, like this tag to import the d3.js library:

```css
<script src="https://cdn.jsdelivr.net/npm/d3@6.2.0/dist/d3.min.js"></script>
```

will work as expected. The execution of other script tags within the same cell is delayed until a `src` script finished loading, and Pluto will make sure that every source file is only loaded once.
"""

# ╔═╡ 8388a833-d535-4cbd-a27b-de323cea60e8
md"""
# Advanced
"""

# ╔═╡ 4cf27df3-6a69-402e-a71c-26538b2a52e7
md"""
## Script output & `observablehq/stdlib`

Pluto's original inspiration was [observablehq.com](https://observablehq.com/), and online reactive notebook for JavaScript. _(It's REALLY good, try it out!)_ We design Pluto's JavaScript runtime to be close to the way you write code in observable.

Read more about the observable runtime in their (interactive) [documentation](https://observablehq.com/@observablehq/observables-not-javascript). The following is also true for JavaScript-inside-scripts in Pluto:
- ⭐️ If you return an HTML node, it will be displayed.
- ⭐️ The [`observablehq/stdlib`](https://observablehq.com/@observablehq/stdlib) library is pre-imported, you can use `DOM`, `html`, `Promises`, etc.
- ⭐️ When a cell re-runs reactively, `this` will be set to the previous output (with caveat, see the later section)
- The variable `invalidation` is a Promise that will get resolved when the cell output is changed or removed. You can use this to remove event listeners, for example.
- You can use top-level `await`, and a returned HTML node will be displayed when ready.
- Code is run in "strict mode", use `let x = 1` instead of `x = 1`.

The following is different in Pluto:
- JavaScript code is not reactive, there are no global variables.
- Cells can contain multiple script tags, and they will run consecutively (also when using `await`)
- We do not (yet) support async generators, i.e. `yield`.
- We do not support the observable keywords `viewof` and `mutable`.
"""

# ╔═╡ 5721ad33-a51a-4a91-adb2-0915ea0efa13
md"""
### Example: 
"""

# ╔═╡ 846354c8-ba3b-4be7-926c-d3c9cc9add5f
films = [
	(title="Frances Ha", director="Noah Baumbach", year=2012),
	(title="Portrait de la jeune fille en feu", director="Céline Sciamma", year=2019),
	(title="De noorderlingen", director="Alex van Warmerdam", year=1992),
];

# ╔═╡ c857bb4b-4cf4-426e-b340-592cf7700434
@htl("""
	<script>
	
	let data = $(films)
	
	// html`...` is from https://github.com/observablehq/stdlib
	// note the escaped dollar signs:
	let Film = ({title, director, year}) => html`
		<li class="film">
			<b>\${title}</b> by <em>\${director}</em> (\${year})
		</li>
	`
	
	// the returned HTML node is rendered
	return html`
		<ul>
			\${data.map(Film)}
		</ul>
	`
	
	</script>
	""")

# ╔═╡ a33c7d7a-8071-448e-abd6-4e38b5444a3a
md"""
## Stateful output with `this`

Just like in observablehq, if a cell _re-runs reactively_, then the javascript variable `this` will take the value of the last thing that was returned by the script. If the cell runs for the first time, then `this == undefined`. In particular, if you return an HTML node, and the cell runs a second time, then you can access the HTML node using `this`. Two reasons for using this feature are:
- Stateful output: you can persist some state inbetween re-renders. 
- Performance: you can 'recycle' the previous DOM and update it partially (using d3, for example). _When doing so, Pluto guarantees that the DOM node will always be visible, without flicker._

##### 'Re-runs reactively'?
With this, we mean that the Julia cell re-runs not because of user input (Ctrl+S, Shift+Enter or clicking the play button), but because it was triggered by a variable reference.

##### ☝️ Caveat
This feature is **only enabled** for `<script>` tags with the `id` attribute set, e.g. `<script id="first">`. Think of setting the `id` attribute as saying: "I am a Pluto script". There are two reasons for this:
- One Pluto cell can output multiple scripts, Pluto needs to know which output to assign to which script.
- Some existing scripts assume that `this` is set to `window` in toplevel code (like in the browser). By hiding the `this`-feature behind this caveat, we still support libraries that output such scripts.

"""

# ╔═╡ 91f3dab8-5521-44a0-9890-8d988a994076
trigger = "edit me!"

# ╔═╡ dcaae662-4a4f-4dd3-8763-89ea9eab7d43
let
	trigger
	
	html"""
	<script id="something">
	
	console.log("'this' is currently:", this)

	if(this == null) {
		return html`<blockquote>I am running for the first time!</blockqoute>`
	} else {
		return html`<blockquote><b>I was triggered by reactivity!</b></blockqoute>`
	}


	</script>
	"""
end

# ╔═╡ e77cfefc-429d-49db-8135-f4604f6a9f0b
md"""
### Example: d3.js transitions

Type the coordinates of the circles here! 
"""

# ╔═╡ 2d5689f5-1d63-4b8b-a103-da35933ad26e
@bind positions TextField(default="100, 300")

# ╔═╡ 6dd221d1-7fd8-446e-aced-950512ea34bc
dot_positions = try
	parse.([Int], split(replace(positions, ',' => ' ')))
catch e
	[100, 300]
end

# ╔═╡ 0a9d6e2d-3a41-4cd5-9a4e-a9b76ed89fa9
# dot_positions = [100, 300] # edit me!

# ╔═╡ 0962d456-1a76-4b0d-85ff-c9e7dc66621d
md"""
Notice that, even though the cell below re-runs, we **smoothly transition** between states. We use `this` to maintain the d3 transition states inbetween reactive runs.
"""

# ╔═╡ bf9b36e8-14c5-477b-a54b-35ba8e415c77
@htl("""
<script src="https://cdn.jsdelivr.net/npm/d3@6.2.0/dist/d3.min.js"></script>

<script id="hello">

const positions = $(dot_positions)
	
const svg = this == null ? DOM.svg(600,200) : this
const s = this == null ? d3.select(svg) : this.s

s.selectAll("circle")
	.data(positions)
	.join("circle")
    .transition()
    .duration(300)
	.attr("cx", d => d)
	.attr("cy", 100)
	.attr("r", 10)
	.attr("fill", "gray")


const output = svg
output.s = s
return output
</script>

""")

# ╔═╡ 781adedc-2da7-4394-b323-e508d614afae
md"""
### Example: Preact with persistent state
"""

# ╔═╡ de789ad1-8197-48ae-81b2-a21ec2340ae0
md"""
Modify `x`, add and remove elements, and notice that preact maintains its state.
"""

# ╔═╡ 85483b28-341e-4ed6-bb1e-66c33613725e
x = ["hello pluton!", 232000,2,2,12 ,12,2,21,1,2, 120000]

# ╔═╡ 3266f9e6-42ad-4103-8db3-b87d2c315290
state = Dict(
	:x => x
	)

# ╔═╡ 9e37c18c-3ebb-443a-9663-bb4064391d6e
@htl("""
<script type="module" id="asdf">
	//await new Promise(r => setTimeout(r, 1000))
	
	const { html, render, Component, useEffect, useLayoutEffect, useState, useRef, useMemo, createContext, useContext, } = await import( "https://cdn.jsdelivr.net/npm/htm@3.0.4/preact/standalone.mjs")

	const node = this ?? document.createElement("div")
	
	const new_state = $(state)
	
	if(this == null){
	
		// PREACT APP STARTS HERE
		
		const Item = ({value}) => {
			const [loading, set_loading] = useState(true)

			useEffect(() => {
				set_loading(true)

				const handle = setTimeout(() => {
					set_loading(false)
				}, 1000)

				return () => clearTimeout(handle)
			}, [value])

			return html`<li>\${loading ? 
				html`<em>Loading...</em>` : 
				value
			}</li>`
		}

        const App = () => {

            const [state, set_state] = useState(new_state)
            node.set_app_state = set_state

            return html`<h5>Hello world!</h5>
                <ul>\${
                state.x.map((x,i) => html`<\${Item} value=\${x} key=\${i}/>`)
            }</ul>`;
        }

		// PREACT APP ENDS HERE

        render(html`<\${App}/>`, node);
	
	} else {
		
		node.set_app_state(new_state)
	}
	return node
</script>
	
	
""")

# ╔═╡ da7091f5-8ba2-498b-aa8d-bbf3b4505b81
md"""
# Appendix
"""

# ╔═╡ 64cbf19c-a4e3-4cdb-b4ec-1fbe24be55ad
details(x, summary="Show more") = @htl("""
	<details>
		<summary>$(summary)</summary>
		$(x)
	</details>
	""")

# ╔═╡ 93abe0dc-f041-475f-9ef7-d8ee4408414b
details(md"""
	```htmlmixed
	
	<article class="learning">
		<h4>
			Learning HTML and CSS
		</h4>
		<p>
			It is easy to learn HTML and CSS because they are not 'programming languages' like Julia and JavaScript, they are <em>markup languages</em>: there are no loops, functions or arrays, you only <em>declare</em> how your document is structured (HTML) and what that structure looks like on a 2D color display (CSS).
		</p>
		<p>
			As an example, this is what this cell looks like, written in HTML and CSS:
		</p>
	</article>


	<style>

		article.learning {
			background: #fde6ea9c;
			padding: 1em;
			border-radius: 5px;
		}

		article.learning h4::before {
			content: "☝️";
		}

		article.learning p::first-letter {
			font-size: 1.5em;
			font-family: cursive;
		}

	</style>
	```
	""", "Show with syntax highlighting")

# ╔═╡ b0c246ed-b871-461b-9541-280e49b49136
details(md"""
```htmlmixed
<div>
<button>$(text)</button>

<script>

	// Select elements relative to `currentScript`
	var div = currentScript.parentElement
	var button = div.querySelector("button")

	// we wrapped the button in a `div` to hide its default behaviour from Pluto

	var count = 0

	button.addEventListener("click", (e) => {
		count += 1

		// we dispatch the input event on the div, not the button, because 
		// Pluto's `@bind` mechanism listens for events on the **first element** in the
		// HTML output. In our case, that's the div.

		div.value = count
		div.dispatchEvent(new CustomEvent("input"))
		e.preventDefault()
	})

	// Set the initial value
	div.value = count

</script>
</div>
```
""", "Show with syntax highlighting")

# ╔═╡ d12b98df-8c3f-4620-ba3c-2f3dadac521b
details(md"""
	```htmlmixed
	<script>

	// interpolate the data 🐸
	const data = $(simple_data)

	const span = document.createElement("span")
	span.innerText = data.msg.repeat(data.times)
	
	return span
	</script>
	```
	""", "Show with syntax highlighting")

# ╔═╡ 94561cb1-2325-49b6-8b22-943923fdd91b
details(md"""
	```htmlmixed
	<script src="https://cdn.jsdelivr.net/npm/d3@6.2.0/dist/d3.min.js"></script>

	<script>

	// interpolate the data 🐸
	const data = $(my_data)

	const svg = DOM.svg(600,200)
	const s = d3.select(svg)

	s.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", d => d.coordinate[0])
		.attr("y", d => d.coordinate[1])
		.text(d => d.name)

	return svg
	</script>
	```
	""", "Show with syntax highlighting")

# ╔═╡ d121e085-c69b-490f-b315-c11a9abd57a6
details(md"""
	```htmlmixed
	<script>
	
	let data = $(films)
	
	// html`...` is from https://github.com/observablehq/stdlib
	// note the escaped dollar signs:
	let Film = ({title, director, year}) => html`
		<li class="film">
			<b>\${title}</b> by <em>\${director}</em> (\${year})
		</li>
	`
	
	// the returned HTML node is rendered
	return html`
		<ul>
			\${data.map(Film)}
		</ul>
	`
	
	</script>
	```
	""", "Show with syntax highlighting")

# ╔═╡ d4bdc4fe-2af8-402f-950f-2afaf77c62de
details(md"""
	```htmlmixed
	<script id="something">
	
	console.log("'this' is currently:", this)

	if(this == null) {
		return html`<blockquote>I am running for the first time!</blockqoute>`
	} else {
		return html`<blockquote><b>I was triggered by reactivity!</b></blockqoute>`
	}


	</script>
	```
	""", "Show with syntax highlighting")

# ╔═╡ e910982c-8508-4729-a75d-8b5b847918b6
details(md"""
```htmlmixed
<script src="https://cdn.jsdelivr.net/npm/d3@6.2.0/dist/d3.min.js"></script>

<script id="hello">

const positions = $(dot_positions)

const svg = this == null ? DOM.svg(600,200) : this
const s = this == null ? d3.select(svg) : this.s

s.selectAll("circle")
	.data(positions)
	.join("circle")
	.transition()
	.duration(300)
	.attr("cx", d => d)
	.attr("cy", 100)
	.attr("r", 10)
	.attr("fill", "gray")


const output = svg
output.s = s
return output
</script>
```
""", "Show with syntax highlighting")

# ╔═╡ 05d28aa2-9622-4e62-ab39-ca4c7dde6eb4
details(md"""
	```htmlmixed
	<script type="module" id="asdf">
		//await new Promise(r => setTimeout(r, 1000))

		const { html, render, Component, useEffect, useLayoutEffect, useState, useRef, useMemo, createContext, useContext, } = await import( "https://cdn.jsdelivr.net/npm/htm@3.0.4/preact/standalone.mjs")

		const node = this ?? document.createElement("div")

		const new_state = $(state)

		if(this == null){

			// PREACT APP STARTS HERE

			const Item = ({value}) => {
				const [loading, set_loading] = useState(true)

				useEffect(() => {
					set_loading(true)

					const handle = setTimeout(() => {
						set_loading(false)
					}, 1000)

					return () => clearTimeout(handle)
				}, [value])

				return html`<li>\${loading ? 
					html`<em>Loading...</em>` : 
					value
				}</li>`
			}

			const App = () => {

				const [state, set_state] = useState(new_state)
				node.set_app_state = set_state

				return html`<h5>Hello world!</h5>
					<ul>\${
					state.x.map((x,i) => html`<\${Item} value=\${x} key=\${i}/>`)
				}</ul>`;
			}

			// PREACT APP ENDS HERE

			render(html`<\${App}/>`, node);

		} else {

			node.set_app_state(new_state)
		}
		return node
	</script>
	```
	""", "Show with syntax highlighting")

# ╔═╡ cc318a19-316f-4fd9-8436-fb1d42f888a3
demo_img = let
	url = "https://user-images.githubusercontent.com/6933510/116753174-fa40ab80-aa06-11eb-94d7-88f4171970b2.jpeg"
	data = read(download(url))
	PlutoUI.Show(MIME"image/jpg"(), data)
end

# ╔═╡ 7aacdd8c-1571-4461-ba6e-0fd65dd8d788
demo_html = @htl("<b style='font-family: cursive;'>Hello!</b>")

# ╔═╡ ebec177c-4c33-45a4-bdbd-f16944631aff
md"""
## Embeddable output

Pluto has a multimedia object viewer, which is used to display the result of a cell's output. Depending on the _type_ of the resulting object, the richest possible viewer is used. This includes:
- an interactive structure viewer for arrays, tables, dictionaries and more: $(embed_display([1,2,(a=3, b=4)]))
- an `<img>` tag with optimized data transfer for images: $(embed_display(demo_img))
- raw HTML for HTML-showable objects: $(embed_display(demo_html))

Normally, you get this object viewer for the _output_ of a cell. However, as demonstrated in the list above, you can also **embed Pluto's object viewer in your own HTML**. To do so, Pluto provides a function:
```julia
embed_display(x)
```

#### Example

As an example, here is how you display two arrays side-by-side:

```julia
@htl("\""

<div style="display: flex;">
$(embed_display(rand(4)))
$(embed_display(rand(4)))
</div>

"\"")

```

You can [learn more](https://github.com/fonsp/Pluto.jl/pull/1126) about how this feature works, or how to use it inside packages.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
HypertextLiteral = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
HypertextLiteral = "~0.8.0"
PlutoUI = "~0.7.9"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[HypertextLiteral]]
git-tree-sha1 = "1e3ccdc7a6f7b577623028e0095479f4727d8ec1"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.8.0"

[[InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "81690084b6198a2e1da36fcfda16eeca9f9f24e4"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.1"

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[Parsers]]
deps = ["Dates"]
git-tree-sha1 = "c8abc88faa3f7a3950832ac5d6e690881590d6dc"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "1.1.0"

[[PlutoUI]]
deps = ["Base64", "Dates", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "Suppressor"]
git-tree-sha1 = "44e225d5837e2a2345e69a1d1e01ac2443ff9fcb"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.9"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[Reexport]]
git-tree-sha1 = "5f6c21241f0f655da3952fd60aa18477cf96c220"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.1.0"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[Suppressor]]
git-tree-sha1 = "a819d77f31f83e5792a76081eee1ea6342ab8787"
uuid = "fd094767-a336-5f1f-9728-57cf17d0bbfb"
version = "0.2.0"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"
"""

# ╔═╡ Cell order:
# ╟─97914842-76d2-11eb-0c48-a7eedca870fb
# ╠═571613a1-6b4b-496d-9a68-aac3f6a83a4b
# ╟─168e13f7-2ff2-4207-be56-e57755041d36
# ╠═28ae1424-67dc-4b76-a172-1185cc76cb59
# ╟─93abe0dc-f041-475f-9ef7-d8ee4408414b
# ╟─ea39c63f-7466-4015-a66c-08bd9c716343
# ╟─8b082f9a-073e-4112-9422-4087850fc89e
# ╟─d70a3a02-ef3a-450f-bf5a-4a0d7f6262e2
# ╟─5c5d2489-e48b-432f-94f8-b15333134e24
# ╟─75e1a973-7ef0-4ac5-b3e2-5edb63577927
# ╠═e8d8a60e-489b-467a-b49c-1fa844807751
# ╟─b0c246ed-b871-461b-9541-280e49b49136
# ╠═9346d8e2-9ba0-4475-a21f-11bdd018bc60
# ╠═7822fdb7-bee6-40cc-a089-56bb32d77fe6
# ╟─701de4b8-42d3-46a3-a399-d7761dccd83d
# ╟─88120468-a43d-4d58-ac04-9cc7c86ca179
# ╠═ea4b2da1-4c83-4a1f-8fc3-c71a120e58e1
# ╟─08bdeaff-5bfb-49ab-b4cc-3a3446c63edc
# ╟─9b6b5da9-8372-4ebf-9c66-ae9fcfc45d47
# ╟─f18b98f7-1e0f-4273-896f-8a667d15605b
# ╟─4a3398be-ee86-45f3-ac8b-f627a38c00b8
# ╠═2d5fd611-284b-4428-b6a5-8909203990b9
# ╠═82de4674-9ecc-46c4-8a57-0b4453c579c3
# ╟─70a415be-881a-4c01-9f8c-635b8b89e1ad
# ╠═730a692f-2bf2-4d5b-86da-6ab861e8b8ac
# ╟─a45fdec4-2d4b-429b-b809-4c256b57fffe
# ╠═c68ebd7b-5fb6-4527-ac34-33f9730e4587
# ╟─8c03139f-a94b-40cc-859f-0d86f1c72143
# ╠═d8dcb044-0ac8-46d1-a043-1073bb6d1ff1
# ╠═bf592202-a9a4-4e9b-8433-fed55e3aa3bc
# ╟─e7d3db79-8253-4cbd-9832-5afb7dff0abf
# ╟─5ac5b984-8c02-4b8d-a342-d0f05f7909ec
# ╠═ef28eb8d-ec98-43e5-9012-3338c3b84f1b
# ╠═1ba370cc-3631-47ea-9db5-75587e8e4ff3
# ╠═7fcf2f3f-d902-4338-adf0-8ef181e79420
# ╟─7afbf8ef-e91c-45b9-bf22-24201cbb4828
# ╠═b226da72-9512-4d14-8582-2f7787c25028
# ╠═a6fd1f7b-a8fc-420d-a8bb-9f549842ad3e
# ╟─d12b98df-8c3f-4620-ba3c-2f3dadac521b
# ╟─965f3660-6ec4-4a86-a2a2-c167dbe9315f
# ╠═01ce31a9-6856-4ee7-8bce-7ce635167457
# ╠═00d97588-d591-4dad-9f7d-223c237deefd
# ╠═21f57310-9ceb-423c-a9ce-5beb1060a5a3
# ╟─94561cb1-2325-49b6-8b22-943923fdd91b
# ╟─7d9d6c28-131a-4b2a-84f8-5c085f387e85
# ╟─d83d57e2-4787-4b8d-8669-64ed73d79e73
# ╟─077c95cf-2a1b-459f-830e-c29c11a2c5cc
# ╟─8388a833-d535-4cbd-a27b-de323cea60e8
# ╟─4cf27df3-6a69-402e-a71c-26538b2a52e7
# ╟─5721ad33-a51a-4a91-adb2-0915ea0efa13
# ╠═c857bb4b-4cf4-426e-b340-592cf7700434
# ╟─d121e085-c69b-490f-b315-c11a9abd57a6
# ╠═846354c8-ba3b-4be7-926c-d3c9cc9add5f
# ╟─a33c7d7a-8071-448e-abd6-4e38b5444a3a
# ╠═91f3dab8-5521-44a0-9890-8d988a994076
# ╠═dcaae662-4a4f-4dd3-8763-89ea9eab7d43
# ╟─d4bdc4fe-2af8-402f-950f-2afaf77c62de
# ╟─e77cfefc-429d-49db-8135-f4604f6a9f0b
# ╠═2d5689f5-1d63-4b8b-a103-da35933ad26e
# ╠═6dd221d1-7fd8-446e-aced-950512ea34bc
# ╠═0a9d6e2d-3a41-4cd5-9a4e-a9b76ed89fa9
# ╟─0962d456-1a76-4b0d-85ff-c9e7dc66621d
# ╠═bf9b36e8-14c5-477b-a54b-35ba8e415c77
# ╟─e910982c-8508-4729-a75d-8b5b847918b6
# ╟─781adedc-2da7-4394-b323-e508d614afae
# ╟─de789ad1-8197-48ae-81b2-a21ec2340ae0
# ╠═85483b28-341e-4ed6-bb1e-66c33613725e
# ╠═9e37c18c-3ebb-443a-9663-bb4064391d6e
# ╟─05d28aa2-9622-4e62-ab39-ca4c7dde6eb4
# ╠═3266f9e6-42ad-4103-8db3-b87d2c315290
# ╟─ebec177c-4c33-45a4-bdbd-f16944631aff
# ╟─da7091f5-8ba2-498b-aa8d-bbf3b4505b81
# ╠═64cbf19c-a4e3-4cdb-b4ec-1fbe24be55ad
# ╟─cc318a19-316f-4fd9-8436-fb1d42f888a3
# ╟─7aacdd8c-1571-4461-ba6e-0fd65dd8d788
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
