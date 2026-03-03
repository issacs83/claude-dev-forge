# Agent Selection Guide

## Process Agents (SW Development Workflow)
| Agent | When to Use |
|-------|-------------|
| **planner** | 3+ files change, architecture decisions, API/schema changes |
| **architect** | System design analysis, scalability review, dependency mapping |
| **code-reviewer** | Code quality, security, maintainability review |
| **security-reviewer** | OWASP audit, secrets scan, threat modeling |
| **tdd-guide** | Writing unit tests, TDD workflow, coverage improvement |
| **build-error-resolver** | Web/native build failures (npm, cargo, cmake, make) |
| **verify-agent** | Pipeline execution: build → test → lint → fix cycle |

## Domain Agents (Specialized Expertise)
| Agent | When to Use |
|-------|-------------|
| **bsp-engineer** | Yocto, kernel, U-Boot, device tree, board bring-up |
| **firmware-engineer** | MCU, FPGA, Cortex-M, RTOS, RTL design |
| **circuit-engineer** | Schematic, PCB layout, power, signal integrity, EMC |
| **hardware-engineer** | Optics, sensors, camera, thermal, mechanical, DFM |
| **algorithm-researcher** | Computer vision, ML, signal processing, optimization |
| **graphics-engineer** | 3D rendering, Metal, Vulkan, WebGL, shaders |
| **sdk-developer** | Cross-platform SDK, API design, driver abstraction |
| **web-developer** | React, Node.js, REST/GraphQL, database, fullstack |
| **devops-engineer** | CI/CD, Docker, release automation, infrastructure |
| **maintenance-engineer** | Crash analysis, OTA, RMA, field diagnostics |
| **product-strategist** | Roadmap, competitive analysis, market research |
| **regulatory-specialist** | FDA, CE/MDR, ISO, IEC, risk management |

## Merged Agents
| Agent | Scope |
|-------|-------|
| **doc-manager** | Write mode: tech docs, DHF, manuals. Sync mode: codemap, README update |
| **qa-engineer** | Test strategy, V&V, compliance testing, CI gate design |

## Overlap Resolution
- Build errors: `build-error-resolver` for web/native, `bsp-engineer` for Yocto/kernel
- Testing: `tdd-guide` for unit test writing, `qa-engineer` for test strategy/planning
- Verification: `verify-agent` for pipeline execution, `qa-engineer` for test design
- Documentation: `doc-manager` handles both writing and syncing

## Model Assignment
- **Opus** (12): Deep analysis, design, research — complex reasoning tasks
- **Sonnet** (9): Implementation, build, execution — speed-first tasks
