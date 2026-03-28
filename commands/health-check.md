---
allowed-tools: ""
description: "Full agent environment health check"
---

# /health-check — Agent Environment Health Check

You are executing the `/health-check` command.

## Steps

1. **Invoke Environment Provisioner**
   - Use the `env-provisioner` agent in full health check mode
   - Scan the entire agent environment for dependencies and tools

2. **Scan Agent Dependencies**
   - Check all registered agents and their required tools
   - Verify each dependency: installed, version compatible, accessible on PATH
   - Categories to check:
     - Runtime: Node.js, Python, Rust, Go
     - Build tools: npm, pip, cargo, cmake, make
     - Testing: Playwright, pytest, jest, vitest
     - Linting: eslint, prettier, ruff, clippy
     - Git tools: gh CLI, git-lfs
     - Embedded: bitbake, kas, openocd, uuu
     - MCP servers: connectivity and authentication status

3. **Report Status Table**
   - Present results as a status table with columns: Tool, Required By, Status, Version, Notes
   - Use clear status indicators: OK, MISSING, OUTDATED, ERROR
   - Group by category for readability

4. **Offer Batch Installation**
   - For missing dependencies, offer to install them in batch
   - Present the installation plan before executing
   - Only install after user approval

## Rules
- Health check is read-only by default — no installations without approval
- Report ALL issues found, not just the first one
- Include version compatibility notes where relevant
- Suggest alternatives for tools that cannot be installed in the current environment

## Arguments
- No arguments required. Runs a full environment scan.
