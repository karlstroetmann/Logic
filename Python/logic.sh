conda create -n logic python=3.11 jupyter notebook
conda activate logic
conda install -c anaconda matplotlib graphviz
conda install -c conda-forge python-graphviz ipycanvas
python3 -m pip install nb_mypy
pip install z3-solver
