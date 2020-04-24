<h1><img alt="Pluto.jl" src="assets/logo.svg" width=300 height=74 ></h1>

Lightweight ***reactive*** notebooks for Julia ⚡ - welcome to Pluto!

_**Explore models and share results** in a notebook that is_
- **_reactive_** - when changing a function or variable, Pluto automatically updates all affected cells.
- **_lightweight_** - Pluto is written in pure Julia and is an installable package.
- **_modern_** - responsive, intuitive user experience; beautiful exported documents; custom themes.

<img alt="reactivity screencap" src="demo/plutodemo.gif" >


## Input

The central idea is that Pluto notebooks are ***reactive***, just like [Observable notebooks](https://observablehq.com/@observablehq/observables-not-javascript), but using Julia instead of JavaScript. Cells can be placed in any order - our intelligent AST parser figures out the dependencies between them and takes care of execution. When you change a variable, Pluto automatically re-runs the cells that refer to it.

Unlike Jupyter or Matlab, there is **no mutable workspace**, but rather a _one-to-one corresponce_ between variables and code. In a Pluto notebook, the value of a variable _always_ corresponds to the code that defines it.

## Output

Cell output is simple: one cell outputs one variable, which is displayed using the richest available formatter. We believe that this limitation actually [_makes programming easier_](https://medium.com/@mbostock/a-better-way-to-code-2b1d2876a3a0)!

Your notebooks are saved as pure Julia files, which you can then import as if you had been programming in a regular editor all along. You can also export your notebook with output as attractive HTML and PDF documents. By reordering cells and hiding code, you have full control over how you tell your story.

<img alt="formatting screenshot" src="demo/formatting.png" width="50%">

## Let's do it!

### Ingredients
For one tasty notebook 🥞 you will need:
- **Julia** v1.0 or above
- **Linux**, **macOS** or **Windows**, _Linux and macOS will work best_
- Mozilla **Firefox** or Google **Chrome**, be sure to get the **latest** version

### Installation

Run Julia and add the package:
```julia
julia> ]
(v1.0) pkg> add Pluto
```

_Adding the first package to Julia can take up to 30 minutes - hang in there!_

To run the notebook server:
```julia
julia> using Pluto
julia> Pluto.run(1234)
```

Then go to [`http://localhost:1234/`](http://localhost:1234/) to start coding!

**Work remotely**:
You can also run Pluto _on a server_, and use the browser on your own computer as user interface. For this, you need to set up an _SSH tunnel_. First, log in to your server using SSH and start a Pluto server. Then open a local terminal on your own computer and type:

```bash
ssh user@ipaddress -LN 1234:localhost:1234
```
with `user` and `ipaddress` filled in accordingly. You can then go to [`http://localhost:1234/`](http://localhost:1234/) on your own computer to get started! For more info and instructions for Windows, see [this guide](https://medium.com/@apbetahouse45/how-to-run-jupyter-notebooks-on-remote-server-part-1-ssh-a2be0232c533).

**To developers**:
Follow [these instructions](https://github.com/fonsp/Pluto.jl/blob/master/dev_instructions.md) to start working on the package.

<img alt="plotting screencap" src="demo/plutoODE.gif" >

## Note

We are happy to say that **Pluto.jl is in a stable state**, and we look forward to hearing what you think! 😊

<img alt="feedback screencap" src="https://user-images.githubusercontent.com/6933510/78135402-22d02d80-7422-11ea-900f-a8b01bdbd8d3.png" >

Questions? Have a look at the [FAQ](https://github.com/fonsp/Pluto.jl/wiki).

_Created by [**Fons van der Plas**](https://github.com/fonsp) and [**Mikołaj Bochenski**](https://github.com/malyvsen). Inspired by [Observable](https://observablehq.com/)._
