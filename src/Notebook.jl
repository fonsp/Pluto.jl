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

    push!(cells, createcell_fromcode("x = 1 + 1"))
    push!(cells, createcell_fromcode("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, createcell_fromcode("using Markdown; md\"# Cześć!\nMy name is **baba** and I like \$maths\$\n\n_(Markdown -> HTML is for free, for LaTeX we need to pre-/post-process the HTML, and import a latex-js lib)_\""))

    Notebook("test.jl", cells)
end