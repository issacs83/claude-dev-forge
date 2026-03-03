---
allowed-tools: ""
description: "One-button pipeline automation (feature/bugfix/refactor)"
---

# /auto — Automated Pipeline

You are executing the `/auto` command.

## Modes

### Feature Mode (default)
```
/plan → implement → /tdd → /code-review → /verify-loop → /commit-push-pr → /sync-docs
```

### Bugfix Mode
```
/explore → fix → /verify-loop → /quick-commit → /sync-docs
```

### Refactor Mode
```
/refactor-clean → /code-review → /verify-loop → /commit-push-pr
```

## Steps

1. **Detect Mode**
   - Parse `$ARGUMENTS` for mode keyword (feature, bugfix, refactor)
   - Default: feature mode

2. **Execute Pipeline**
   - Run each stage in sequence
   - Stop on failure at any stage
   - Report progress at each milestone

3. **Recovery**
   - If a stage fails, report the failure and suggest fixes
   - User can choose to: fix and retry, skip stage, or abort

## Arguments
- `$ARGUMENTS` — `[mode] [description]`. Mode: feature (default), bugfix, refactor.
  Examples: "feature OTA update system", "bugfix login timeout", "refactor auth module"
