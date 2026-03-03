---
allowed-tools: ""
description: "Multi-agent workflow coordination"
---

# /orchestrate — Multi-Agent Orchestration

You are executing the `/orchestrate` command.

## Execution Patterns

### Sequential
Agents run one after another, output feeds into next.
```
agent-A → agent-B → agent-C
```

### Parallel
Independent agents run simultaneously.
```
agent-A ─┬→ agent-B
         └→ agent-C
```

### Fan-out
One agent produces work, multiple agents process in parallel.
```
agent-A → ┬→ agent-B
           ├→ agent-C
           └→ agent-D
```

## Steps

1. **Parse Request**
   - Determine which agents are needed
   - Identify dependencies between tasks
   - Choose execution pattern

2. **Execute**
   - Launch agents with appropriate tool permissions
   - Coordinate file ownership to avoid conflicts
   - Collect results from each agent

3. **Synthesize**
   - Combine results from all agents
   - Resolve conflicts if multiple agents modified same area
   - Present unified result to user

## Arguments
- `$ARGUMENTS` — Task description. The orchestrator determines which agents and pattern to use.
