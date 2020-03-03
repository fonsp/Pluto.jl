include("./Cell.jl")


mutable struct Notebook
    name::String

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


function samplenotebook()
    cells = Cell[]

    push!(cells, createcell_fromcode("100*a + b"))
    push!(cells, createcell_fromcode("a = 1 + 1"))
    push!(cells, createcell_fromcode("b = a * 2"))
    push!(cells, createcell_fromcode("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, createcell_fromcode("md\"# Cześć!\nMy name is **baba** and I like \$maths\$ _(no LaTeX support yet!)_\n\n### The spectacle before us was indeed sublime.\nApparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds. \""))

    Notebook("test.jl", cells)
end