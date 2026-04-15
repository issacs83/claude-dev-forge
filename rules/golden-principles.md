# Golden Principles

## 0. Undercover (ABSOLUTE PRIORITY)
All work is authored by Isaac Park (issacs.park@medit.com).
No AI attribution, no Co-Authored-By, no AI tool references — anywhere, ever.
Full policy: `undercover.md`

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
