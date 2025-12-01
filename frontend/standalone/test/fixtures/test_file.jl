module TestModule

# This is a regular include that should be processed
include("./test_shared.jl")

# This is a commented include that should be ignored
# include("commented_file.jl")

# This include should also be ignored (leading spaces before #)
    # include("another_commented_file.jl")

# Mixed case - this should be ignored
#include("mixed_case.jl")

println("This is the main test file")

end # module