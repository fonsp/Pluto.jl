# Instructions for `Pluto.jl` developers

Hey! Thank you for your interested in working on ~THE FUTURE~ our modest little project! There are a number of ways that you can contribute:

### If you like using Pluto
Use it often, and leave feedback with the built-in suggestion box! We only have a limited view of all the things that can be done with Julia, so it is up to YOU to figure it out, and let us know! **If you are interested in educational writing**, and you have a topic that you want to share, consider writing a sample notebook for Pluto! We want to get a diverse set of topics. Here are some notes:

- A sample notebook can - and should - _invite the reader to explore_. How can you use that to teach something new?
- Try to match the atmosphere and style of existing sample notebooks - more like a conversation, less like a script.
- Sample notebooks will have the [Unlicense](https://github.com/fonsp/Pluto.jl/blob/master/sample/LICENSE) - do you agree?
- Contact us before, during and after writing a sample notebook, to make sure that we are all on the same page.

### If you want to work with Julia
Pluto needs more sample notebooks, example code, and good compatibility with other packages. Many packages work well in Pluto, but some were designed with a specific IDE in mind (e.g. Jupyter, Juno). Getting them working with Pluto is often a minor fix!

As for working with Pluto's internals - the exciting work behind the Julia backend of Pluto is mostly done. (Most upcoming goals are JavaScript projects.) However, there are many long-term goals that require tricky Julia code, so if you are interested, have a look there!

### If you want to work with JavaScript
If you want to work on Pluto's internals, **this is were the fun is**! As you'll see on our GitHub Issues, there is lots to do here!

It is easy to get started with JavaScript for Pluto!
- There are no build tools! Just change the JS code and refresh the browser. (Use the browser dev tools and a good IDE.)
- You only need to test on the latest Firefox and Chrome browsers.
- The front-end is written in React (actually, Preact with `htm` instead of `JSX`). If you know React, you can jump straight in, if not, you can read up on the basics of React, but many TODO items are doable _without an understanding of the overall structure_.

**We are always happy to do a video/audio call to talk about the project, about _your project_, and to help you get started! Get in touch over email/slack/zulip/Pluto feedback!**

## Setting up for the first time

First, git clone the package somehwere, say `~/dev/Pluto.jl/`. 

Next, open this folder in VS Code/Atom (we use VS Code), and make sure that you have a nice programming environment for Git, Julia and JavaScript. _But since you are interested in Pluto, we probably don't need to tell you that!_ 😚

Pluto is an IDE, so we will also create a clean package environment to use it in:
```bash
mkdir ~/pluto_tests
cd ~/pluto_tests
julia
```

then `]` to enter the package manager, and type
```
(v1.0) pkg> activate .
(pluto_tests) pkg> dev ~/dev/Pluto.jl
```

_We have just created a clean package environment called `pluto_tests`. We then 'added' the **local** `Pluto.jl` package into that environment `pluto_tests`._

In the next section, we'll tell you how to get started. But first, let us talk about three different package environments:
1. **The `~/pluto_tests` environment** - this environment has only one package (besides `Base` and `Core`): your local version of `Pluto.jl`. It's created and maintained by you - a Pluto developer.
2. **The `~/dev/Pluto.jl` environment** - this environment _is_ the `Pluto.jl` package, and contains exactly all dependencies of Pluto (which are listed in `~/dev/Pluto.jl/Project.toml`). You probably don't want to activate this environment, nor change it. You also don't launch Pluto _from_ this environment.
3. **Any other environment** that uses Pluto (including the default environment) - you probably want to add `"Pluto"` from the Julia package registry, not your local development version. _A Pluto notebook worker will probably run in a different package environment than the one you launched Pluto from. This is confusing - and will be changed at some point._

Okay!

## How to start your day

Open a terminal (why do programming guides always start with that 😡) and launch the local version of `Pluto.jl`:

```bash
cd ~/pluto_tests
julia --project="." -e "import Pluto; Pluto.run(1234)"
```

When changing **JavaScript code**, just save and refresh the browser. When changing **Julia code**, press `Ctrl+C` in the terminal, then `Arrow up`, then `Return` to restart Pluto. 

_Note: this will **not** do a clean shutdown when you press `Ctrl+C`, so only use this during development!_

To run the Julia tests:
```bash
julia --project="."
```
then `]` to enter the package manager, and type
```
(pluto_tests) pkg> test Pluto
```

To run the tests a second time, do `Arrow up`, then `Return`.

