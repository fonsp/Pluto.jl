module PkgUtils

import FileWatching
import Pkg
import ..Pluto
import ..Pluto: Notebook, save_notebook, load_notebook, load_notebook_nobackup, withtoken, Token, readwrite, PkgCompat
import ..Pluto.PkgCompat: project_file, manifest_file

using Markdown

export activate_notebook

ensure_has_nbpkg(notebook::Notebook) = if notebook.nbpkg_ctx === nothing

    # TODO: update_save the notebook to init packages and stuff?
    error("""
    This notebook is not using Pluto's package manager. This means that either:
    1. The notebook contains Pkg.activate or Pkg.add calls, or
    2. The notebook was created before Pluto 0.15.

    Open the notebook using Pluto to get started.
    """)
else
    for f in [notebook |> project_file, notebook |> manifest_file]
        isfile(f) || touch(f)
    end
end

function assert_has_manifest(dir::String)
    @assert isdir(dir)
    if !isfile(dir |> project_file)
        error("The given directory does not contain a Project.toml file -- it is not a package environment.")
    end
    if !isfile(dir |> manifest_file)
        error("The given directory does not contain a Manifest.toml file. Use `Pkg.resolve` to generate a Manifest.toml from a Project.toml.")
    end
end


function nb_and_dir_environments_equal(notebook::Notebook, dir::String)
    try
        ensure_has_nbpkg(notebook)
        assert_has_manifest(dir)
        true
    catch
        false
    end && let
        read(notebook |> project_file) == read(dir |> project_file) && 
        read(notebook |> manifest_file) == read(dir |> manifest_file)
    end
end


function write_nb_to_dir(notebook::Notebook, dir::String)
    ensure_has_nbpkg(notebook)
    mkpath(dir)

    readwrite(notebook |> project_file, dir |> project_file)
    readwrite(notebook |> manifest_file, dir |> manifest_file)
end


function write_dir_to_nb(dir::String, notebook::Notebook)
    assert_has_manifest(dir)

    notebook.nbpkg_ctx = Pluto.PkgCompat.create_empty_ctx()

    readwrite(dir |> project_file, notebook |> project_file)
    readwrite(dir |> manifest_file, notebook |> manifest_file)

    save_notebook(notebook)
end

write_dir_to_nb(dir::String, notebook_path::String) = write_dir_to_nb(dir::String, load_notebook(notebook_path))

write_nb_to_dir(notebook_path::String, dir::String) = write_nb_to_dir(load_notebook(notebook_path), dir)
nb_and_dir_environments_equal(notebook_path::String, dir::String) = nb_and_dir_environments_equal(load_notebook(notebook_path), dir)

"""
```julia
reset_notebook_environment(notebook_path::String; keep_project::Bool=false, backup::Bool=true)
```

Remove the embedded `Project.toml` and `Manifest.toml` from a notebook file, modifying the file. If `keep_project` is true, only `Manifest.toml` will be deleted. A backup of the notebook file is created by default.
"""
function reset_notebook_environment(path::String; kwargs...)
    Pluto.reset_nbpkg!(
        load_notebook_nobackup(path);
        kwargs...
    )
end

"""
```julia
reset_notebook_environment(notebook_path::String; backup::Bool=true, level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR)
```

Update the embedded `Project.toml` and `Manifest.toml` in a notebook file, modifying the file. A [`Pkg.UpgradeLevel`](@ref) can be passed to the `level` keyword argument. A backup file is created by default. 
"""
function update_notebook_environment(path::String; kwargs...)
    Pluto.update_nbpkg(
        Pluto.ServerSession(),
        load_notebook_nobackup(path);
        kwargs...
    )
end


function activate_notebook_environment(path::String)
    notebook_ref = Ref(load_notebook(path))

    ensure_has_nbpkg(notebook_ref[])

    ourpath = joinpath(mktempdir(), basename(path))
    mkpath(ourpath)

    still_needed = Ref(true)

    save_token = Token()

    function maybe_update_nb()
        withtoken(save_token) do
            if still_needed[]
                if !nb_and_dir_environments_equal(notebook_ref[], ourpath)
                    write_dir_to_nb(ourpath, notebook_ref[])
                    println()
                    @info "Saved notebook package environment ✓"
                    println()
                end
            end
        end
    end

    function maybe_update_dir()
        withtoken(save_token) do
            if still_needed[]
                if !nb_and_dir_environments_equal(notebook_ref[], ourpath)
                    write_nb_to_dir(notebook_ref[], ourpath)
                    println()
                    @info "New notebook package environment written to directory ✓"
                    println()
                end
            end
        end
    end

    maybe_update_dir()

    atexit(maybe_update_nb)

    Base.ACTIVE_PROJECT[] = ourpath

    # WATCH DIR PROJECT FILE
    Pluto.@asynclog begin
        while Base.ACTIVE_PROJECT[] == ourpath
            FileWatching.watch_file(ourpath |> project_file)
            # @warn "DIR PROJECT UPDATED"
            sleep(.2)
            
            maybe_update_nb()
        end
        still_needed[] = false
    end

    # WATCH DIR MANIFEST FILE
    Pluto.@asynclog begin
        while Base.ACTIVE_PROJECT[] == ourpath
            FileWatching.watch_file(ourpath |> manifest_file)
            # @warn "DIR MANIFEST UPDATED"
            sleep(.5)
            
            maybe_update_nb()
        end
        still_needed[] = false
    end

    # WATCH NOTEBOOK FILE
    Pluto.@asynclog begin
        while Base.ACTIVE_PROJECT[] == ourpath
            FileWatching.watch_file(path)
            # @warn "NOTEBOOK FILE UPDATED"
            # we update the dir after a longer delay, because changes to the environment in the directory (written to the notebook) take precedence.
            sleep(1)

            notebook_ref[] = load_notebook(path)
            
            maybe_update_dir()
        end
        still_needed[] = false
    end

    # CHECK EVERY 5 SECONDS
    # Pluto.@asynclog begin
    #     while still_needed[]
    #         sleep(5)
    #         maybe_update_nb()
    #         # we update the dir second, because changes to the environment in the directory (written to the notebook) take precedence.
    #         maybe_update_dir()
    #     end
    # end

    println()
    """
    
    > Notebook environment activated!

    ## Step 1.
    _Press `]` to open the Pkg REPL._
    
    The notebook environment is currently active.
    
    ## Step 2. 
    The notebook file and your REPL environment are now synced. This means that:
    1. Any changes you make in the REPL environment will be written to the notebook file. For example, you can `pkg> update` or `pkg> add SomePackage`, and the notebook file will update.
    2. Whenever the notebook file changes, the REPL environment will be updated from the notebook file.

    ## Step 3.
    When you are done, you can exit the notebook environment by deactivating it:

    ```
    pkg> activate
    ```
    """ |> Markdown.parse |> display
    println()


end

const activate_notebook = activate_notebook_environment

function testnb()
    t = tempname()

    readwrite(Pluto.project_relative_path("test","packages","nb.jl"), t)
    t
end

end
