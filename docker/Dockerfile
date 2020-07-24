FROM julia:latest

EXPOSE 1234
VOLUME /notebooks

ENV JULIA_NUM_THREADS = 100
RUN julia -e 'using Pkg; Pkg.update(); Pkg.add(["Pluto", "PlutoUI", "Plots"]); Pkg.precompile();'

COPY docker_main.jl /
WORKDIR /notebooks

ENTRYPOINT [ "julia" ]
CMD [ "/docker_main.jl" ]
