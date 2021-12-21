using Test

import Pluto: Notebook, ServerSession, ClientSession, Cell, load_notebook, load_notebook_nobackup, save_notebook, WorkspaceManager, cutename, numbered_until_new, readwrite, without_pluto_file_extension
import Random
import Pkg
import UUIDs: UUID

@testset "Private API stability for extended Pluto deployments" begin

# Pluto.CustomLaunchEvent: Gets fired
# Pluto.NewNotebookEvent: Gets fired
# Pluto.OpenNotebookEvent: Gets fired
# Pluto.FileSaveEvent: Gets fired
# Pluto.responses[:juliahub_initiate] = function (🙋::Pluto.ClientRequest) EXTEND end
# Pluto.SessionActions.open(session, string(jhnb_path); notebook_id = UUID(jhub_params[:id]),)
# Pluto.cutename(): returns string
# Pluto.save_notebook(io::IOBuffer, notebook): saves notebook to IO
# Pluto.ServerSession(;options, event_listener)

end