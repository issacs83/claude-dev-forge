# PDLC Workflow Rules

## Pipeline
Every product development follows a 12-phase pipeline:

```
Phase 0: Prior Research → Phase 1: VOC → Phase 2: Market Research →
Phase 3: Planning & Design → Phase 4: Detailed Planning →
Phase 5: Architecture → Phase 6: Part Design →
Phase 7: Detailed Design → Phase 8: Implementation →
Phase 9: Testing → Phase 10: Verification → Phase 11: Evaluation
```

## Phase Gates
Each phase transition requires:
1. Phase deliverables completed
2. Documents generated
3. User approval (for phases with decision points)

## Agent Auto-Selection
project-director automatically selects agents based on:
- User input keywords → PDLC phase mapping
- Phase requirements → agent assignment
- No explicit /command needed from user

## Document Generation
Every phase automatically produces relevant documents:
- Analysis phases → .docx reports
- Data phases → .xlsx spreadsheets
- Review phases → .pptx presentations
- Korean regulatory → .hwpx documents

## Debug Loop
When Phase 11 (Evaluation) determines quality is insufficient:
- Grade A/B → Proceed to release
- Grade C → Loop to Phase 9 (re-test)
- Grade D/F → Loop to Phase 8 (re-implement)

## Dashboard
All agent activities are reported to the PDLC Dashboard (localhost:7700)
for real-time visual monitoring.

## Autonomous Operation
- project-director interprets natural language requirements
- env-provisioner ensures dependencies before agent dispatch
- Agents chain automatically based on auto-chaining rules
- User intervention only at phase gates and decision points
