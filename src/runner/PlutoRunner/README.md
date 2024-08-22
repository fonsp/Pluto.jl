This module will be evaluated _inside_ the workspace process.

Pluto does most things on the server, but it uses worker processes to evaluate notebook code in.
These processes don't import Pluto, they only import this module.
Functions from this module are called by WorkspaceManager.jl via Malt.

When reading this file, pretend that you are living in a worker process,
and you are communicating with Pluto's server, who lives in the main process.
The package environment that this file is loaded with is the NotebookProcessProject.toml file in this directory.

# SOME EXTRA NOTES

Restrict the communication between PlutoRunner and the Pluto server to only use *Base Julia types*, like `String`, `Dict`, `NamedTuple`, etc.

# DEVELOPMENT TIP
If you are editing PlutoRunner, you cannot use Revise unfortunately.
However! You don't need to restart Pluto to test your changes! You just need to restart the notebook from the Pluto main menu, and the new PlutoRunner.jl will be loaded.