// @ts-nocheck

/*
Some packages look for `process.env`, so we give it to them.
*/
/*
Why not just `window.process = { env: NODE_ENV }`?
I once had an extension that was broken and exported its `window.process` to all pages.
I'm not saying we should support that, but this code made it work.
The extension itself is now fixed, but this might just work when an extension
  does something similar in the future 🤷‍♀️
*/

try {
    if (window.process == null) {
        window.process = {}
    }
    if (window.process.env == null) {
        window.process.env = {}
    }
    window.process.env.NODE_ENV = "production"
} catch (err) {
    console.warn(`Couldn't set window.process.env, this might break some things`)
}
