# JIVEbook

JIVEbook is a Notebook platform for scientific programing in Julia using the JIVE framework. JIVEbook is based on Pluto.jl. 

JIVEbook notebooks are:

- _lightweight_ - JIVEbook is based on the package Pluto. Both are written in pure Julia and is easy to install.
- _simple_ - no hidden workspace state; friendly UI.


## Input
A JIVEbook notebook is made up of small blocks of Julia code (cells) and together they form a notebook.

Notebook cells can contain arbitrary Julia code, and you can use external libraries. There are no code rewrites or wrappers, Neptune just looks at your code once before evaluation.

## Output
Like in Pluto, notebooks are saved as pure Julia files (sample), which you can then import as if you had been programming in a regular editor all along. You can also export your notebook with cell outputs as attractive HTML and PDF documents. By reordering cells and hiding code, you have full control over how you tell your story (except for the reactivity, which is only available in Pluto). Notebooks are intended to be fully compatible with Pluto.


### Interactivity

Your programming environment becomes interactive by splitting your code into multiple cells! Changing one cell **instantly shows effects** on all other cells, giving you a fast and fun way to experiment with your model.

In the example below, changing the parameter `A` and running the first cell will directly re-evaluate the second cell and display the new plot.

<img alt="plotting screencap" src="https://user-images.githubusercontent.com/6933510/80637344-24ac0180-8a5f-11ea-82dd-813dbceca9c9.gif" width="50%">

<br >

### Built-in package manager

Pluto uses syntax analysis to understand which packages are being used in a notebook, and it **automatically manages a package environment** for your notebook. You no longer need to install packages, you can directly import any registered package like `Plots` or `DataFrames` and use it.

To ensure reproducibility, the information to exactly reproduce the package environment is **stored in your notebook file**. When someone else opens your notebook with Pluto, the exact same package environment will be used, and packages will work on their computer, automatically! _[more info](https://github.com/fonsp/Pluto.jl/wiki/%F0%9F%8E%81-Package-management)_

<img alt="package manager screencap" src="https://user-images.githubusercontent.com/6933510/134823403-fbb79d7f-dd3e-4712-b5d5-b48ad0770f13.gif" width="50%">

<br >

### HTML interaction

Lastly, here's _**one more feature**_: Pluto notebooks have a `@bind` macro to create a **live bond between an HTML object and a Julia variable**. Combined with reactivity, this is a very powerful tool!

<img alt="@bind macro screencap" src="https://user-images.githubusercontent.com/6933510/134825003-bd72ef08-677b-42fa-a655-e842868b10f6.gif" width="50%">

<br >

You don't need to know HTML to use it! The [PlutoUI package](https://github.com/fonsp/PlutoUI.jl) contains basic inputs like sliders and buttons. Pluto's interactivity is very easy to use, you will learn more from the featured notebooks inside Pluto!

But for those who want to dive deeper - you can use HTML, JavaScript and CSS to write your own widgets! Custom update events can be fired by dispatching a `new CustomEvent("input")`, making it compatible with the [`viewof` operator of observablehq](https://observablehq.com/@observablehq/a-brief-introduction-to-viewof). Have a look at the JavaScript featured notebook inside Pluto!

<br >

### Installation

Run Julia, enter `]` to bring up Julia's [package manager](https://docs.julialang.org/en/v1/stdlib/Pkg/),
and add the JIVEbook package:

```julia
julia> ]
(v1.7) pkg> add JIVEbook
```

_Press `Ctrl+C` to return to the `julia>` prompt._

### Usage

To run JIVEbook, run the following commands in your Julia REPL:

```julia
julia> import JIVEbook
julia> JIVEbook.run()
```

JIVEbook will open in your browser, and you can get started!



## License

JIVEbook.jl is open source and built by gluing together other open source software:

-   `Pluto.jl` - [MIT Licensed](https://github.com/fonsp/Pluto.jl/blob/main/LICENSE). 
-   `Julia` - [license](https://github.com/JuliaLang/julia/blob/master/LICENSE.md)
-   `CodeMirror` - [license](https://github.com/codemirror/codemirror.next/blob/master/LICENSE-MIT)
-   `HTTP.jl` - [license](https://github.com/JuliaWeb/HTTP.jl/blob/master/LICENSE.md)
-   `MsgPack.jl` - [license](https://github.com/JuliaIO/MsgPack.jl)
-   `msgpack-lite` - [license](https://github.com/kawanet/msgpack-lite/blob/master/LICENSE)
-   `observablehq/stdlib` - [license](https://github.com/observablehq/stdlib/blob/master/LICENSE)
-   `preact` - [license](https://github.com/preactjs/preact/blob/master/LICENSE)
-   `developit/htm` - [license](https://github.com/developit/htm/blob/master/LICENSE)
-   `MathJax` - [license](https://github.com/mathjax/MathJax-src/blob/master/LICENSE)

If you want to reference JIVEbook.jl in scientific writing, you can use our DOI: 
