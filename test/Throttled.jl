import Pluto: Throttled
using Pluto.WorkspaceManager: poll

@testset "Throttled" begin    
    x = Ref(0)
    
    function f()
    	x[] += 1
    end
    f()
    # f was not throttled
    @test x[] == 1
    
    dt = 4 / 100
    ft = Throttled.throttled(f, dt)
    
    for x in 1:10
    	ft()
    end
    # we have an initial cooldown period in which f should not fire...
    # ...so x is still 1...
    @test x[] == 1
    sleep(1.5dt)
    # ...but after a delay, the call should go through.
    @test x[] == 2
    
    # Let's wait for the cooldown period to end
    sleep(dt)
    # nothing should have changed
    @test x[] == 2

    # sleep(0) ## ASYNC MAGIC :(

    # at this point, the *initial* cooldown period is over
    # and the cooldown period for the first throttled calls is over

    for x in 1:10
    	ft()
    end
    # we want to send plots to the user as soon as they are available,
    # so no leading timeout
    @test x[] == 3
    # the 2nd until 10th calls were still queued
    sleep(2dt)
    @test x[] == 4
    
    
    for x in 1:5
    	ft()
    	sleep(1.5dt)
    end
    @test x[] == 9
    sleep(2dt)
    @test x[] == 9
    
    
    ###
    
    # "call 1"
    ft()
    # no leading timeout, immediately set to 10
    @test x[] == 10
    
    sleep(.5dt)
    
    # "call 2"
    ft()
    # throttled
    @test x[] == 10
    
    sleep(.7dt)
    
    # we waited 1.2dt > dt seconds since "call 1", which should have started the dt cooldown. "call 2" landed during that calldown, and should have triggered by now
    @test x[] == 11
    
    
    sleep(2dt)
    @test x[] == 11
    
    ###
    
    ft()
    ft()
    @test x[] == 12
    flush(ft)
    @test x[] == 13
    sleep(2dt)
    @test x[] == 13

    ####
    
    ft()
    @test poll(2dt, dt/60) do
        x[] == 14
    end
    # immediately fire again, right after the last fire
    ft()
    ft()
    # this should not do anything, because we are still in the cooldown period
    @test x[] == 14
    # not even after a little while
    sleep(0.1dt)
    @test x[] == 14
    
    # but eventually, our call should get queued
    sleep(dt)
    @test x[] == 15
    sleep(2dt)
    
    ####
    x[] = 0
    Throttled.force_throttle_without_run(ft)
    @test x[] == 0
    ft()
    @test x[] == 0
    sleep(.1dt)
    @test x[] == 0
    sleep(2dt)
    @test x[] == 1
    
    
    ft()
    @test x[] == 2
    sleep(.1dt)
    ft()
    Throttled.force_throttle_without_run(ft)
    @test x[] == 2
    sleep(2dt)
    @test x[] == 2
    
    
    ft()
    @test x[] == 3
    sleep(2dt)
    
    ####
    
end