import Markdown

# We add a method for the Markdown -> HTML conversion that takes a LaTeX chunk from the Markdown tree and adds our custom span
function Markdown.htmlinline(io::IO, x::Markdown.LaTeX)
    Markdown.withtag(io, :span, :class => "tex") do
        print(io, '$')
        Markdown.htmlesc(io, x.formula)
        print(io, '$')
    end
end

# this one for block equations: (double $$)
function Markdown.html(io::IO, x::Markdown.LaTeX)
    Markdown.withtag(io, :p, :class => "tex") do
        print(io, '$', '$')
        Markdown.htmlesc(io, x.formula)
        print(io, '$', '$')
    end
end