
module ANSIEmulation include("./ANSIEmulation.jl") end


"A polling system to watch for writes to an IOBuffer. Up-to-date content will be passed as string to the `callback` function."
Base.@kwdef struct IOListener
    callback::Function
    interval::Real=1.0/60
    running::Ref{Bool}=Ref(false)

    buffer::IOBuffer=IOBuffer()
    last_size::Ref{Int}=Ref(0)
    ansi_state::ANSIEmulation.ANSITerminalState=ANSIEmulation.ANSITerminalState()
end

function trigger(listener::IOListener)
    old_size = listener.last_size[]
    new_size = listener.buffer.size
    if new_size > old_size
        # @debug "making string"
        s = String(@view listener.buffer.data[old_size+1:new_size])
        # @debug "making ansi"
        ANSIEmulation.consume_safe!(
            listener.ansi_state, 
            s
        )
        # @debug "building string" s listener.ansi_state
        new_contents = ANSIEmulation.build_str(listener.ansi_state)

        listener.last_size[] = new_size
        listener.callback(new_contents)
    end
end

function startlistening(listener::IOListener)
    if !listener.running[]
        listener.running[] = true
        @async while listener.running[]
            trigger(listener)
            sleep(listener.interval)
        end
    end
end
function stoplistening(listener::IOListener)
    if listener.running[]
        listener.running[] = false
        trigger(listener)
    end
end

freeze_loading_spinners(s::AbstractString) = _replaceall(s, '◑' => '◐', '◒' => '◐', '◓' => '◐')

_replaceall(s, p) = replace(s, p)
_replaceall(s, p, ps...) = @static VERSION >= v"1.7" ? replace(s, p, ps...) : _replaceall(replace(s, p), ps...)