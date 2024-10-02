# This code is taken from https://github.com/adrhill/BrowserMacros.jl
# Thank you Adrian Hill!! ❤️

# It is a bit tricky to add dependencies to PlutoRunner, so we copied the relevant parts here. Hopefully, this will eventually make it into Julia base (https://github.com/JuliaLang/julia/issues/47709)

# License of BrowserMacros.jl:

# MIT License

# Copyright (c) 2022 Adrian Hill <adrian.hill@mailbox.org>

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.


module BrowserMacrosLite

using Base: UUID, PkgId, load_path, url
using Pkg.Types: manifestfile_path, read_manifest
using Pkg
using Pkg.Operations: find_urls

ismatching(r::Regex, s) = !isnothing(match(r, s))
captures(r::Regex, s) = match(r, s).captures
onlycapture(r::Regex, s) = only(match(r, s).captures)

function rootmodule(m)
    pm = parentmodule(m)
    pm == m && return m
    return rootmodule(pm)
end

URI(x) = String(x)


const JULIA_REPO = "https://github.com/JuliaLang/julia"
const PKG_REPO = "https://github.com/JuliaLang/Pkg.jl"

# Step 1: determine type of repository
method_url(m::Method) = method_url(m, Val(repotype(m)))

function repotype(m::Method)
    path = String(m.file)
    !ismatching(r"src", path) && return :Base
    ismatching(r"stdlib", path) && return :stdlib
    return :external
end

# Step 2: assemble URL using heuristics
method_url(m::Method, ::Val{:Base}) = URI(Base.url(m))

function method_url(m::Method, ::Val{:stdlib})
    ver, package_name, path = captures(r"/stdlib/v(.*?)/(.*?)/src/(.*)", String(m.file))
    if package_name == "Pkg"
        return URI("$PKG_REPO/blob/release-$ver/src/$path#L$(m.line)")
    end
    return URI("$JULIA_REPO/blob/v$VERSION/stdlib/$package_name/src/$path#L$(m.line)")
end

function method_url(m::Method, ::Val{:external})
    path = onlycapture(r"/src/(.*)", String(m.file))
    id = PkgId(m.module)
    url = _url(id)
    ver = _version(id)
    if ismatching(r"gitlab", url)
        return URI("$url/~/blob/v$ver/src/$path#L$(m.line)")
    end
    return URI("$url/blob/v$ver/src/$path#L$(m.line)") # attempt GitHub-like URL
end

# Step 3: use Pkg internals to find repository URL
_manifest(loadpath) = read_manifest(manifestfile_path(dirname(loadpath)))

function _version(id::PkgId)
    for path in load_path()
        ismatching(r"julia/stdlib", path) && continue
        manifest = _manifest(path)
        pkg_entry = get(manifest, id.uuid, nothing)
        ver = hasproperty(pkg_entry, :version) ? pkg_entry.version : nothing
        !isnothing(ver) && return ver # else look up next environment in LOAD_PATH
    end
    return error("Could not find module $id in project dependencies.")
end

function _url(id::PkgId)
    urls = find_urls(Pkg.Registry.reachable_registries(), id.uuid)
    isempty(urls) && error("Could not find module $id in reachable registries.")
    return first(splitext(first(urls))) # strip ".git" ending
end

# To avoid code duplication, repo_url trims method_url until the fifth "/", e.g.:
#  https://github.com/foo/Bar.jl/blob/v0.1.0/src/qux.jl#L7 turns to
#  https://github.com/foo/Bar.jl
repo_url(m::Method) = _repo_url(method_url(m))
_repo_url(url::String) = URI(onlycapture(r"((?:.*?\/){4}(?:.*?))\/", url))


end
