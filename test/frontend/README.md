# Pluto end-to-end tests

## Install packages

`npm install`

## Run tests

`PLUTO_DIR=/path/to/PlutoDev PLUTO_PORT=1235 npm run test`

This command will automatically start the Pluto server from `/path/to/PlutoDev` directory on port `1235`.

## View the browser in action

Add `HEADLESS=false` when running the test command.

`HEADLESS=false PLUTO_DIR=/path/to/PlutoDev PLUTO_PORT=1235 npm run test`

## Run a particular suite of tests

Add `-- -t=name of the suite` to the end of the test command.

`PLUTO_DIR=/path/to/PlutoDev PLUTO_PORT=1235 npm run test -- -t=PlutoAutocomplete`
