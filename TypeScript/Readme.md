The TypeScript programs in this directory have been translated from the Jupyter notebooks
containing Python programs by Tobias Neithöfer und Leo Vatter.
Some of these notebooks have later been edited by myself.

## Setup
First, you have to install `node`.

This depends on yoiu operating system.
1. MacOS: provided you have installed homebrew, the following command works:

brew install node

2. Windows:
winget install OpenJS.NodeJS.LTS

3. Linux:
sudo apt update
sudo apt install nodejs npm

After installing node, you need to install `conda`. 

1. Windows
On Windows, conda doesn't run in the standard Command Prompt out of the box; it uses its own "Anaconda Prompt."

Download: Get the Miniconda Windows Installer from the official site 
https://www.anaconda.com/docs/getting-started/miniconda/main

Install: Run the .exe file.

2. MacOS
curl -O https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh
bash Miniconda3-latest-MacOSX-arm64.sh

3. Linux
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

After installing conda, execute the following commands in your anaconda terminal.


```bash
conda create -n logic-ts
conda activate logic-ts
conda install -c conda-forge nodejs
conda install -c conda-forge nbclassic
npm init -y
npm install -g tslab
tslab install
npm install typescript
npm install fraction.js
npm install mathjs
npm install @hpcc-js/wasm
npm install pngjs
npm install --save-dev @types/pngjs
npm install heap-js
npm install logic-solver
npm install z3-solver
npm install recursive-set@8.0.0
```

## Verifying installation

To verify that all libraries have been installed successfully, execute the following command in your anaconda terminal: 

```bash
jupyter nbclassic
```

Then open and execute the cells in the notebook **Test-Libraries.ipynb**, which you can find in **TypeScript**.

