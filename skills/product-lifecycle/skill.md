---
name: product-lifecycle
description: "Full PDLC 12-phase pipeline orchestration with autonomous agent dispatch"
---

# Product Lifecycle Skill

## Trigger
Activated when user describes a full product development need or when /lifecycle command is used.

## PDLC Phases (12)
0. Prior Research — paper-patent-researcher
1. VOC — voc-researcher
2. Market Research — product-strategist
3. Planning & Design — ux-designer + marketing-strategist
4. Detailed Planning — planner + domain agents
5. Architecture — architect + planner
6. Part Design — domain agents (fan-out)
7. Detailed Design — domain agents + security-reviewer
8. Implementation — domain agents + tdd-guide + verify-agent
9. Testing — qa-engineer + e2e-tester
10. Verification — regulatory-specialist + qa-engineer
11. Evaluation — evaluator

## Workflow
1. **Scope**: Determine project scope and applicable phases
2. **Environment**: env-provisioner checks all needed agent dependencies
3. **Execute**: project-director runs phases sequentially
4. **Gate**: User approval required at each phase transition
5. **Document**: doc-manager + format-specific writers produce deliverables
6. **Dashboard**: Real-time progress on localhost:7700
7. **Loop**: If evaluation grade < B, loop back to implementation

## Auto-chaining Rules
- Analysis/design complete → doc-manager → report-writer/presentation-writer
- Test failed → web-developer/domain agent fix → e2e-tester re-test
- Regulatory review done → report-writer for compliance docs
- All phases complete → evaluator final assessment

## Document Output Per Phase
Each phase automatically generates appropriate documents in output/ directory:
- .docx via report-writer
- .pptx via presentation-writer
- .hwpx via hwp-writer
- .xlsx via spreadsheet-writer
