import .ExpressionExplorer: SymbolsState, Parameter
import .Configuration

import UUIDs: uuid1

function detect_duplicated_methods(topology::NotebookTopology)
  function is_assigned_more_than_once(funcdefs::Pair{Array{Symbol,1}, FunctionDefs})::Bool
    length(funcdefs.second.signatures) > 1
  end
  
  functions_to_test = filter(is_assigned_more_than_once, topology.combined_funcdefs)
  if isempty(functions_to_test)
    return Dict()
  end

  mod = build_module(functions_to_test)

  # TODO: Remap errors to their actual cells
  errors = mapfoldl(f -> get_errors(f.first, mod), merge!, functions_to_test, init=Dict{DataType,Array{Method,1}}())
  errable_cells_id_syms = map(err_funcs -> map(f -> (UUID(string(f.file)), f.name), err_funcs), [func for (type, func) in errors]) |> Iterators.flatten |> collect

  errable_cells_id_syms
end

function build_module(combined_funcdefs::Dict{Vector{Symbol}, FunctionDefs})::Module
  referenced_types = map(t -> t.combined_symstates.signature, [def for (name, def) in combined_funcdefs]) |> Iterators.flatten |> unique

  # TODO: Make a cleaner naming scheme
  # Can we delete a module ?
  mod_name = Symbol("#$(uuid1())")
  type_defs = create_types(referenced_types)
  func_defs = create_functions(combined_funcdefs)
  mod_expr = Expr(:module, 
        true,
        mod_name,
        Expr(:block, type_defs..., func_defs...)
      )

  # TODO: it certainly is not a good idea to eval in Main
  # Investigate the Distributed module
  eval(mod_expr)
  eval(mod_name)
end

function create_types(types::Array{Parameter, 1})::Array{Expr, 1}
  is_not_primitive(t::Symbol) = !isdefined(Base, t)
  create_type(t::Symbol) = Expr(:struct, [false, t, Expr(:block)])

  map(create_type, filter(is_not_primitive, map(p -> convert_name(p.name), types)))
end

function create_signature(sig::Signature)::Array{Expr, 1}
  map(p -> Expr(:(::), convert_name(p.name)), sig)
end

# TODO: use params for FunctionDefs
function create_functions(funcdefs::Dict{Array{Symbol,1}, FunctionDefs})::Array{Expr,1}
  create_function(name, signature) = Expr(:function, Expr(:call, convert_name(name), create_signature(signature.second)...), Expr(:block, LineNumberNode(1, Symbol(signature.first))))
  map_funcdefs(def::Pair{Array{Symbol, 1}, FunctionDefs}) = map(sig -> create_function(def.first, sig), [funcdef for funcdef in def.second.signatures])

  map(map_funcdefs, [def for def in funcdefs]) |> Iterators.flatten |> collect
end

function get_errors(symbol, mod::Module)::Dict{DataType,Array{Method,1}}
  methods_table = Core.eval(mod, :(methods($(convert_name(symbol))).mt))

  in_module = Array{Method, 1}()
  Base.visit(methods_table) do m
    if m.module == mod
      push!(in_module, m)
    end
  end

  signatures = unique(map(m -> m.sig, in_module))

  definitions = Dict{DataType, Array{Method, 1}}(
    sig => filter(m -> m.sig == sig, in_module) for sig in signatures
  )

  filter(t -> length(t[2]) > 1, definitions)
end

function convert_name(name::Array{Symbol, 1})::Symbol
  Symbol(join(map(string, name), "."))
end
