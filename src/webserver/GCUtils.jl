module GCUtils

export setup_gc

mutable struct GCFullMetrics
    @atomic last_time::Float64
    @atomic counter::UInt64
    @atomic last_http_call_time::Float64
end

function setup_gc()
    gcfull_metrics = GCFullMetrics(0.0, 0, 0.0)

    function gcfull_automatic()
        e = @elapsed GC.gc(true)
        @atomic gcfull_metrics.last_time = time()
        @atomic gcfull_metrics.counter += 1
        @debug "GC full run (automatic)" time_taken = e
    end
    
    @atomic gcfull_metrics.last_http_call_time = time()
    @atomic gcfull_metrics.last_time = time()
    gc_event = Base.Event(true)
    hourly_task = Threads.@spawn :default begin # task that runs gc every hour
        while true
            last_gc = gcfull_metrics.last_time
            sleep_time = 3600.0 - (time() - last_gc)
            sleep_time > 0.0 && sleep(sleep_time)
            last_gc == gcfull_metrics.last_time && gcfull_automatic()
        end
    end

    responsive_task = Threads.@spawn :default begin # task that runs gc 5 sec after LAST http call
        while true
            wait(gc_event)
            sleep_time = 5.0 - (time() - gcfull_metrics.last_http_call_time)
            sleep_time > 0.0 && sleep(sleep_time)
            !gc_event.set && gcfull_automatic()
        end
    end

    function after_http()
        @atomic gcfull_metrics.last_http_call_time = time()
        notify(gc_event)
    end

    function cleanup()
        # TODO
    end
    return after_http, cleanup, [gcfull_metrics, hourly_task, responsive_task]
end

end # module
