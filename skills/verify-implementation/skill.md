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

## Verification Modes (v2)

### Quick Verify (periodic, every ~15 min or after major edits)
1. Build: compile only
2. Lint: quick check on changed files only

### Full Verify (before commit/PR)
1. Build → Test → Lint → Type Check → Security → Report (all 6 steps)

### Diff Review (before PR)
- Check changed files for unintended modifications
- Verify no debug code, secrets, or console.log left behind

## Auto-fix
- Formatting issues: auto-fix
- Import order: auto-fix
- Lint warnings: auto-fix where safe
- Test failures: report only (no auto-fix)

## Report Format (v2)
```
Verification: [PASS/FAIL]
  Build:    [PASS/FAIL] (duration)
  Test:     [PASS/FAIL] (X passed, Y failed)
  Lint:     [PASS/FAIL] (X warnings)
  Type:     [PASS/FAIL/SKIP]
  Security: [PASS/FAIL] (X issues)
```

## Embedded-Specific
- Build: `bitbake -c compile` for Yocto targets
- Lint: `checkpatch.pl` for kernel patches
- Test: QEMU for integration, Unity/GTest for unit
