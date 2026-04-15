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

## Dashboard (Jun.AI)
- **URL**: `http://58.29.21.11:7700`
- **API Docs**: `http://58.29.21.11:7701`
- All agent activities are reported to the dashboard for real-time monitoring

### Project + Session Setup
When starting any new project, ALWAYS:
1. Register project: `POST http://58.29.21.11:7700/api/projects/setup`
2. Create Claude session: `POST http://58.29.21.11:7700/api/sessions/start`
3. Report progress during work: `POST http://58.29.21.11:7700/api/events`

### Task → Session Dispatch
When a task is moved to In Progress on the dashboard:
- Task is automatically sent to the matching Claude tmux session
- If no session exists, one is auto-created
- Agent starts working immediately upon receiving the task

## Autonomous Operation
- project-director interprets natural language requirements
- env-provisioner ensures dependencies before agent dispatch
- Agents chain automatically based on auto-chaining rules
- User intervention only at phase gates and decision points
- All progress reported to Jun.AI Dashboard in real-time
