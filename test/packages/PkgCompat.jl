import Pluto.PkgCompat
import Pluto
using Test
import Pkg


@testset "PkgCompat" begin

    @testset "Available versions" begin
        vs = PkgCompat.package_versions("HTTP")
        
        @test v"0.9.0" ∈ vs
        @test v"0.9.1" ∈ vs
        @test "stdlib" ∉ vs
        @test PkgCompat.package_exists("HTTP")

        vs = PkgCompat.package_versions("Dates")

        @test vs == ["stdlib"]
        @test PkgCompat.package_exists("Dates")

        @test PkgCompat.is_stdlib("Dates")
        @test !PkgCompat.is_stdlib("PlutoUI")


        vs = PkgCompat.package_versions("Dateskjashdfkjahsdfkjh")

        @test isempty(vs)
        @test !PkgCompat.package_exists("Dateskjashdfkjahsdfkjh")
    end

    @testset "Installed versions" begin
        # we are querying the package environment that is currently active for testing
        ctx = Pkg.Types.Context()

        @test PkgCompat.get_manifest_version(ctx, "Pluto") == Pluto.PLUTO_VERSION
        @test PkgCompat.get_manifest_version(ctx, "HTTP") > v"0.8.0"
        @test PkgCompat.get_manifest_version(ctx, "UUIDs") == "stdlib"

    end

    @testset "Completions" begin
        cs = PkgCompat.package_completions("Hyper")
        @test "HypertextLiteral" ∈ cs
        @test "Hyperscript" ∈ cs

        cs = PkgCompat.package_completions("Date")
        @test "Dates" ∈ cs

        cs = PkgCompat.package_completions("Dateskjashdfkjahsdfkjh")

        @test isempty(cs)
    end


    @testset "Misc" begin
        PkgCompat.create_empty_ctx()
    end
end
