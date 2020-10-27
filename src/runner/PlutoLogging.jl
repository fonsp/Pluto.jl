###
# LOGGING
###

module PlutoLogging

import Logging
import Distributed
import ..PlutoRunner: current_module

export log_channel

const log_channel = Channel{Any}(10)
const old_logger = Ref{Any}(nothing)

struct PlutoLogger <: Logging.AbstractLogger
    stream
end

function Logging.shouldlog(::PlutoLogger, level, _module, _...)
    # Accept logs
    # - From the user's workspace module
    # - Info level and above for other modules
    _module === current_module || convert(Logging.LogLevel, level) >= Logging.Info
end
Logging.min_enabled_level(::PlutoLogger) = Logging.Debug
Logging.catch_exceptions(::PlutoLogger) = false
function Logging.handle_message(::PlutoLogger, level, msg, _module, group, id, file, line; kwargs...)
    try
        put!(log_channel, (
            level=string(level),
            msg=(msg isa String) ? msg : repr(msg),
            group=group,
            # id=id,
            file=file,
            line=line,
            kwargs=Dict((k=>repr(v) for (k,v) in kwargs)...),
        ))
        # also print to console
        Logging.handle_message(old_logger[], level, msg, _module, group, id, file, line; kwargs...)
    catch e
        println(stderr, "Failed to relay log from PlutoRunner")
        showerror(stderr, e, stacktrace(catch_backtrace()))
    end
end

# we put this in __init__ to fix a world age problem
function __init__()
    if Distributed.myid() != 1
        old_logger[] = Logging.global_logger()
        Logging.global_logger(PlutoLogger(nothing))
    end
end

end