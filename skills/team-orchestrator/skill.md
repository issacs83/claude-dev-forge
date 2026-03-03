---
name: team-orchestrator
description: "Multi-agent team coordination for complex tasks"
---

# Team Orchestrator Skill

## Trigger
Activated for tasks requiring multiple specialized agents.

## Workflow
1. **Analyze**: determine which agents are needed
2. **Plan**: define execution order and dependencies
3. **Assign**: allocate file ownership to avoid conflicts
4. **Execute**: launch agents (sequential, parallel, or fan-out)
5. **Merge**: combine results and resolve conflicts
6. **Report**: unified output from all agents

## Patterns
- Sequential: A → B → C (dependent tasks)
- Parallel: A | B | C (independent tasks)
- Fan-out: A → (B | C | D) (one produces, many consume)
