---
name: verify-implementation
description: "Full verification cycle: build, test, lint, security"
---

# Verify Implementation Skill

## Trigger
Activated before commits, PRs, or when explicit verification is requested.

## Workflow
1. **Build**: compile/build the project
2. **Test**: run test suite
3. **Lint**: run linters and formatters
4. **Type Check**: static type analysis (if applicable)
5. **Security**: quick security scan
6. **Report**: aggregate results into pass/fail summary

## Auto-fix
- Formatting issues: auto-fix
- Import order: auto-fix
- Lint warnings: auto-fix where safe
- Test failures: report only (no auto-fix)
