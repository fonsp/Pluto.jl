### How to Dev
1. You need to have the following file tree:

```bash
JIVE/
├─ JIVECore.jl/
└─ JIVEbook.jl/
   ├─ ...
   ├─ src/runner/PlutoRunner/
   │  ├─ src/
   │  └─ Project.toml
   └─ Project.toml
```
2. Open Julia inside JIVE directory
3. Activate JIVEbook environment and add JIVECore in dev mode:
```julia 
  (@v1.10) pkg> activate ./JIVEbook.jl
    Activating project at `~/JIVE/JIVEbook.jl`

  (JIVEbook) pkg> dev ./JIVECore.jl/
```

4. Activate PlutoRunner environment and add JIVECore in dev mode:
```julia 
(JIVEbook) pkg> activate ./JIVEbook.jl/src/runner/PlutoRunner/
  Activating project at `~/JIVE/JIVEbook.jl/src/runner/PlutoRunner`

(PlutoRunner) pkg> dev ./JIVECore.jl/
```

