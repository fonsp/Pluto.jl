# Instructions for `Pluto.jl` developers

Hey! Thank you for your interested in working on ~THE FUTURE~ our modest little project! There are a number of ways that you can contribute:

### If you like using Pluto

Use it often, and leave feedback with the built-in suggestion box! We only have a limited view of all the things that can be done with Julia, so it is up to YOU to figure it out, and let us know! **If you are interested in educational writing**, and you have a topic that you want to share, consider writing a sample notebook for Pluto! We want to get a diverse set of topics. Here are some notes:

-   A sample notebook can - and should - _invite the reader to explore_. How can you use that to teach something new?
-   Try to match the atmosphere and style of existing sample notebooks - more like a conversation, less like a script.
-   Sample notebooks will have the [Unlicense](https://github.com/fonsp/Pluto.jl/blob/master/sample/LICENSE) - do you agree?
-   Contact us before, during and after writing a sample notebook, to make sure that we are all on the same page.

### If you want to work with Julia

Pluto needs more sample notebooks, example code, and good compatibility with other packages. Many packages work well in Pluto, but some were designed with a specific IDE in mind (e.g. Jupyter, Juno). Getting them working with Pluto is often a minor fix!

As for working with Pluto's internals - the exciting work behind the Julia backend of Pluto is mostly done. (Most upcoming goals are JavaScript projects.) However, there are many long-term goals that require tricky Julia code, so if you are interested, have a look there!

### If you want to work with JavaScript

If you want to work on Pluto's internals, **this is were the fun is**! As you'll see on our GitHub Issues, there is lots to do here!

It is easy to get started with JavaScript for Pluto!

-   There are no build tools! Just change the JS code and refresh the browser. (Use the browser dev tools and a good IDE.)
-   You only need to test on the latest Firefox and Chrome browsers.
-   The front-end is written in React (actually, Preact with `htm` instead of `JSX`). If you know React, you can jump straight in, if not, you can read up on the basics of React, but many TODO items are doable _without an understanding of the overall structure_.

**We are always happy to do a video/audio call to talk about the project, about _your project_, and to help you get started! Get in touch over email/slack/zulip/Pluto feedback!**

## Pluto is an opinionated project

We are excited to hear what you want to work on, but be sure to chat with us before endeavouring on a large contribution, to make sure that we are on the same page. Why? Because Pluto is _different from many other open source projects_ in two important ways:

-   The intended audience for Pluto is **beginner programmers**. That's right, _you_ are not the intended audience. Our driving goal is to make scientific computing more accessible, and we start by focusing on people with very little programming experience. This means that we are _very_ interested in things like sample notebooks, Live Docs, a Pkg GUI, unintimidating UI, and so on. We will not work on things like a vim mode, customizable everything and other "pro tools". Maybe later!
-   We will not implement every feature suggestion, even if it is objectively nice. We try to keep a **minimal** and **orthogonal** feature set. Pluto's development is currently not a straight path to perfection, it is more like a [simulated annealing](https://en.wikipedia.org/wiki/Simulated_annealing) process. By having a small set of (tasteful) features, we keep the project **maintable** and **flexible**.

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
julia --optimize=0 --project="." -e "import Pluto; Pluto.run()"
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

**Tip:** edit the `runtests.jl` file to put your tests at the top!

# How to run specific version of Pluto:

## Method 1: use git

If you are fluent in git (I am not), then you can git magic your local clone into whatever you want, and if you did `pkg> dev path/to/my/clone` then it will always work! You can do most of it using the VS Code git GUI, it took me a while to learn though.

## Method 2: use the package manager

Use the Julia REPL package manager to **activate an empty environment** and then **add the branch/version of Plutp**. This is best explained using some examples.

#### Example: run an old Pluto version

You need Julia 1.5 for `--temp`, otherwise do `import Pkg; Pkg.activate(mktempdir())`.

```julia
(v1.5) pkg> activate --temp
(jl_khadsfkj) pkg> add Pluto@0.8.0
julia> import Pluto; Pluto.run(1234)
```

#### Example: check out a PR

This PR: https://github.com/fonsp/Pluto.jl/pull/530

is on a fork `pupuis/Pluto.jl`, on its own branch `find-and-replace` (nice!)

```julia
(v1.5) pkg> activate --temp
(jl_khadsfkj) pkg> add https://github.com/pupuis/Pluto.jl#find-and-replace
julia> import Pluto; Pluto.run()
```

#### Example: check out a specific commit

You need to find the 'git SHA' of the commit. This is either a 7-character cutie or a 40-character biggie. Copy it:

![image](https://user-images.githubusercontent.com/6933510/96336143-c19a3f80-107d-11eb-8c1c-527981cc448d.png)

And paste after `#` in the URL:

```julia
(v1.5) pkg> activate --temp
(jl_khadsfkj) pkg> add https://github.com/fonsp/Pluto.jl#f5050048668b31318afc3459bf81ce3b9cce6854
julia> import Pluto; Pluto.run()
```
