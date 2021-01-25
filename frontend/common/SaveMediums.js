export const SaveStatuses = {
    IDLE: 0,
    SAVING: 1,
    ERROR: 2
}

export class SaveMedium {
    constructor() {
        this.updateListeners = [];
        this.saveTimeout = null;
    }

    getPath() {}
    getExtras() { return {} }
    moveTo() {}
    save() {}
    load() {}
    status() {}

    // Listener for state changes
    onUpdate(listener) {
        this.updateListeners.push(listener);
    }
    update() {
        for(let listener of this.updateListeners) {
            listener();
        }
    }

    scheduleSave() {
        // The code below here waits until updates cease for 1 second before updating the gist
        if(this.saveTimeout === null) {
            const handleSave = () => {
                this.save();
                this.saveTimeout = null;
            };
            handleSave.bind(this);
            this.saveStatus = SaveStatuses.SAVING;
            this.update();
            this.saveTimeout = setTimeout(handleSave, 1000)
        }
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

        this.saveStatus = SaveStatuses.IDLE;

        this.fileHandle = extras ? extras : null;
        if(this.fileHandle) {
            this.firstSave = true;
            // TODO: Find better solution for activating editor
            // window.addEventListener('mousedown', () => {
            //     if(this.firstSave) {
            //         this.save()
            //         this.firstSave = false;
            //     }
            // });
        }
        else {
            this._openSystemDialog()
        }
    }

    getPath() {
        return this.fileHandle?.name || 'Save notebook...'
    }
    getExtras() {
        if(this.fileHandle) return this.fileHandle;
        return {}
    }
    async moveTo() {
        this.saveAfterSelected = true
        await this._openSystemDialog()
        return true
    }
    async save() {
        const content = await super.getNotebookContent()

        if(this.fileHandle) {
            try {
                const stream = await this.fileHandle.createWritable()
                await stream.write(content)
                await stream.close()
                this.saveStatus = SaveStatuses.IDLE;
                setTimeout(() => {
                    this.update();
                }, 1000);
            }
            catch(e) {
                this.saveStatus = SaveStatuses.ERROR;
                this.update();
                throw e;
            }
        }
        else {
            this.saveAfterSelected = true
            this.saveStatus = SaveStatuses.IDLE;
            this.update();
        }
    }
    async load() {
        if(this.fileHandle) {
            const file = await this.fileHandle.getFile()
            return await file.text()
        }
        else {
            throw new Error('A browser-saved notebook cannot be loaded without an initialized FileHandle')
        }
    }
    status() {
        return this.saveStatus;
    }

    async _openSystemDialog() {
        try {
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
            // Not a huge deal. Usually happens because the user doesn't initiate the open themselves
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


let idb = null;

const request_idb = () => {
    return new Promise((resolve, reject) => {
        if(idb) {
            resolve(idb);
            return;
        }

        const request = indexedDB.open('ExternalNotebooks')
        request.onerror = reject;
        request.onsuccess = (e) => {
            idb = e.target.result;
            resolve(idb);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            const store = db.createObjectStore('notebooks', { keyPath: 'path' });
            store.transaction.oncomplete = (e) => {
                console.log('Created IndexedDB for External Notebooks')
            }
        }
    });
}


export const update_external_notebooks = (notebook_path, save_medium, old_path=null) => {
    return new Promise((resolve, reject) => {
        const medium_type = save_medium.constructor.name;
        const medium_args = [save_medium.getPath(), save_medium.getExtras()]

        request_idb().then(db => {
            const store = db.transaction('notebooks', 'readwrite').objectStore('notebooks');

            // Handle deletion of old entry
            if(old_path) {
                const delOldReq = store.delete(old_path);
                delOldReq.onerror = (e) => {
                    console.warn('Failed to remove old_path external notebook entry');
                    console.log(e);
                }
                delOldReq.onsuccess = (e) => {} // No-op
            }

            // Handle creation / update
            const nbReq = store.get(notebook_path);
            nbReq.onerror = (e) => reject;
            nbReq.onsuccess = (e) => {
                const data = e.target.result;

                // An entry already exists, so update it
                if(data) {
                    data.type = medium_type;
                    data.args = medium_args;

                    const nbReqUpdate = store.put(data);
                    nbReqUpdate.onerror = reject;
                    nbReqUpdate.onsuccess = resolve;
                }
                // An entry doesn't exist, so create it
                else {
                    const nbReqAdd = store.add({
                        path: notebook_path,
                        type: medium_type,
                        args: medium_args
                    });
                    nbReqAdd.onerror = reject;
                    nbReqAdd.onsuccess = resolve;
                }
            }
        })
    });

    // const storedGists = JSON.parse(localStorage.getItem('external notebooks') || '{}')
    // storedGists[notebook_path] = { type: save_medium.constructor.name, args: medium_args }
    // if(old_path) delete storedGists[old_path]
    // localStorage.setItem('external notebooks', JSON.stringify(storedGists))
}

export const get_external_notebook = (notebook_path) => {
    return new Promise((resolve, reject) => {
        request_idb().then((db) => {
            const store = db.transaction('notebooks', 'readwrite').objectStore('notebooks')
            const nbReq = store.get(notebook_path)
            nbReq.onerror = (e) => {
                // Entry doesn't exist
                reject(e);
            }
            nbReq.onsuccess = (e) => {
                resolve(e.target.result);
            }
        }).catch(reject);
    });
}

export const get_all_external_notebooks = () => {
    return new Promise((resolve, reject) => {
        request_idb().then((db) => {
            const store = db.transaction('notebooks').objectStore('notebooks');
            const out_obj = {};
            store.openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if(cursor) {
                    out_obj[cursor.key] = cursor.value;
                    cursor.continue();
                }
                else {
                    resolve(out_obj);
                }
            };
        }).catch(reject);
    });
}


export const Mediums = { BrowserLocalSaveMedium };
