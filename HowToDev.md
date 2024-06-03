### How to Dev
1. You need to have the following file tree:

```bash
JIVE/
├─ JIVECore.jl/
└─ Eris.jl/
   ├─ ...
   ├─ src/runner/PlutoRunner/
   │  ├─ src/
   │  └─ Project.toml
   └─ Project.toml
```
2. Open Julia inside JIVE directory
3. Activate Eris environment and add JIVECore in dev mode:
```julia 
  (@v1.10) pkg> activate ./Eris.jl
    Activating project at `~/JIVE/Eris.jl`

  (Eris) pkg> dev ./JIVECore.jl/
```

4. Activate PlutoRunner environment and add JIVECore in dev mode:
```julia 
(Eris) pkg> activate ./Eris.jl/src/runner/PlutoRunner/
  Activating project at `~/JIVE/Eris.jl/src/runner/PlutoRunner`

(PlutoRunner) pkg> dev ./JIVECore.jl/
```

