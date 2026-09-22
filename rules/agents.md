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

## Design & Frontend Agents (UI/UX Team)
| Agent | When to Use |
|-------|-------------|
| **ux-designer** | Information architecture, wireframes, user flows, UX spec |
| **design-system-architect** | Design tokens, component contracts, visual consistency audit |
| **frontend-engineer** | UI implementation craft — components, state, performance, a11y |
| **interaction-engineer** | Drag, 8-direction resize, snap, keyboard parity, undo, persistence |
| **visual-qa** | Judge the rendered screen. PASS/FAIL gate before completion |
| **dashboard-ux-specialist** | Operational/monitoring UI — information priority, alarms, BMS/HMI |

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
- Web work: `web-developer` for fullstack (API, DB, auth, deploy), `frontend-engineer` for what the user sees
- UI design: `ux-designer` for IA/wireframes/flows, `design-system-architect` for tokens/consistency
- UI QA: `e2e-tester` for browser behaviour, `visual-qa` for how the rendered screen looks
- Interaction: `interaction-engineer` owns gestures and keyboard; `frontend-engineer` owns everything else in the component
- Operational screens: `dashboard-ux-specialist` sets information priority, `ux-designer` lays it out

## Model Assignment
- **Opus**: Deep analysis, design, research — complex reasoning tasks
- **Sonnet**: Implementation, build, execution — speed-first tasks
- UI/UX agents run on Opus: visual judgment and interaction design are reasoning tasks, not typing tasks

## UI Pipeline
For any user-facing work, run `/ui-build` (skill: `ui-orchestration`) rather than dispatching a single agent.
The orchestrator routes, gates and iterates; it does not implement the UI itself.

```
ANALYZE → REQUIREMENT/DOMAIN → DESIGN → DESIGN SYSTEM(G1) → IMPLEMENT → INTERACTION
        → BUILD/TEST(G2) → DOMAIN QA(G3) → VISUAL QA(G4) → FAIL? FIX → re-run G2..G4
```

Build-green is gate 2. Completion is gate 4.
