
"A polling system to watch for writes to an IOBuffer. Up-to-date content will be passed as string to the `callback` function."
Base.@kwdef struct IOListener
    callback::Function
    buffer::IOBuffer=IOBuffer()
    interval::Real=1.0/60
    running::Ref{Bool}=Ref(false)
    last_size::Ref{Int}=Ref(-1)
end
function trigger(listener::IOListener)
    new_size = listener.buffer.size
    if new_size > listener.last_size[]
        listener.last_size[] = new_size
        new_contents = String(listener.buffer.data[1:new_size])
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
