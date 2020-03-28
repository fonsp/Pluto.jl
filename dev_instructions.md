# Instruction for `Pluto.jl` developers

First, git clone the package somehwere, say
`~/dev/Pluto.jl/`.

Next, open this folder in VS Code.

In a terminal:
```bash
cd ~
julia
```

then `]` to enter the package manager, and type
```
(v1.0) pkg> dev ~/dev/Pluto.jl
```
then `backspace` to enter the Julia REPL.
```
julia> using Pluto
julia> Pluto.run(1234)
```

_This will 'install' the local `Pluto.jl` into the environment `v1.0` (or whichever Julia version you use), which is a kind of global environment. You could also create a new testing environment with just these two packages. (Not to be confused with Pluto's environment!)_

## To add a dependency to `Pluto.jl`:

Exit julia, `cd` into `~/dev/Pluto.jl/` and start `julia` there. Open the package manager with `]`, then

```
(v1.0) pkg> activate .
(Pluto) pkg> add SomePackage
```

the `Project.toml` will update, exit using `Ctrl+D` and go back to the normal environment. There, type:
```
(v1.0) pkg> resolve
```
