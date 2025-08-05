cd(@__DIR__)

import Pkg
Pkg.activate(".")
Pkg.instantiate()
using YAML
using JSON3
using OrderedCollections



const lang_files = filter(endswith(".json"), readdir())
const not_english = filter(!isequal("english.json"), lang_files)

@info "Found language files" lang_files not_english

load_json(path) = YAML.load_file(path; dicttype=OrderedCollections.OrderedDict{String,Any})

function write_json(path, data)
    open(path, "w") do io
        JSON3.pretty(io, data, JSON3.AlignmentContext(alignment=:Left, indent=4))
    end
end



const english = load_json("english.json")


for lang_file in not_english
    @info "🔄 Updating" lang_file
    json = load_json(lang_file)
    
    # Error about keys that should not be there, and remove them
    for key in keys(json)
        if !haskey(english, key)
            @warn "🗑️ Key $key found in $lang_file but not in english.json. Removing..." old_value=json[key]
        end
    end
    
    for key in keys(english)
        if !haskey(json, key)
            @info "🆕 Adding key: $key"
        end
    end
    
    new_data = OrderedDict(
        key => haskey(json, key) ? json[key] : ""
        for key in keys(english)
    )
    
    write_json(lang_file, new_data)   
    
    @info "✅ Update complete" lang_file
end





