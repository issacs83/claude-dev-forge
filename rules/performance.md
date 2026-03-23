# Performance & Context Management

## Model Selection
- **Opus**: deep analysis, architecture, research, planning, code review
- **Sonnet**: implementation, build execution, quick fixes, formatting
- Match the model to the task — don't use Opus for simple edits

## Context Budget
- Be aware of context window consumption
- Large files (>500 lines): use `offset` and `limit` to read portions
- Build logs: save to file, read only relevant sections
- Embedded: `.dts` files, bitbake logs, kernel configs can be very large

### When to Compact
- At logical boundaries: Research → Plan, Plan → Implement
- After completing a major milestone
- When tool call count exceeds ~50

### Before Compacting
- Save key decisions to MEMORY.md or TODO file
- Note current progress and next steps
- Don't compact mid-debugging or mid-implementation

### When NOT to Compact
- In the middle of a multi-file refactor
- While debugging a specific issue
- When context contains critical error traces

## Efficiency
- Use parallel tool calls when operations are independent
- Use `Agent` tool for complex searches instead of multiple Glob/Grep
- Prefer `Read` with `offset`/`limit` over reading entire large files
- Use `Grep` with `head_limit` to avoid flooding context
