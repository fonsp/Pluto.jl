> _Interested in learning Julia, Pluto and applied maths?_ Join the **open MIT course** taught by **Alan Edelman**, **David P. Sanders**, Grant Sanderson (**3blue1brown**) & James Schloss (**LeiosOS**) (_and a bit of me_): [Introduction to Computational Thinking](https://mitmath.github.io/18S191/Fall20/), fall 2020.
> <br>

<p align="center"><a href="https://www.youtube.com/watch?v=IAF8DjrQSSk">🎈 Pluto presentation (20 min) at <b>Juliacon 2020</b> 🎈</a></p>

<br>
<br>

<h1><img alt="Pluto.jl" src="https://raw.githubusercontent.com/fonsp/Pluto.jl/master/frontend/img/logo.svg" width=300 height=74 ></h1>

_Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there._

**Explore models and share results** in a notebook that is

-   **_reactive_** - when changing a function or variable, Pluto automatically updates all affected cells.
-   **_lightweight_** - Pluto is written in pure Julia and is easy to install.
-   **_simple_** - no hidden workspace state; friendly UI.

<img alt="reactivity screencap" src="https://raw.githubusercontent.com/fonsp/Pluto.jl/580ab811f13d565cc81ebfa70ed36c84b125f55d/demo/plutodemo.gif" >
<p align="center"><a href="https://mybinder.org/v2/gh/fonsp/pluto-on-binder/master?urlpath=pluto">🎈 <b>Pluto demo</b> inside your browser 🎈</a></p>

### Input

A Pluto notebook is made up of small blocks of Julia code (_cells_) and together they form a [**_reactive_** notebook](https://medium.com/@mbostock/a-better-way-to-code-2b1d2876a3a0).
When you change a variable, Pluto automatically re-runs the cells that refer to it. Cells can even be placed in arbitrary order - intelligent syntax analysis figures out the dependencies between them and takes care of execution.

Cells can contain _arbitrary_ Julia code, and you can use external libraries. There are no code rewrites or wrappers, Pluto just looks at your code once before evaluation.

### Output

Your notebooks are **saved as pure Julia files** ([sample](https://github.com/fonsp/Pluto.jl/blob/master/sample/Basic.jl)), which you can then import as if you had been programming in a regular editor all along. You can also export your notebook with cell outputs as attractive HTML and PDF documents. By reordering cells and hiding code, you have full control over how you tell your story.

<br >

## Dynamic environment

Pluto offers an environment where changed code takes effect instantly and where deleted code leaves no trace.
Unlike Jupyter or Matlab, there is **no mutable workspace**, but rather, an important guarantee:

<blockquote align="center"><em><b>At any instant</b>, the program state is <b>completely described</b> by the code you see.</em></blockquote>
No hidden state, no hidden bugs.

### Interactivity

Your programming environment becomes interactive by splitting your code into multiple cells! Changing one cell **instantly shows effects** on all other cells, giving you a fast and fun way to experiment with your model.

In the example below, changing the parameter `A` and running the first cell will directly re-evaluate the second cell and display the new plot.

<img alt="plotting screencap" src="https://user-images.githubusercontent.com/6933510/80637344-24ac0180-8a5f-11ea-82dd-813dbceca9c9.gif" width="50%">

<br >

### HTML interaction

Lastly, here's _**one more feature**_: Pluto notebooks have a `@bind` macro to create a **live bond between an HTML object and a Julia variable**. Combined with reactivity, this is a very powerful tool!

<img alt="@bind macro screencap" src="https://user-images.githubusercontent.com/6933510/80617037-e2c09280-8a41-11ea-9fb3-18bb2921dd9e.gif" width="70%">

_notebook from [vdplasthijs/julia_sir](https://github.com/vdplasthijs/julia_sir)_

<br >

You don't need to know HTML to use it! The [PlutoUI package](https://github.com/fonsp/PlutoUI.jl) contains basic inputs like sliders and buttons.

But for those who want to dive deeper - you can use HTML, JavaScript and CSS to write your own widgets! Custom update events can be fired by dispatching a `new CustomEvent("input")`, making it compatible with the [`viewof` operator of observablehq](https://observablehq.com/@observablehq/a-brief-introduction-to-viewof). Have a look at the sample notebooks inside Pluto to learn more!

<br >
<hr >
<br >

# Let's do it!

### Ingredients

For one tasty notebook 🥞 you will need:

-   **Julia** v1.0 or above, _v1.5 is fastest_
-   **Linux**, **macOS** or **Windows**, _Linux and macOS will work best_
-   Mozilla **Firefox** or Google **Chrome**, be sure to get the latest version

### Installation

<p align="center"><a href="https://www.youtube.com/watch?v=OOjKEgbt8AI">🎈 How to install <b>Julia & Pluto</b> (6 min) 🎈</a></p>

Run Julia and add the package:

```julia
julia> ]
(v1.5) pkg> add Pluto
```

_Using the package manager for the first time can take up to 15 minutes - hang in there!_

To run the notebook server:

```julia
julia> import Pluto
julia> Pluto.run()
```

Pluto will open in your browser, and you can get started!

Questions? Have a look at the [FAQ](https://github.com/fonsp/Pluto.jl/wiki).

### To developers

Follow [these instructions](https://github.com/fonsp/Pluto.jl/blob/master/CONTRIBUTING.md) to start working on the package.

<img src="https://raw.githubusercontent.com/gist/fonsp/9a36c183e2cad7c8fc30290ec95eb104/raw/ca3a38a61f95cd58d79d00b663a3c114d21e284e/cute.svg">

## License

Pluto.jl is open source! Specifically, it is [MIT Licensed](https://github.com/fonsp/Pluto.jl/blob/master/LICENSE). The included sample notebooks have a more permissive license: the [Unlicense](https://github.com/fonsp/Pluto.jl/blob/master/sample/LICENSE). This means that you can use sample notebook code however you like - you do not need to credit us!

Pluto.jl is built by gluing together open source software:

-   `Julia` - [license](https://github.com/JuliaLang/julia/blob/master/LICENSE.md)
-   `CodeMirror` - [license](https://github.com/codemirror/CodeMirror/blob/master/LICENSE)
-   `HTTP.jl` - [license](https://github.com/JuliaWeb/HTTP.jl/blob/master/LICENSE.md)
-   `MsgPack.jl` - [license](https://github.com/JuliaIO/MsgPack.jl)
-   `msgpack-lite` - [license](https://github.com/kawanet/msgpack-lite/blob/master/LICENSE)
-   `observablehq/stdlib` - [license](https://github.com/observablehq/stdlib/blob/master/LICENSE)
-   `preact` - [license](https://github.com/preactjs/preact/blob/master/LICENSE)
-   `developit/htm` - [license](https://github.com/developit/htm/blob/master/LICENSE)
-   `MathJax` - [license](https://github.com/mathjax/MathJax-src/blob/master/LICENSE)

Your notebook files are _yours_, you do not need to credit us. Have fun!

## From the authors

We are happy to say that Pluto.jl runs smoothly for most users, and is **ready to be used in your next project**!

The Pluto project is an ambition to [_rethink what a programming environment should be_](http://worrydream.com/#!/LearnableProgramming). We believe that scientific computing can be a lot simpler and more accessible. If you feel the same, give Pluto a try! We would love to hear what you think. 😊

### You can chat with us

-   contact me (fonsi) **[via email](mailto:fonsvdplas@gmail.com)** or on my <a href="https://whereby.com/plutojl"><b>video chat room</b></a> (wait a minute for me to join)
-   send your funky notebooks to the **[Zulip chat room](https://julialang.zulipchat.com/#narrow/stream/243342-pluto.2Ejl)** (_search for the `pluto.jl` stream_)
-   use Pluto's **[built-in feedback system:](https://github.com/fonsp/Pluto.jl/issues/182#issue-637726414)**

<img alt="feedback screencap" src="https://user-images.githubusercontent.com/6933510/84502876-6f08db00-acb9-11ea-84c3-f5daaba29273.png" width="100%">

Questions? Have a look at the [FAQ](https://github.com/fonsp/Pluto.jl/wiki).

_Created by [**Fons van der Plas**](https://github.com/fonsp) and [**Mikołaj Bochenski**](https://github.com/malyvsen). Inspired by [Observable](https://observablehq.com/)._
