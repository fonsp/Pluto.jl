# Pluto end-to-end tests

## Install packages

`npm install`

## Run Pluto.jl server

`PLUTO_PORT=1235 julia --project=/path/to/PlutoDev -e "import Pluto; Pluto.run($PLUTO_PORT)"`

## Run tests

`PLUTO_PORT=1235 npm run test`

## View the browser in action

Add `HEADLESS=false` when running the test command.

`HEADLESS=false PLUTO_PORT=1235 npm run test`

## Run a particular suite of tests

Add `-- -t=name of the suite` to the end of the test command.

`PLUTO_PORT=1235 npm run test -- -t=PlutoAutocomplete`
