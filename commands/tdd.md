---
allowed-tools: ""
description: "Test-driven development: RED → GREEN → REFACTOR cycle"
---

# /tdd — Test-Driven Development

You are executing the `/tdd` command.

## Steps

1. **Understand Requirements**
   - Parse `$ARGUMENTS` for the feature/function to implement
   - Identify the test framework for this project

2. **RED — Write Failing Test**
   - Use `tdd-guide` agent to write the test first
   - Run the test — verify it FAILS
   - Test name: `test_<behavior>_when_<condition>_should_<expected>`

3. **GREEN — Implement**
   - Write minimum code to make the test pass
   - Run the test — verify it PASSES

4. **REFACTOR — Clean Up**
   - Improve code without changing behavior
   - Run tests — verify they still PASS

5. **Repeat**
   - Continue cycle for additional test cases
   - Target 80%+ coverage for the new code

## Rules
- Always write test BEFORE implementation
- One cycle at a time — don't batch multiple features
- Run tests after every change

## Arguments
- `$ARGUMENTS` — Feature or function to implement via TDD.
