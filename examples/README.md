# examples/

Runnable examples. Each one states its physics, assumptions and the reference
it checks against. The examples are run by CTest, so they cannot silently rot.

| example | what it shows | reference |
|---|---|---|
| [`python/poisson_quickstart.py`](python/poisson_quickstart.py) | steady heat conduction in a plate with a heated edge (Laplace equation), boundary heat fluxes, VTK/CSV output | Fourier-series solution; exact centre value T = 1/4 by superposition |

The C++ engine also ships a verification driver:

```bash
./build/dev/src/aerion-engine poisson-mms --case exp-mixed --levels 16,32,64,128 --beta 1.5 --vtk results/mms.vtk
```

Run the Python example after building (see the top-level README):

```bash
PYTHONPATH=python python3 examples/python/poisson_quickstart.py --n 128 --out results/plate
```

Open `results/plate.vtk` in ParaView and colour by `temperature`.

No flow (Navier–Stokes) examples exist yet. They arrive with Stage 2
(lid-driven cavity, Poiseuille channel).
