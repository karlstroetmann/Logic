# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Pick your favorite docker-stacks image
FROM quay.io/jupyter/base-notebook

USER root

# Add permanent apt-get installs and other root commands here
# e.g., RUN apt-get install --yes --no-install-recommends npm nodejs

USER ${NB_UID}

# Switch back to jovyan to avoid accidental container runs as root
# Add permanent mamba/pip/conda installs, data files, other user libs here
# e.g., RUN pip install --no-cache-dir flake8
RUN conda install -c conda-forge nodejs
RUN mamba install 
RUN npm init -y
RUN npm install -g tslab
RUN tslab install
RUN npm install typescript
RUN npm install fraction.js
RUN npm install mathjs
RUN npm install @hpcc-js/wasm
RUN npm install pngjs
RUN npm install --save-dev @types/pngjs
RUN npm install heap-js
RUN npm install logic-solver
RUN npm install z3-solver
RUN npm install recursive-set