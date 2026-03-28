# Golden Principles

## 0. Dashboard-First (HARD GATE — 최우선)
모든 작업은 Jun.AI Dashboard(http://58.29.21.11:7700)에 먼저 보고한 후 실행한다.
작업 순서: agent_start 보고 → 작업 수행 → progress 보고 → agent_complete 보고
See `rules/dashboard-first.md` for full protocol. 예외 없음.

## 1. Read Before Write
Always explore and understand existing code before making changes.
Never modify files you haven't read. Use Glob/Grep/Read first.

## 2. Minimal Changes
Make the smallest diff that solves the problem.
Don't refactor unrelated code. Don't add "improvements" that weren't requested.

## 3. Verify Before Commit
Build and test before every commit. Never commit broken code.
Use `/verify-loop` for automated validation.

## 4. Security by Default
- No hardcoded secrets (API keys, passwords, tokens)
- No debug features in production builds
- Validate all external inputs
- Embedded: secure boot, firmware signing, JTAG disable in production

## 5. Follow Existing Patterns
Match the project's conventions. If the codebase uses snake_case, don't introduce camelCase.
Check CLAUDE.md and project rules before starting.

## 6. Document Decisions
Explain "why" in commit messages and comments, not "what".
Code shows what; humans need to know why.

## 7. Ask When Uncertain
Prefer clarification over assumptions.
If a task has multiple valid approaches, present options with trade-offs.

## 8. Small Functions, Small Files
- Functions: max 50 lines
- Files: target 200-400 lines, max 500 lines
- Nesting: max 3 levels deep

## 9. Plan Gate (HARD-GATE)
Use `/plan` before implementing when:
- 3+ files will be changed
- Architecture decisions are involved
- API or schema modifications
- New module or package creation

## 10. Evidence-Based Completion
A task is done only when:
- Code compiles/builds without errors
- Tests pass
- Linting passes
- Security scan shows no CRITICAL issues
