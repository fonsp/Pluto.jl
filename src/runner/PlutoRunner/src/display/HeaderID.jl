import Markdown

# We add a method for the Markdown -> HTML conversion that automatically adds an id to headers
function Markdown.html(io::IO, header::Markdown.Header{l}) where l
    id = text_to_id(stripped(header.text))
    Markdown.withtag(io, "h$l", :id => id) do
        Markdown.htmlinline(io, header.text)
    end
end

# We actually don't need to encode this! Markdown stdlib will do it for us.
text_to_id(text::String) = text

# encodeURIComponent(s::String) = join(map(codeunits(s)) do b
# 	c = Char(b)
# 	if c ∈ 'a':'z' || c ∈ 'A':'Z' || c ∈ '0':'9' || c ∈ ('-','.','_','~')
# 		c
# 	else
# 		"%$(uppercase(string(b, base=16, pad=2)))"
# 	end
# end)

stripped(x::Vector) = join(Iterators.map(stripped, x))
stripped(s::String) = s
stripped(s::Union{Markdown.Italic,Markdown.Link,Markdown.Bold}) = stripped(s.text)
stripped(s::Markdown.LaTeX) = stripped(s.formula)
stripped(s::Markdown.Code) = stripped(s.code)
stripped(s::Markdown.Image) = ""
stripped(s) = ""

