---
name: codebase-onboarding
description: "Fast project understanding workflow for new or unfamiliar codebases"
---

# Codebase Onboarding Skill

## Trigger
- First interaction with a new project
- User says "이 프로젝트 파악해줘", "explore this codebase", "what does this project do"

## Workflow
1. **Read project docs**: CLAUDE.md → README.md → MEMORY.md (in order)
2. **Scan structure**: `ls` top-level, identify build system (kas, cmake, make, package.json, Cargo.toml)
3. **Identify entry points**: main.c, app.py, index.ts, or equivalent
4. **Map dependencies**: imports, includes, submodules, package manifests
5. **Check git context**: recent commits, active branches, current diff
6. **Generate summary**: architecture overview → save to MEMORY.md or handoff

## Output Format
```
Project: [name]
Type: [embedded/web/ML/hybrid]
Build: [kas/cmake/make/npm/cargo]
Language: [C/C++/Python/TypeScript]
Key directories: [list]
Entry point: [file:line]
Dependencies: [internal/external]
Current state: [branch, recent changes]
```

## Embedded-Specific
- Check KAS/Yocto layer structure (meta-*/conf/, recipes-*/)
- Identify machine config, distro config, image recipe
- Check device tree files (.dts/.dtsi)
- Check kernel defconfig and fragment files
- Identify custom kernel modules or drivers

## What NOT to Do
- Don't read every file — scan structure first, then dive into key files
- Don't modify anything during onboarding
- Don't assume — ask if architecture is unclear
