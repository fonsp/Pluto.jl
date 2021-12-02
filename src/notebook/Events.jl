abstract type PlutoEvent end

struct FileSaveEvent <: PlutoEvent
    notebook::Notebook
    fileContent::String
    path::String
end

FileSaveEvent(notebook::Notebook) = begin
    fileContent = sprint() do io
        save_notebook(io, notebook)
    end
    FileSaveEvent(notebook, fileContent, notebook.path)
end

struct FileEditEvent <: PlutoEvent
    notebook::Notebook
    fileContent::String
    path::String
end