import Pluto:throttled

@testset "Throttled" begin    
    x = Ref(0)
    
    function f()
    	x[] += 1
    end
    f()
    # f was not throttled
    @test x[] == 1
    
    dt = 4 / 100
    ft, flush = throttled(f, dt)
    
    for x in 1:10
    	ft()
    end
    # we have an initial cooldown period in which f should not fire...
    # ...so x is still 1...
    @test x[] == 1
    sleep(2dt)
    # ...but after a delay, the call should go through.
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
    flush()
    @test x[] == 13
    sleep(2dt)
    @test x[] == 13

end