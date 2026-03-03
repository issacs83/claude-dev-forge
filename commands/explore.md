---
allowed-tools: ""
description: "Read-only codebase exploration and investigation"
---

# /explore — Codebase Exploration

You are executing the `/explore` command.

## Steps

1. **Scope**
   - If `$ARGUMENTS` provided, focus exploration on that topic/area
   - If empty, provide a high-level project overview

2. **Explore**
   - Use Glob to map directory structure
   - Use Grep to find relevant patterns, functions, classes
   - Use Read to understand key files
   - Trace data flows and dependencies

3. **Report**
   - Present findings in structured format
   - Include file:line references for key discoveries
   - Highlight interesting patterns, potential issues, or areas of concern

## Rules
- Read-only operation — never modify files
- Use the `architect` agent for deep architectural analysis
- Focus on answering the user's specific question

## Arguments
- `$ARGUMENTS` — What to explore. Examples: "authentication flow", "build system", "error handling patterns"
