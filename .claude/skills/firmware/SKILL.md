---
name: firmware
description: Embed PrusaLink Web into Buddy firmware, build it, and run it in the MINI404 simulator. Use for firmware builds, printer simulation, or checking the app as the printer serves it.
---

# Firmware and simulator

Defaults, override with `make VAR=...`:

- `BUDDY=../Prusa-Firmware-Buddy-prusalink2`: the Buddy worktree. Its
  `src/resources/web/<variant>/index.html` holds one build per printer and
  `src/resources/CMakeLists.txt` picks `web/<PRINTER in lowercase, no dots>/index.html`.
- `DEVENV=../buddy-dev-env`: Apple Silicon fixes, `sim.py`, `run-unit-tests.sh`.
  Read its README first on a new machine.

```bash
make fw-web                    # every printer build and the icons into $(BUDDY)
make fw-build PRINTER=mk4      # also builds that firmware (debug, no bootloader)
make sim PRINTER=mk4 PORT=8190 # boots it; the printer serves the app on PORT
```

The simulator skips the first-run wizard and sets the PrusaLink password to
`devapikey123456`. `../buddy-dev-env/screenshot.py <build>/devsim out.png` captures the
printer's own display.

What simulates: MK4 fully. CORE One stops on "XBUDDY_EXTENSION not responding" (it needs
a second process for the extension board). XL needs its tool and bed boards. CORE One
INDX is not in MINI404; PrusaOS `simulation/` (Renode) has it.

Buddy unit tests build on Linux only: `../buddy-dev-env/run-unit-tests.sh --run -- -LE slow`.
Buddy commits follow `../Prusa-Firmware-Buddy/doc/contributing.md` (module prefix,
imperative subject, 72 columns).
