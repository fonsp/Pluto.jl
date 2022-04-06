using Test
import Logging
import Pluto: Configuration, Notebook, ServerSession, ClientSession, update_run!, Cell, WorkspaceManager, save_notebook


@testset "Frontmatter" begin
    d = Dict{String,Any}("title" => 123, "wow" => ["a", "b"])
    e = Dict{String,Any}()
    cases = [
        1 => (
            Notebook([
                Cell("""
                frontmatter = Dict{Any,Any}("title" => 123, "wow" => ["a", "b"])
                """),
            ]),
            d,
        ),
        2 => (
            Notebook([
                Cell("""
                frontmatter = (title = 123, wow = ["a", "b"])
                """),
            ]),
            d
        ),
        3 => (
            Notebook([
                Cell("""
                frontmatter = 123
                """),
            ]),
            e
        ),
        4 => (
            Notebook([
                Cell("""
                frontmatter = 123
                """),
                Cell("""
                frontmatter = 123
                """),
            ]),
            e            
        ),
        5 => (
            Notebook([
                Cell("""
                """),
            ]),
            e            
        ),
    ]
    
    @testset "Notebook $i" for (i, (nb, expected)) in cases
        save_notebook(nb)
        
        Logging.with_logger(Logging.NullLogger()) do
            @test Pluto.frontmatter(nb.path) == expected
            @test Pluto.frontmatter(nb) == expected
            @test typeof(Pluto.frontmatter(nb)) === Dict{String,Any}
        end
        
        if i ∈ (3,4)
            @test_throws Exception Pluto.frontmatter(nb.path, raise=true)
        end
        
    end
end
