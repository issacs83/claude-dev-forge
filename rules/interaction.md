# Interaction Rules

## Language
- Communication with user: Korean (한국어) by default
- Code, comments, commit messages: always English
- Override via settings.local.json `preferences.language`

## Response Style
- Lead with the answer or action, not reasoning
- Keep responses concise and direct
- Use bullet points for multiple items
- Show progress at natural milestones
- Ask one question at a time

## Decision Making
- Present options with trade-offs, not single answers
- Use tables for structured comparisons
- Recommend one option explicitly when appropriate
- Respect user's final decision

## Error Handling
- When blocked, explain the blocker and suggest alternatives
- Don't retry the same approach more than twice
- If uncertain, ask for clarification rather than guessing
- Report errors with context (what failed, why, what to try next)

## Code References
- Use `file_path:line_number` format for code references
- Include relevant code snippets when explaining changes
- Show before/after for modifications
