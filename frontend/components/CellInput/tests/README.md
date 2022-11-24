# Deno unit tests

Unit tests for the scopestate explorer (and maybe later more who knows)

```shell
deno test --import-map=./import_map.json --allow-env
```

You can also do coverage, which looks fun but not sure how to interpret it:

```shell
deno test --import-map=./import_map.json --allow-env --coverage=coverage
deno coverage coverage --include=../scopestate_statefield.js
```