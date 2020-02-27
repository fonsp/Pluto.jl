<h1><img alt="SATURN.jl" src="http://fonsp.com/img/saturnlogo3.svg" height=100></h1>

Lightweight ***reactive*** notebooks for Julia ⚡

Still under development - we currently have a classical (imperative) notebook system.

<img alt="interactivity screencap" src="http://fonsp.com/img/saturn.gif" height=300>

## Input

The central idea is that Saturn notebooks will be ***reactive***, just like [Observable notebooks](https://observablehq.com/@observablehq/observables-not-javascript), but using Julia instead of JavaScript. _This reactivity is currently under development!_

## Output
Cell output is simple: one cell outputs one variable, which is displayed using the richest available formatter. We believe that this limitation actually [_makes programming easier_](https://medium.com/@mbostock/a-better-way-to-code-2b1d2876a3a0)!

<img alt="formatting screenshot" src="http://fonsp.com/img/saturnformatting.png" height=400>

Plotting is supported out-of-the-box!

<img alt="plotting screenshot" src="http://fonsp.com/img/saturnplotting.png" height=600>

## Installation

_(To developers: follow [these instructions](https://github.com/fonsp/Saturn.jl/blob/master/dev_instructions.md) to start working on the package.)_

To add the package:
```julia
julia> using Pkg; Pkg.add(PackageSpec(url="https://github.com/fonsp/Saturn.jl"))
```

To run the notebook server:
```julia
julia> using Saturn
julia> Saturn.serve(1234)
```

Then go to [`http://localhost:1234/`](http://localhost:1234/) to start coding!

## Note

This package is still in its early days - go to the [issue tracker](https://github.com/fonsp/Saturn.jl/issues) to see what's up!

Let us know what you think! 😊

_Created by [**Fons van der Plas**](https://github.com/fonsp) and [**Mikołaj Bochenski**](https://github.com/malyvsen). Inspired by [Observable](https://observablehq.com/)._
