import Markdown

# We add a method for the Markdown -> HTML conversion that automatically adds an id to headers
function Markdown.html(io::IOContext, header::Markdown.Header{l}) where l
    id = text_to_id(stripped(header.text))
    Markdown.withtag(io, "h$l", :id => id) do
        Markdown.htmlinline(io, header.text)
    end
end

# We don't need to encode this, Markdown stdlib will do it for us. But we want to replace space with `-`
text_to_id(text::String) = replace(text, " " => "-")

stripped(x::Vector) = join(Iterators.map(stripped, x))
stripped(s::String) = s
stripped(s::Union{Markdown.Italic,Markdown.Link,Markdown.Bold}) = stripped(s.text)
stripped(s::Markdown.LaTeX) = stripped(s.formula)
stripped(s::Markdown.Code) = stripped(s.code)
stripped(s::Markdown.Image) = ""
stripped(s) = ""

