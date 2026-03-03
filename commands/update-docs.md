---
allowed-tools: ""
description: "Update specific documentation from code changes"
---

# /update-docs — Documentation Update

You are executing the `/update-docs` command.

## Steps

1. **Identify Changes**
   - Check git diff for recent code changes
   - Determine which documentation needs updating

2. **Update**
   - Use `doc-manager` agent in Sync mode
   - Update affected documentation files
   - Maintain consistent formatting

3. **Verify**
   - Check all links still work
   - Ensure no stale information remains

## Arguments
- `$ARGUMENTS` — What to update: "api", "readme", "changelog", "release-notes", or specific file path.
