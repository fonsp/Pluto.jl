struct JSLink
    callback::Function
    on_cancellation::Union{Nothing,Function}
    cancelled_ref::Ref{Bool}
end

const cell_js_links = Dict{UUID,Dict{String,JSLink}}()

function core_with_js_link(io, callback, on_cancellation)
    
    _cell_id = get(io, :pluto_cell_id, currently_running_cell_id[])::UUID
    
    link_id = String(rand('a':'z', 16))
    
    links = get!(() -> Dict{String,JSLink}(), cell_js_links, _cell_id)
    links[link_id] = JSLink(callback, on_cancellation, Ref(false))
    
    write(io, "/* See the documentation for AbstractPlutoDingetjes.Display.with_js_link */ _internal_getJSLinkResponse(\"$(_cell_id)\", \"$(link_id)\")")
end

function unregister_js_link(cell_id::UUID)
    # cancel old links
    old_links = get!(() -> Dict{String,JSLink}(), cell_js_links, cell_id)
    for (name, link) in old_links
        link.cancelled_ref[] = true
    end
    for (name, link) in old_links
        c = link.on_cancellation
        c === nothing || c()
    end

    # clear
    cell_js_links[cell_id] = Dict{String,JSLink}()
end

function evaluate_js_link(notebook_id::UUID, cell_id::UUID, link_id::String, input::Any)
    links = get(() -> Dict{String,JSLink}(), cell_js_links, cell_id)
    link = get(links, link_id, nothing)
    
    with_logger_and_io_to_logs(get_cell_logger(notebook_id, cell_id); capture_stdout=false) do
        if link === nothing
            @warn "🚨 AbstractPlutoDingetjes: JS link not found." link_id
            
            (false, "link not found")
        elseif link.cancelled_ref[]
            @warn "🚨 AbstractPlutoDingetjes: JS link has already been invalidated." link_id
            
            (false, "link has been invalidated")
        else
            try
                result = link.callback(input)
                assertpackable(result)
                
                (true, result)
            catch ex
                @error "🚨 AbstractPlutoDingetjes.Display.with_js_link: Exception while evaluating Julia callback." input exception=(ex, catch_backtrace())
                (false, "exception in Julia callback:\n\n$(ex)")
            end
        end
    end
end