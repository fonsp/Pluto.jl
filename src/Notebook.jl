include("./Cell.jl")


mutable struct Notebook
    path::String

    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
end

function selectcell_byuuid(notebook::Notebook, uuid::UUID)::Union{Cell,Nothing}
    cellIndex = findfirst(c->c.uuid == uuid, notebook.cells)
    if cellIndex === nothing
        @warn "Requested non-existing cell with UUID $(uuid)\nTry refreshing the page in your browser."
        return nothing
    end
    notebook.cells[cellIndex]
end

# We use a creative delimiter to avoid accidental use in code
_uuid_delimiter = "# ⋐⋑ "
_order_delimited = "# ○ "
_cell_appendix = "\n\n"

function samplenotebook()
    cells = Cell[]

    push!(cells, createcell_fromcode("100*a + b"))
    push!(cells, createcell_fromcode("a = 1"))
    push!(cells, createcell_fromcode("b = let\n\tx = a + a\n\tx*x\nend"))
    push!(cells, createcell_fromcode("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, createcell_fromcode("md\"# Cześć!\nMy name is **baba** and I like \$maths\$ _(no LaTeX support yet!)_\n\n### The spectacle before us was indeed sublime.\nApparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds. \""))

    Notebook(joinpath(tempdir(), "test.jl"), cells)
end

function save_notebook(io, notebook)
    write(io, "### A Pluto.jl notebook ###\n")
    write(io, "\n")

    # TODO: order cells
    cells_ordered = notebook.cells

    for c in cells_ordered
        write(io, _uuid_delimiter * string(c.uuid) * "\n")
        write(io, c.code)
        write(io, _cell_appendix)
    end

    write(io, _uuid_delimiter * "Cell order:" * "\n")
    for c in notebook.cells
        write(io, _order_delimited * string(c.uuid) * "\n")
    end
end

function save_notebook(path::String, notebook)
    open(path, "w") do io
        save_notebook(io, notebook)
    end
end

save_notebook(notebook) = save_notebook(notebook.path, notebook)

function load_notebook(io, path)
    firstline = String(readline(io))

    if firstline != "### A Pluto.jl notebook ###"
        @warn "File is not a Pluto.jl notebook"
    end
    collected_cells = Dict()
    
    # ignore first bits of file
    readuntil(io, _uuid_delimiter)

    last_read = ""
    while !eof(io)
        uuid_str = String(readline(io))
        if uuid_str == "Cell order:"
            break
        else
            uuid = UUID(uuid_str)
            code = String(readuntil(io, _uuid_delimiter))
            # Change windows line endings to linux; remove the cell appendix.
            code_normalised = replace(code, "\r\n" => "\n")[1:end - ncodeunits(_cell_appendix)]

            read_cell = Cell(uuid, code_normalised, nothing, nothing, nothing, Set{Symbol}(), Set{Symbol}(), Set{Expr}())

            collected_cells[uuid] = read_cell
        end
    end

    ordered_cells = Cell[]
    while !eof(io)
        uuid_str = String(readline(io))
        if startswith(uuid_str, _order_delimited)
            uuid = let
                # Because we support Unicode, this is not just `length(_order_delimited) + 1`.
                uuid_index = ncodeunits(_order_delimited) + 1
                UUID(uuid_str[uuid_index:end])
            end
            push!(ordered_cells, collected_cells[uuid])
        end
    end

    Notebook(path, ordered_cells)
end

function load_notebook(path::String)
    open(path, "r") do io
        load_notebook(io, path)
    end
end