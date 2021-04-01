import Pluto:throttled

@testset "Throttled" begin
    x = Ref(0)

    function f()
        x[] += 1
    end
    f()
    @test x[] == 1
    
    dt = 1 / 100
    ft, stop = throttled(f, dt)
    
    for x in 1:10
        ft()
    end
    @test x[] == 2
    sleep(2dt)
    @test x[] == 3
    
    for x in 1:10
        ft()
    end
    @test x[] == 4
    sleep(2dt)
    @test x[] == 5
    
    
    for x in 1:5
        ft()
        sleep(1.5dt)
    end
    @test x[] == 10
    sleep(2dt)
    @test x[] == 10
    
    ###
    
    ft()
    ft()
    @test x[] == 11
    stop()
    @test x[] == 12
    sleep(2dt)
    @test x[] == 12

    @test false
end
    