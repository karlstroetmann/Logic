"""Make the IJava kernel use the JDK of the active conda environment.

The conda package `ijava` installs a kernel specification that starts the
kernel with the command `java`.  This command is looked up in the PATH, but the
conda package `openjdk` does not put its `java` executable there.  Hence the
kernel might be started with some other (possibly too old) Java installation.

This script replaces the command `java` in the kernel specification by the
absolute path of the `java` executable of the conda environment.  Run it once
after the environment has been created:

    conda activate java
    python fix-kernel.py
"""
import json
import os
import sys
from pathlib import Path


def find_java():
    executable = "java.exe" if os.name == "nt" else "java"
    candidates = []
    if "JAVA_HOME" in os.environ:
        candidates.append(Path(os.environ["JAVA_HOME"]) / "bin" / executable)
    prefix = Path(sys.prefix)
    candidates += [prefix / "lib" / "jvm" / "bin" / executable,
                   prefix / "Library" / "lib" / "jvm" / "bin" / executable,
                   prefix / "Library" / "bin" / executable,
                   prefix / "bin" / executable]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    sys.exit("Could not find a java executable in the conda environment " + str(prefix))


def main():
    kernel_json = Path(sys.prefix) / "share" / "jupyter" / "kernels" / "java" / "kernel.json"
    if not kernel_json.is_file():
        sys.exit("Could not find " + str(kernel_json) + ".  Is the package ijava installed?")
    spec = json.loads(kernel_json.read_text())
    java = find_java()
    spec["argv"][0] = str(java)
    kernel_json.write_text(json.dumps(spec, indent=4))
    print("The Java kernel now uses", java)


if __name__ == "__main__":
    main()
