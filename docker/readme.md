# Docker Image for Pluto.jl

## Build Docker Image

    cd docker
    docker build -t pluto:latest .

## Start Docker Container

    docker run -d -p 1234:1234 -v local/path/to/notebooks:/notebooks pluto:latest

## Access Notebook

http://localhost:1234/

## Save Notebooks

Notebooks saved in the folder `/notebooks` are accessible in the mounted volume.
