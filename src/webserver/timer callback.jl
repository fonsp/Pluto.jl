import .TempDirInScratch

function timer_callback(session::ServerSession)
    
    # Update TempDirInScratch
    @info "# Update TempDirInScratch"
    try
        for notebook in values(session.notebooks)
            ctx = notebook.nbpkg_ctx
            if ctx !== nothing
                d = PkgCompat.env_dir(ctx)
                @info "# Marking temp dir $d as current"
                TempDirInScratch.mark_as_current(d)
            end
        end
        
        @info "# Cleaning up temp dirs"
        TempDirInScratch.cleanup()
    catch e
        @warn "Error in async update loop" exception=(e, catch_backtrace())
    finally
        @info "# Done updating TempDirInScratch"
    end    
end

