module MainWithNested

# Include a file that itself includes another file
include("./nested_include.jl")

# Commented include should be ignored
# include("this_should_be_ignored.jl")

println("Main file with nested includes")

end # module