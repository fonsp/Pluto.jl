"A `Token` can only be held by one async process at one time. Use `Base.take!(token)` to claim the token, `Base.put!(token)` to give the token back."
struct Token
    c::Channel{Nothing}
    Token() = let
        c = Channel{Nothing}(1)
        push!(c, nothing)
        new(c)
    end
end

Base.take!(token::Token) = Base.take!(token.c)
Base.put!(token::Token) = Base.put!(token.c, nothing)
Base.isready(token::Token) = Base.isready(token.c)
Base.wait(token::Token) = Base.put!(token.c, Base.take!(token.c))

function withtoken(f::Function, token::Token)
    take!(token)
    result = f()
    put!(token)
    result
end

###

"Track whether some task needs to be done. `request!(requestqueue)` will make sure that the task is done at least once after calling it. Multiple calls might get bundled into one."
mutable struct RequestQueue
    is_processing::Bool
    c::Channel{Nothing}
    RequestQueue() = new(false, Channel{Nothing}(1))
end

"Give a function (with no arguments) that should be called after a request."
function process(f::Function, requestqueue::RequestQueue)
    @assert !requestqueue.is_processing
    requestqueue.is_processing = true
    while true
        take!(requestqueue.c)
        f()
    end
end

function request!(queue::RequestQueue)
    if isready(queue.c)
        push!(queue.c, nothing)
    end
end

###

mutable struct Promise{T}
    value::Union{Nothing,Some{T}}
    task::Union{Nothing,Task}
end

"
    Promise(f::Function)

Run `f` asynchronously, and return a `Promise` to its result. Call `wait` on the returned `Promise` to await the result.

# Example

```
julia> p = Promise() do
    sleep(5)
    1 + 2
end;

julia> wait(p)
3
```

"
function Promise{T}(f::Function) where T
    p = Promise{T}(nothing, nothing)
    p.task = @async begin
        p.value = Some(f())
    end
    return p
end
Promise(f::Function) = Promise{Any}(f)

function Base.wait(p::Promise{T})::T where T
	wait(p.task)
	something(p.value)
end