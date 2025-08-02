const text = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ 7c7c5b40-f5c1-11eb-2c1e-c54e5c3b4c8d
md"# Test Notebook"

# ╔═╡ a1b2c3d4-f5c1-11eb-1234-567890abcdef
x = 42

# ╔═╡ Cell order:
# ╠═7c7c5b40-f5c1-11eb-2c1e-c54e5c3b4c8d
# ╠═a1b2c3d4-f5c1-11eb-1234-567890abcdef
`;

let pluto = new Pluto("http://localhost:1234");
let notebooks = await pluto.getRunningNotebooks();
if (!notebooks.length) {
  await pluto.createNotebook(text);
}
notebooks = await pluto.getRunningNotebooks();

let notebook = new PlutoNotebook(pluto.ws_address, notebooks[0].notebook_id);
await notebook.connect();

const cell_id = await notebook.addCell(0, "sleep(2)");

const waitForCellId = async (cell_id) => {
  return new Promise((resolve, reject) => {
    let now = Date.now();
    let last = null;
    let reset = () => {};
    const fn = ({ type, data }) => {
      if (type === "notebook_updated") {
        last = data.notebook.cell_results[cell_id];
        const { queued, running, output } = data.notebook.cell_results[cell_id];
        if (
          last &&
          !queued &&
          !running &&
          output.last_run_timestamp * 1000 > now
        ) {
          reset();
          resolve(data.notebook.cell_results[cell_id]);
        }
      }
    };
    reset = notebook.onUpdate(fn);
  });
};

let cell = await waitForCellId(cell_id);
