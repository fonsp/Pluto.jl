import Pluto:throttled

@testset "Throttled" begin
    x = Ref(0)

    function f()
        x[] += 1
    end
    f()
    @test x[] == 1
    
    dt = 1 / 100
    ft, stop = throttled(f, dt; leading=false, trailing=true)
    
    for x in 1:10
        ft()
    end
    @test x[] == 1 # Update scheduled
    sleep(2dt)
    @test x[] == 2 # Update done
    
    for x in 1:10
        ft()
    end
    @test x[] == 2 # Update scheduled
    sleep(2dt)
    @test x[] == 3 # Update done
    
    
    for x in 1:5
        ft() 
        sleep(1.5dt) # wait to go through
    end
    @test x[] == 8 # all updates happened
    sleep(2dt) 
    @test x[] == 8 # no new updates
    
    ###
    
    ft() # schedule
    ft() # schedule
    @test x[] == 8
    stop() # cancel schedule and run
    @test x[] == 9
    sleep(2dt) # cancel works
    @test x[] == 9

    @test false
end
    