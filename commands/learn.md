---
allowed-tools: ""
description: "Record lessons learned and patterns as persistent knowledge"
---

# /learn — Knowledge Recording

You are executing the `/learn` command.

## Modes

### From Error: `/learn error`
- Analyze the last error/fix pair
- Extract the pattern and solution
- Save to memory for future reference

### From Session: `/learn session`
- Summarize key discoveries from this session
- Save useful patterns, conventions, gotchas
- Update project memory

### Suggest: `/learn suggest`
- Review recent interactions
- Suggest patterns worth remembering
- User picks which to save

## Storage
- Project-level: `.claude/memory/MEMORY.md` or topic-specific files
- Keep entries concise and actionable
- Update existing entries rather than duplicating

## Arguments
- `$ARGUMENTS` — Mode: "error", "session", "suggest", or free-form knowledge to record.
