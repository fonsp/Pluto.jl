import Revise
import Pluto: map_byte_range_to_utf16_codepoints
import JuliaSyntax

source = "2e-324"

ex = try
    JuliaSyntax.parseall(Expr, source; filename="hello")
catch e
    if !(e isa JuliaSyntax.ParseError)
        rethrow()
    end
    e
end

diag = ex.diagnostics[1]

first_byte = min(diag.first_byte, ncodeunits(source))
last_byte = min(lastindex(source)+1, nextind(source, diag.last_byte))

from, to = map_byte_range_to_utf16_codepoints(source, first_byte, last_byte)

yes = transcode(UInt16, source)

# one-based, exclusive range
slice = yes[from+1:min(to,end)]
out = String(transcode(UInt8, slice))
@show source (out)
