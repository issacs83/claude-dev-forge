---
allowed-tools: ""
description: "Test coverage analysis and reporting"
---

# /test-coverage — Coverage Analysis

You are executing the `/test-coverage` command.

## Steps

1. **Detect Test Framework**
   - Identify testing framework and coverage tool
   - Common: pytest-cov, jest --coverage, lcov, gcov

2. **Run Tests with Coverage**
   - Execute test suite with coverage collection enabled
   - Generate coverage report

3. **Analyze Results**
   - Overall coverage percentage
   - Per-file coverage breakdown
   - Uncovered critical paths
   - Suggest tests for uncovered areas

4. **Report**
   ```
   Coverage Report
   ├── Overall:      XX%
   ├── Statements:   XX%
   ├── Branches:     XX%
   ├── Functions:    XX%
   └── Lines:        XX%

   Low Coverage Files:
   | File | Coverage | Missing |
   |------|----------|---------|
   ```

## Arguments
- `$ARGUMENTS` — Optional: specific module or directory to analyze.
