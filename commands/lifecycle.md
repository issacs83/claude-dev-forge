---
allowed-tools: ""
description: "Full PDLC pipeline orchestration (12 phases)"
---

# /lifecycle — Product Development Lifecycle Pipeline

You are executing the `/lifecycle` command.

## Steps

1. **Determine Scope**
   - Read the user's product/project description
   - Identify the target scope: full lifecycle, partial phase range, or single phase
   - Ask clarifying questions if the scope is ambiguous

2. **Invoke Project Director**
   - Use the `project-director` agent to orchestrate the full PDLC pipeline
   - The 12 phases are:
     1. VOC Analysis
     2. Market Research
     3. Requirements Definition (PRD)
     4. Architecture Design
     5. UX/UI Design
     6. Implementation Planning
     7. Implementation (TDD)
     8. Code Review & Security Audit
     9. E2E Testing
     10. Deployment & Release
     11. Evaluation & Retrospective
     12. Documentation & Handoff

3. **Execute Phases Sequentially**
   - Run each phase in order, invoking the appropriate agent for each
   - At each phase gate, present results to the user and request explicit approval before proceeding
   - If the user rejects a phase output, iterate within that phase before advancing

4. **Generate Documents**
   - Produce deliverable documents at each phase (PRD, architecture doc, UX spec, test report, etc.)
   - Save documents to the project's designated output directory

5. **Evaluate at End**
   - After all phases complete, invoke the `evaluator` agent
   - Generate a final project evaluation report with KPIs, lessons learned, and recommendations
   - Determine if a debug/improvement loop is needed

## Rules
- Phase gates are MANDATORY — never skip user approval between phases
- Each phase must produce at least one deliverable document
- If a phase fails, retry within that phase before escalating
- Track cumulative progress and report status at each gate

## Arguments
- `$ARGUMENTS` — Product or project description and optional phase range (e.g., "phases 1-5"). If empty, ask the user.
