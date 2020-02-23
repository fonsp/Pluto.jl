# Instruction for `Saturn.jl` developers

First, git clone the package somehwere, say
`~/dev/Saturn.jl/`.

Next, open this folder in VS Code.

In a terminal:
```bash
cd ~
julia
```

then `]` to enter the package manager, and type
```
(v1.0) pkg> dev ~/dev/Saturn.jl
(v1.0) pkg> add Revise
```
then `backspace` to enter the Julia REPL.
```
julia> using Revise
julia> using Saturn
julia> Saturn.
```

_This will 'install' `Revise.jl` and the local `Saturn.jl` into the environment `v1.0` (or whichever Julia version you use), which is a kind of global environment. You could also create a new testing environment with just these two packages. (Not to be confused with Saturn's environment!)_

## To add a dependency to `Saturn.jl`:

Exit julia, `cd` into `~/dev/Saturn.jl/` and start `julia` there. Open the package manager with `]`, then

```
(v1.0) pkg> activate .
(Saturn) pkg> add SomePackage
```

the `Project.toml` will update, exit using `Ctrl+D` and go back to the normal environment. There, type:
```
(v1.0) pkg> resolve
```
you can then re-import `Revise` (needs to be first) and `Saturn`.