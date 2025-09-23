module TempDirInScratch
using Random
using Dates

const ROOT_DIR_OVERRIDE = Ref{Union{Nothing, AbstractString}}(nothing)
root() = @something(ROOT_DIR_OVERRIDE[], Scratch.@get_scratch!("pkg_envs"))

const name_rng = MersenneTwister(time_ns())

function tempdir(; allow_cleanup::Bool=true)
    super_rng = MersenneTwister(time_ns() + rand(name_rng, UInt64))
    dirname = joinpath(root(), "env_$(join(rand(super_rng, 'a':'z', 10)))")
    mkdir(dirname)
    
    allow_cleanup && cleanup()
    
    dirname
end

function cleanup(; max_age::Period=Hour(5))
    try
        for dir in readdir(root(); join=true)
            if isdir(dir)
                last_time = recursive_stat(dir) |> unix2datetime
                if last_time < now() - max_age
                    @info "Deleting temp dir $dir"
                    try
                        rm(dir; recursive=true)
                    catch e
                        @error "Error deleting temp dir $dir" exception=(e, catch_backtrace())
                    end
                end
            end
        end
    catch e
        @error "Error cleaning up temp dirs" exception=(e, catch_backtrace())
    end
end

function recursive_stat(start::AbstractString)
	local result = 0.0
	
    try
        for (root, dirs, files) in walkdir(start)
            function yo(s)
                st = stat(joinpath(root,s))
                result = max(
                    result, 
                    st.ctime,
                    st.mtime,
                )
            end

            foreach(yo, dirs)
            foreach(yo, files)
        end
    catch e
        @error "Error statting temp dir $start" exception=(e, catch_backtrace())
    end

	return result
end

function mark_as_current(dirname::AbstractString)
    try
        p = joinpath(dirname, "Project.toml")
        isfile(p) && touch(p)
    catch e
        @error "Error marking temp dir $dirname as current" exception=(e, catch_backtrace())
    end
end


end