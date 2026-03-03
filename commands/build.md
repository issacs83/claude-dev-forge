---
allowed-tools: ""
description: "Universal build command with auto-detection (bitbake/cmake/make/npm/cargo)"
---

# /build — Universal Build

You are executing the `/build` command.

## Steps

1. **Detect Build System**
   Scan the project root for build configuration files:
   | File Found | Build System | Command |
   |-----------|-------------|---------|
   | `kas/*.yml` | KAS/Yocto | `KAS_BUILD_DIR=build kas shell kas/base.yml:kas/<target>.yml -c "bitbake <image>"` |
   | `conf/local.conf` | Yocto (direct) | `bitbake <image>` |
   | `CMakeLists.txt` | CMake | `cmake -B build && cmake --build build` |
   | `Makefile` | Make | `make -j$(nproc)` |
   | `package.json` | npm/pnpm | `npm run build` or `pnpm build` |
   | `Cargo.toml` | Cargo | `cargo build` |
   | `go.mod` | Go | `go build ./...` |
   | `setup.py`/`pyproject.toml` | Python | `pip install -e .` or `python -m build` |

2. **Execute Build**
   - Run the detected build command
   - Capture output and timing

3. **Handle Failures**
   - If build fails, invoke `build-error-resolver` (for web/native) or `bsp-engineer` (for Yocto/kernel)
   - Attempt auto-fix and retry once

4. **Report**
   - Build status (PASS/FAIL)
   - Duration
   - Output artifacts location

## Arguments
- `$ARGUMENTS` — Optional: specific target (e.g., "imx-boot", "mo6-hub", "test", "release")
