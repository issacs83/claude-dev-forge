---
allowed-tools: ""
description: "Synchronize documentation with current codebase"
---

# /sync-docs — Documentation Sync

You are executing the `/sync-docs` command.

## Steps

1. **Scan Documentation**
   - Find all .md files in docs/, README.md, CHANGELOG.md
   - Check for outdated references

2. **Verify Links**
   - Check internal links resolve to existing files
   - Flag broken references

3. **Update Codemap**
   - Generate/update directory structure documentation
   - Update module descriptions if code structure changed

4. **Sync README**
   - Verify installation instructions match current setup
   - Update feature lists if features changed

5. **Report**
   - List updated documents
   - List broken links found
   - Suggest manual updates needed

## Arguments
- `$ARGUMENTS` — Optional: specific doc to sync (e.g., "readme", "changelog", "codemap")
