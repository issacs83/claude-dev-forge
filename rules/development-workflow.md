# Development Workflow

## Pipeline
Every non-trivial change follows a 4-stage pipeline:

```
Research → Plan → Implement (TDD) → Review
```

### 1. Research
- Read existing code before proposing changes (golden principle #1)
- Check CLAUDE.md, MEMORY.md, project rules
- Use `deep-research` skill for competitive/technical analysis
- Embedded: check device tree, kernel config, Yocto layer structure first

### 2. Plan
- Mandatory for 3+ file changes (golden principle #9)
- Use `planner` agent for architecture decisions
- Identify affected files, risks, verification criteria
- Get explicit user approval before implementation

### 3. Implement (TDD)
- Write tests first or alongside implementation
- Use `tdd-guide` agent for test-driven workflow
- Follow `coding-style.md` and language-specific standards
- Embedded: mock HAL layers, use QEMU for integration tests

### 4. Review
- Use `code-reviewer` agent for quality review
- Use `security-reviewer` agent for security audit
- Run `/verify-loop` before commit
- Fix all issues before proceeding

## Stage Gates
- Research → Plan: requirements are clear, no ambiguity
- Plan → Implement: plan is approved by user
- Implement → Review: all tests pass, build succeeds
- Review → Merge: no critical issues, security scan clean

## Anti-patterns
- Skip research and jump to coding
- Implement without a plan for large changes
- Commit without running tests
- Disable tests to make CI pass
