---
allowed-tools: ""
description: "Project evaluation and retrospective"
---

# /evaluate — Project Evaluation & Retrospective

You are executing the `/evaluate` command.

## Steps

1. **Collect Phase Outputs**
   - Gather all deliverable documents and artifacts from completed phases
   - Read project goals, success criteria, and KPI definitions
   - Identify the scope of evaluation (full project or specific milestone)

2. **Invoke Evaluator Agent**
   - Use the `evaluator` agent to conduct a structured project evaluation
   - Assess each phase against its defined success criteria

3. **Analyze KPIs**
   - Measure quantitative KPIs: timeline adherence, budget, defect density, test coverage, performance metrics
   - Assess qualitative KPIs: code quality, user satisfaction, team velocity
   - Compare actuals against targets and baselines

4. **Generate Evaluation Report**
   - Produce a structured report with: executive summary, KPI scorecard, phase-by-phase assessment
   - Include what went well, what didn't, and root cause analysis for issues
   - Document lessons learned and actionable improvement recommendations

5. **Determine Debug Loop**
   - If critical issues are found, recommend a debug/improvement loop
   - Specify which phases need rework and what the acceptance criteria are
   - If all KPIs meet targets, recommend proceeding to next milestone or closure

## Rules
- Evaluation must be evidence-based — cite specific artifacts and metrics
- Be objective — report both successes and failures honestly
- Recommendations must be actionable with clear ownership and timelines
- Store lessons learned for future project reference

## Arguments
- `$ARGUMENTS` — Project scope or milestone to evaluate. If empty, evaluate the current project state.
