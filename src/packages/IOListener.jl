
module ANSIEmulation include("./ANSIEmulation.jl") end


"A polling system to watch for writes to a `Base.BufferStream`. Up-to-date content will be passed as string to the `callback` function."
Base.@kwdef struct IOListener
    callback::Function
    interval::Real=1.0/60
    running::Ref{Bool}=Ref(false)

    buffer::Base.BufferStream=Base.BufferStream()
    ansi_state::ANSIEmulation.ANSITerminalState=ANSIEmulation.ANSITerminalState()
end

function trigger(listener::IOListener)
    if isreadable(listener.buffer)
        newdata = readavailable(listener.buffer)
        isempty(newdata) && return
        s = String(newdata)
        ANSIEmulation.consume_safe!(
            listener.ansi_state, 
            s
        )
        new_contents = ANSIEmulation.build_str(listener.ansi_state)

        listener.callback(new_contents)
    end
end

function startlistening(listener::IOListener)
    if !listener.running[]
        listener.running[] = true
        @async try
            while listener.running[]
                trigger(listener)
                sleep(listener.interval)
            end
        catch ex
            println(stderr, "IOListener loop error")
            showerror(stderr, ex, stacktrace(catch_backtrace()))
            rethrow(ex)
        end
    end
end
function stoplistening(listener::IOListener)
    if listener.running[]
        listener.running[] = false
        bytesavailable(listener.buffer) > 0 && trigger(listener)
        close(listener.buffer)
    end
end

freeze_loading_spinners(s::AbstractString) = _replaceall(s, '◑' => '◐', '◒' => '◐', '◓' => '◐')

_replaceall(s, p) = replace(s, p)
_replaceall(s, p, ps...) = @static VERSION >= v"1.7" ? replace(s, p, ps...) : _replaceall(replace(s, p), ps...)