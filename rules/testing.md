# Testing Rules

## Coverage Targets
- Critical paths: 80%+ coverage
- Utility functions: 90%+ coverage
- UI components: 60%+ coverage
- Test pyramid: 70% unit / 20% integration / 10% E2E

## Test Quality
- Tests should be deterministic (no flaky tests)
- Each test should test one thing
- Test names should describe the expected behavior
- Use arrange-act-assert (AAA) pattern

## Embedded Testing
- Mock HAL layers for unit testing
- Use QEMU for integration testing where possible
- Hardware-in-the-loop for final validation
- Test boundary conditions (overflow, underflow, NULL)
- Test ISR behavior and timing constraints

## Test Frameworks
- C/C++: Unity, CppUTest, Google Test
- Python: pytest
- JavaScript/TypeScript: Jest, Vitest
- E2E: Playwright, Robot Framework

## When to Test
- Write tests before or alongside implementation
- Run tests before every commit
- Fix broken tests immediately — never disable them
- Add regression tests for every bug fix
