export class SaveMedium {
    constructor() {}

    getPath() {}
    getExtras() { return {} }
    moveTo() {}
    save() {}
    load() {}

    scheduleSave() {
        // The code below here waits until updates cease for 1 second before updating the gist
        if(this.saveTimeout) {
            clearTimeout(this.saveTimeout)
        }

        this.saveTimeout = setTimeout(this.save.bind(this), 1000)
    }
    getNotebookContent() {
        return fetch("notebookfile" + window.location.search).then(res => res.text())
    }
}
SaveMedium.autocomplete = async (oldLine, cursor, options) => {
    throw new Error('Autocomplete was not implemented by this save medium!');
}
SaveMedium.authenticated = async () => {}
SaveMedium.displayName = 'IF YOU SEE THIS YOU FORGOT TO SET DISPLAY NAME ON YOUR MEDIUM';
SaveMedium.displayIcon = '';


export class BrowserLocalSaveMedium extends SaveMedium {
    // Path in this case is meaningless
    constructor(path, extras) {
        super();

        this.fileHandle = null;

        this._openSystemDialog()
    }

    getPath() {
        return this.fileHandle?.name || 'notebook.jl'
    }
    getExtras() {
        console.log(this.fileHandle)
        if(this.fileHandle) return this.fileHandle;
        return {}
    }
    async moveTo() {
        await this._openSystemDialog()
        return true
    }
    async save() {
        const content = await super.getNotebookContent()

        if(this.fileHandle) {
            const stream = await this.fileHandle.createWritable()
            await stream.write(content)
            await stream.close()
        }
        else {
            this.saveAfterSelected = true
        }
        console.log('written to file')
    }
    load() {}

    async _openSystemDialog() {
        try {
            console.log('requesting file picker open')
            const options = {
                types: [{
                    description: 'Pluto Notebook',
                    accept: {
                      'application/julia': ['.jl'],
                    }
                }]
            }
            this.fileHandle = await window.showSaveFilePicker(options)
            
            if(this.saveAfterSelected) {
                this.saveAfterSelected = false

                await this.save()
            }
        }
        catch(e) {
            console.log('failed')
        }
    }
}
BrowserLocalSaveMedium.autocomplete = (oldLine, cursor, options) => {
    const styledResults = []
    if(options.suggest_new_file != null) {
        const nb_name = oldLine.trim() === '' ? 'notebook' : oldLine.trim().replace(/(\.|\.j|\.jl)$/g, '')
        const nb_file = nb_name + '.jl'

        styledResults.push({
            text: nb_file,
            displayText: `${nb_file} (new)`,
            className: 'file new'
        });
    }
    return {
        list: oldLine.endsWith('.jl') ? [] : styledResults,
        from: CodeMirror.Pos(cursor.line, 0),
        to: CodeMirror.Pos(cursor.line, oldLine.length)
    }
}
BrowserLocalSaveMedium.authenticated = () => true; // No need for token auth here
BrowserLocalSaveMedium.displayName = 'Client-side Local';
BrowserLocalSaveMedium.displayIcon = '/img/mark-github.svg';


export const update_external_notebooks = (notebook_path, save_medium, medium_args, old_path=null) => {
    const storedGists = JSON.parse(localStorage.getItem('external notebooks') || '{}')
    storedGists[notebook_path] = { type: save_medium.constructor.name, args: medium_args }
    if(old_path) delete storedGists[old_path]
    localStorage.setItem('external notebooks', JSON.stringify(storedGists))
}

export const get_external_notebook = (notebook_path) => {
    const storedGists = JSON.parse(localStorage.getItem('external notebooks') || '{}')
    return storedGists[notebook_path]
}


export const Mediums = { BrowserLocalSaveMedium };
