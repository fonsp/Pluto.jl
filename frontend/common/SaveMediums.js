export class SaveMedium {
    constructor() {}

    getPath() {}
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
}
SaveMedium.autocomplete = async (oldLine, cursor, options) => {
    throw new Error('Autocomplete was not implemented by this save medium!');
}
SaveMedium.authenticated = async () => {}
SaveMedium.displayName = 'IF YOU SEE THIS YOU FORGOT TO SET DISPLAY NAME ON YOUR MEDIUM';
SaveMedium.displayIcon = '';


// WARNING: If you are exposing any of these utilities externally you are doing something WRONG
// Please consider adding interface methods if new functionality is required externally
let gistCache = null;
const GistUtils = {
    getGitHub(custom_token=null) {
        if(!custom_token && !GistUtils.authenticated()) {
            throw new Error('User is not authenticated for GitHub');
        }
        return new GitHub({ token: custom_token || GistUtils.getToken() })
    },
    getToken() {
        return localStorage.getItem('ghtoken');
    },
    authenticated() {
        if(!GistUtils.getToken()) return false;

        // TODO: Check if the token is valid before returning true

        return true;
    },
    async search(query) {
        if(!query || query === '') return [];

        const gh = GistUtils.getGitHub();
        if(!gistCache) {
            const gists = await gh.getUser().listGists();
            gistCache = gists.data;
        }

        return gistCache.filter(gist => Object.keys(gist.files)[0].endsWith('.jl')).filter(gist => Object.keys(gist.files)[0].toLowerCase().includes(query.toLowerCase()));
    },
    async getGistByFile(filename) {
        const gh = GistUtils.getGitHub();
        const gists = await gh.getUser().listGists();

        // This line will return null if a gist with that filename can't be found, and the gist json otherwise
        // NOTE: Only the first file in a gist is searched, so multiple file gists won't work properly
        return gists.data.find(gist => Object.keys(gist.files)[0] === filename);
    }
};

export class GistSaveMedium extends SaveMedium {
    constructor(gist_file, token=null) {
        super();

        this.gh = GistUtils.getGitHub(token);
        // gist_id will be set later upon save
        this.gist_id_checked = false;
        this.gist_id = null;
        this.gist_file = gist_file;
    }
    getPath() {
        return this.gist_file;
    }
    async moveTo(new_path) {
        // This needs to be first so it is captured in the state update
        await this._checkGistId();
        await this.gh.getGist(this.gist_id).delete();

        this.gist_file = new_path;
        this.gist_id = null;
        this.gist_id_checked = false;

        await this.save();
    }
    save() {
        return new Promise((async (resolve, reject) => {
            await this._checkGistId();

            fetch("notebookfile" + window.location.search).then(res => res.text()).then(nb_content => {
                this.gh.getGist(this.gist_id).update({
                    files: {
                        [this.gist_file]: {
                            content: nb_content
                        }
                    }
                }).then(resolve).catch(reject)
            })
        }))
    }
    async load() {
        await this._checkGistId(false);

        const gist = await this.gh.getGist(this.gist_id).read();
        return gist.data.files[Object.keys(gist.data.files)[0]].content;
    }
    async _checkGistId(create_if_missing=true) {
        // Check to make sure its a valid gist id before proceeding
        if(!this.gist_id_checked) {
            if(this.gist_id && this.gist_id.length > 0) {
                try {
                    await this.gh.getGist(this.gist_id).read()
                }
                catch(e) {
                    // Error getting gist; assume it doesn't exist
                    console.log(e)
                    return
                }
            }
            // Otherwise make a new gist and provide its id
            else {
                const possible_gist = await GistUtils.getGistByFile(this.gist_file);

                if(possible_gist) {
                    this.gist_id = possible_gist.id;
                }
                else if(create_if_missing) {
                    this.gist_id = (await this.gh.getGist().create({
                        public: false,  // TODO: Make this configurable
                        files: {
                            [this.gist_file]: { content: '# Pluto.jl init' }
                        }
                    })).data.id;
                }
                else {
                    throw new Error('No gist could be matched to the provided filename');
                }
            }
            
            this.gist_id_checked = true;

            console.log('gist id: ' + this.gist_id);
        }
    }
}
GistSaveMedium.autocomplete = (oldLine, cursor, options) => {
    return GistUtils.search(oldLine).then((matchingGists) => {
        // A confusing little line that says to give no suggestions if there is a perfect match, and
        // otherwise give the matches from the search query
        const styledResults = matchingGists.find(gist => Object.keys(gist.files)[0] === oldLine) ? [] : matchingGists.map(gist => ({
            text: Object.keys(gist.files)[0],
            className: 'file'
        }))
        if(options.suggest_new_file != null) {
            const nb_name = oldLine.trim() === '' ? 'notebook' : oldLine.trim().replace(/(\.|\.j|\.jl)$/g, '')
            const nb_file = nb_name + '.jl'
            if(!matchingGists.find(gist => Object.keys(gist.files)[0] === nb_file)) {
                styledResults.push({
                    text: nb_file,
                    displayText: `${nb_file} (new)`,
                    className: 'file new'
                });
            }
        }
        return {
            list: oldLine.endsWith('.jl') ? [] : styledResults,
            from: CodeMirror.Pos(cursor.line, 0),
            to: CodeMirror.Pos(cursor.line, oldLine.length)
        }
    })
}
GistSaveMedium.authenticated = GistUtils.authenticated;
GistSaveMedium.displayName = 'Gist';
GistSaveMedium.displayIcon = '/img/mark-github.svg';


export class GDriveSaveMedium {
    // TODO: Implement Google Drive save interface
}


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


export const Mediums = { GistSaveMedium };
