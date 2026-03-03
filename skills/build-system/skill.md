---
name: build-system
description: "Build pipeline automation — detect, configure, build, and troubleshoot"
---

# Build System Skill

## Trigger
Activated when user mentions build, compile, make, bitbake, cmake, or npm build.

## Workflow
1. Detect build system from project files
2. Verify build prerequisites (toolchain, dependencies)
3. Execute build with appropriate flags
4. On failure: diagnose, fix, retry
5. Report build artifacts and status

## Build System Detection
- `kas/*.yml` → KAS/Yocto
- `CMakeLists.txt` → CMake
- `Makefile` → Make
- `package.json` → npm/pnpm
- `Cargo.toml` → Cargo
- `go.mod` → Go
