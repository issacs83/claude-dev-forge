#!/usr/bin/env bash
# Hook: TaskCompleted
# Purpose: Log completed tasks

TASK_INFO="${CLAUDE_TOOL_INPUT:-$(cat)}"
echo "✅ [task] Sub-agent task completed." >&2

exit 0
