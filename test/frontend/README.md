# Pluto end-to-end tests

All commands here are executed in this folder (`Pluto.jl/test/frontend`).

## Install packages

`npm install`

## Run Pluto.jl server

```
PLUTO_PORT=2345; julia --project=/path/to/PlutoDev -e "import Pluto; Pluto.run(port=$PLUTO_PORT, require_secret_for_access=false, launch_browser=false)"
```

or if Pluto is dev'ed in your global environment:

```
PLUTO_PORT=2345; julia -e "import Pluto; Pluto.run(port=$PLUTO_PORT, require_secret_for_access=false, launch_browser=false)"
```

## Run tests

`PLUTO_PORT=2345 npm run test`

## View the browser in action

Add `HEADLESS=false` when running the test command.

`clear && HEADLESS=false PLUTO_PORT=1234 npm run test`

## Run a particular suite of tests

Add `-- -t=name of the suite` to the end of the test command.

`clear && HEADLESS=false PLUTO_PORT=1234 npm run test -- -t=PlutoAutocomplete`

## To make a test fail on a case that does not crash Pluto

Use `console.error("PlutoError ...")`. This suite will fail if a console
command has PlutoError in the text. Do that when a bad situation is handled
but the underlying cause exists.
