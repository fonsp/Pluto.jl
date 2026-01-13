@testset "Misc API" begin
    
    
    @testset "is_single_expression" begin
        
        @test Pluto.is_single_expression("")
        @test Pluto.is_single_expression("a")
        @test Pluto.is_single_expression("a + 1")
        @test Pluto.is_single_expression("a; a + 1")
        @test !Pluto.is_single_expression("""
            a = 1
            a + 1
        """)
        
        @test Pluto.is_single_expression("""
            "yooo"
            function f(x)
                X   
                C \\ c
            end
        """)
        
        
        @test Pluto.is_single_expression("""
            # asdf
            
            "yooo"
            function f(x)
                X   
                C \\ c
            end; # aasasdf
        """)
        
        
        
        @test Pluto.is_single_expression("""
            a a a a a // / // / 123 1 21 1313
        """)
        
        
        
    end
end