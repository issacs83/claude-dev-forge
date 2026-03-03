---
allowed-tools: ""
description: "Structured implementation planning with risk analysis"
---

# /plan — Implementation Planning

You are executing the `/plan` command. Follow this protocol:

## Steps

1. **Understand the Request**
   - Read the user's description of what they want to implement
   - Ask clarifying questions if requirements are ambiguous

2. **Explore the Codebase**
   - Use Glob/Grep/Read to understand the current architecture
   - Identify files that will be affected
   - Look for existing patterns to follow

3. **Invoke the Planner Agent**
   - Use the `planner` agent to create a detailed implementation plan
   - The plan must include: affected files, ordered steps, risks, verification criteria

4. **Present the Plan**
   - Show the plan to the user
   - Wait for explicit approval before any implementation

## Rules
- NEVER write code during planning — this is read-only analysis
- Always explore the codebase before planning
- If the change affects 3+ files, planning is MANDATORY (golden principle #9)
- Present alternatives when multiple valid approaches exist

## Arguments
- `$ARGUMENTS` — Description of what to plan. If empty, ask the user.
