import REPL


"""
    is_pure_expression(expression::ReturnValue{Meta.parse})
Checks if an expression is approximately pure.
Not sure if the type signature conveys it, but this take anything that is returned from `Meta.parse`.
It obviously does not actually check if something is strictly pure, as `getproperty()` could be extended,
and suddenly there can be side effects everywhere. This is just an approximation.
"""
function is_pure_expression(expr::Expr)
    if expr.head == :. || expr.head === :curly || expr.head === :ref
        all((is_pure_expression(x) for x in expr.args))
    else
        false
    end
end
is_pure_expression(s::Symbol) = true
is_pure_expression(q::QuoteNode) = true
is_pure_expression(q::Number) = true
is_pure_expression(q::String) = true
is_pure_expression(x) = false # Better safe than sorry I guess

# Based on /base/docs/bindings.jl from Julia source code
function binding_from(x::Expr, workspace::Module)
    if x.head == :macrocall
        macro_name = x.args[1]
        if is_pure_expression(macro_name)
            Core.eval(workspace, macro_name)
        else
            error("Couldn't infer `$x` for Live Docs.")
        end
    elseif is_pure_expression(x)
        if x.head == :.
            # Simply calling Core.eval on `a.b` will retrieve the value instead of the binding
            m = Core.eval(workspace, x.args[1])
            isa(m, Module) && return Docs.Binding(m, x.args[2].value)
        end
        Core.eval(workspace, x)
    else
        error("Couldn't infer `$x` for Live Docs.")
    end
end
binding_from(s::Symbol, workspace::Module) = Docs.Binding(workspace, s)
binding_from(r::GlobalRef, workspace::Module) = Docs.Binding(r.mod, r.name)
binding_from(other, workspace::Module) = error("Invalid @var syntax `$other`.")

const DOC_SUGGESTION_LIMIT = 10

struct Suggestion
    match::String
    query::String
end

# inspired from REPL.printmatch()
function Base.show(io::IO, ::MIME"text/html", suggestion::Suggestion)
    print(io, "<a href=\"@ref\"><code>")
    is, _ = REPL.bestmatch(suggestion.query, suggestion.match)
    for (i, char) in enumerate(suggestion.match)
        esc_c = get(Markdown._htmlescape_chars, char, char)
        if i in is
            print(io, "<b>", esc_c, "</b>")
        else
            print(io, esc_c)
        end
    end
    print(io, "</code></a>")
end

"You say doc_fetcher, I say You say doc_fetcher, I say You say doc_fetcher, I say You say doc_fetcher, I say ...!!!!"
function doc_fetcher(query, workspace::Module)
    try
        parsed_query = Meta.parse(query; raise=false, depwarn=false)

        doc_md = if Meta.isexpr(parsed_query, (:incomplete, :error, :return)) && haskey(Docs.keywords, Symbol(query))
            Docs.parsedoc(Docs.keywords[Symbol(query)])
        else
            binding = binding_from(parsed_query, workspace)
            doc_md = Docs.doc(binding)

            if !showable(MIME("text/html"), doc_md)
                # PyPlot returns `Text{String}` objects from their docs...
                # which is a bit silly, but turns out it actually is markdown if you look hard enough.
                doc_md = Markdown.parse(repr(doc_md))
            end

            improve_docs!(doc_md, parsed_query, binding)
        end
        
        # TODO:
        # completion_value_type_inner
        # typeof(x) |> string
        # parentmodule(x) |> string

        (repr(MIME("text/html"), doc_md), :👍)
    catch ex
        (nothing, :👎)
    end
end



function improve_docs!(doc_md::Markdown.MD, query::Symbol, binding::Docs.Binding)
    # Reverse latex search ("\scrH" -> "\srcH<tab>")

    symbol = string(query)
    latex = REPL.symbol_latex(symbol)

    if !isempty(latex)
        push!(doc_md.content,
              Markdown.HorizontalRule(),
              Markdown.Paragraph([
                  Markdown.Code(symbol),
                  " can be typed by ",
                  Markdown.Code(latex),
                  Base.Docs.HTML("<kbd>&lt;tab&gt;</kbd>"),
                  ".",
              ]))
    end
    
    # Add function signature if it's not there already
    
    

    # Add suggestions results if no docstring was found

    if !Docs.defined(binding) &&
        haskey(doc_md.meta, :results) &&
        isempty(doc_md.meta[:results])

        suggestions = REPL.accessible(binding.mod)
        suggestions_scores = map(s -> REPL.fuzzyscore(symbol, s), suggestions)
        removed_indices = [i for (i, s) in enumerate(suggestions_scores) if s < 0]
        deleteat!(suggestions_scores, removed_indices)
        deleteat!(suggestions, removed_indices)

        perm = sortperm(suggestions_scores; rev=true)
        permute!(suggestions, perm)
        links = map(s -> Suggestion(string(s), symbol), Iterators.take(suggestions, DOC_SUGGESTION_LIMIT))

        if length(links) > 0
            push!(doc_md.content,
                  Markdown.HorizontalRule(),
                  Markdown.Paragraph(["Similar result$(length(links) > 1 ? "s" : ""):"]),
                  Markdown.List(links))
        end
    end

    doc_md
end
improve_docs!(other, _, _) = other



