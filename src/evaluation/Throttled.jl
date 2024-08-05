import Base.Threads

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

    function flush()
        lock(tlock) do
            run_later[] = false
            last_runtime[] = @elapsed result = f()
            result
        end
    end

    function schedule()
        # if the last runtime was quite long, increase the sleep period to match.
        Timer(timeout + last_runtime[] * runtime_multiplier) do _t
            if run_later[]
                flush()
                schedule()
            else
                iscoolnow[] = true
            end
        end
    end
    # we initialize hot, and start the cooldown period immediately
    schedule()

    function throttled_f()
        if iscoolnow[]
            iscoolnow[] = false
            flush()
            schedule()
        else
            run_later[] = true
        end
    end

    return throttled_f, flush
end


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