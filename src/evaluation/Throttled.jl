module Throttled

import Base.Threads


struct ThrottledFunction
    f::Function
    timeout::Real
    runtime_multiplier::Float64
    tlock::ReentrantLock
    iscoolnow::Ref{Bool}
    run_later::Ref{Bool}
    last_runtime::Ref{Float64}
end

"Run the function now"
function Base.flush(tf::ThrottledFunction)
    lock(tf.tlock) do
        tf.run_later[] = false
        tf.last_runtime[] = @elapsed result = tf.f()
        result
    end
end

"Start the cooldown period. If at the end, a run_later[] is set, then we run the function and schedule the next cooldown period."
function schedule(tf::ThrottledFunction)
    # if the last runtime was quite long, increase the sleep period to match.
    Timer(tf.timeout + tf.last_runtime[] * tf.runtime_multiplier) do _t
        if tf.run_later[]
            flush(tf)
            schedule(tf)
        else
            tf.iscoolnow[] = true
        end
    end
end

function (tf::ThrottledFunction)()
    if tf.iscoolnow[]
        tf.iscoolnow[] = false
        flush(tf)
        schedule(tf)
    else
        tf.run_later[] = true
    end
    nothing
end





"""
throttled(f::Function, timeout::Real)

Return a function that when invoked, will only be triggered at most once
during `timeout` seconds.
The throttled function will run as much as it can, without ever
going more than once per `wait` duration.

This throttle is 'leading' and has some other properties that are specifically designed for our use in Pluto, see the tests.

Inspired by FluxML
See: https://github.com/FluxML/Flux.jl/blob/8afedcd6723112ff611555e350a8c84f4e1ad686/src/utils.jl#L662
"""
function throttled(f::Function, timeout::Real; runtime_multiplier::Float64=0.0)
    tlock = ReentrantLock()
    iscoolnow = Ref(false)
    run_later = Ref(false)
    last_runtime = Ref(0.0)

    tf = ThrottledFunction(f, timeout, runtime_multiplier, tlock, iscoolnow, run_later, last_runtime)
    
    # we initialize hot, and start the cooldown period immediately
    schedule(tf)
    
    return tf
end

"""
Given a throttled function, skip any pending run if hot (but let the cooldown period continue), or start the cooldown period if cool. This forces the throttled function to not fire for a little while.

Argument should be the first function returned by `throttled`.
"""
function force_throttle_without_run(tf::ThrottledFunction)
	tf.run_later[] = false
	if tf.iscoolnow[]
		tf.iscoolnow[] = false
		schedule(tf)
	end
end

force_throttle_without_run(::Function) = nothing


"""
    simple_leading_throttle(f, delay::Real)

Return a function that when invoked, will only be triggered at most once
during `timeout` seconds.
The throttled function will run as much as it can, without ever
going more than once per `wait` duration.

Compared to [`throttled`](@ref), this simple function only implements [leading](https://css-tricks.com/debouncing-throttling-explained-examples/) throttling and accepts function with arbitrary number of positional and keyword arguments.
"""
function simple_leading_throttle(f, delay::Real)
    last_time = 0.0
    return function(args...;kwargs...)
        now = time()
        if now - last_time > delay
            last_time = now
            f(args...;kwargs...)
        end
    end
end

end