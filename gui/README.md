# gui/ — AERION Desktop (Stage 5, not started)

This directory will hold the desktop application. **No GUI code exists yet.**
Stage 1 delivers the engine, Python API and verification tooling that the GUI
will build on.

Planned design (see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) §6):

* PySide6 (Qt 6) with a dark theme; embedded VTK render windows for 2D/3D views.
* The GUI uses only the public Python API (`import aerion`), never the C++
  engine directly. Results are therefore identical to scripted runs.
* Long simulations run off the UI thread (the engine releases the GIL);
  residual plots are fed by solver progress callbacks.
* Features: geometry/airfoil selection, mesh preview, flow parameters
  (velocity, density, viscosity, angle of attack), start/stop, live residuals,
  contour/vector/streamline views, force coefficients, CSV/VTK export,
  comparison of designs, project save/load.
* Unverified capabilities are labelled EXPERIMENTAL in the interface.
