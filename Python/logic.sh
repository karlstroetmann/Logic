conda create -n logic -c conda-forge python=3.13 jupyter_server nbclassic
conda activate logic
conda install -c anaconda matplotlib graphviz
conda install -c conda-forge python-graphviz ipycanvas
pip install nb_mypy
pip install z3-solver
