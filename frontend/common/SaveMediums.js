export class GistSaveMedium {
    constructor(gist_file, token=null) {
        this.gh = GistUtils.getGitHub(token);
        // gist_id will be set later upon save
        this.gist_id = null;
        this.gist_file = gist_file;
    }
    getPath() {
        return this.gist_file;
    }
    async moveTo(new_path) {
        // TODO: Implement a move operation
        this.gist_file = new_path
    }
    async save(immediate=false) {
        return new Promise((resolve, reject) => {
            const save = () => {
                fetch("notebookfile" + window.location.search).then(res => res.text()).then(nb_content => {
                    this.gh.getGist(this.gist_id).update({
                        files: {
                            [this.gist_file]: {
                                content: nb_content
                            }
                        }
                    }).then(resolve).catch(reject)
                })
            }

            // The code below here waits until updates cease for 1 second before updating the gist
            if(this.saveTimeout) {
                clearTimeout(this.saveTimeout)
            }

            if(immediate) save()
            else {
                this.saveTimeout = setTimeout(save, 1000)
            }
        })
    }
}

let gistCache = null;

export const GistUtils = {
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

        return gistCache.filter(gist => Object.keys(gist.files)[0].toLowerCase().includes(query.toLowerCase()));
    },
    async getGistByFile(filename) {
        const gh = GistUtils.getGitHub();
        const gists = await gh.getUser().listGists();

        // This line will return null if a gist with that filename can't be found, and the gist json otherwise
        // NOTE: Only the first file in a gist is searched, so multiple file gists won't work properly
        return gists.data.find(gist => Object.keys(gist.files)[0] === filename);
    }
};

export class GDriveSaveMedium {
    // TODO: Implement Google Drive save interface
}


