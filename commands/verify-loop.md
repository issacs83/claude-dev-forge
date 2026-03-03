---
allowed-tools: ""
description: "Automated build→test→lint validation with retry (max 3)"
---

# /verify-loop — Verification Loop

You are executing the `/verify-loop` command.

## Steps

1. **Invoke Verify Agent**
   - Use the `verify-agent` to run the full verification pipeline
   - Pipeline: build → test → lint → type-check → security scan

2. **On Failure**
   - Analyze the failure
   - Attempt auto-fix for safe issues (formatting, imports)
   - Re-run the pipeline
   - Maximum 3 attempts

3. **Report**
   - Show pipeline results table
   - List any remaining failures after all retries
   - Suggest manual fixes for issues that couldn't be auto-resolved

## Configuration
- Max retries: 3
- Auto-fixable: lint warnings, import order, formatting
- NOT auto-fixable: test failures, type errors, security issues

## Arguments
- `$ARGUMENTS` — Optional: specific stage to run (e.g., "build", "test", "lint")
