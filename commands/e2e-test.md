---
allowed-tools: ""
description: "Playwright E2E test generation and execution"
---

# /e2e-test — End-to-End Test Generation & Execution

You are executing the `/e2e-test` command.

## Steps

1. **Read Requirements**
   - Read the requirements document if a path is provided
   - If no requirements doc, infer test scenarios from the target URL and user description
   - Identify critical user flows to test

2. **Check Environment**
   - Invoke the `env-provisioner` agent to verify Playwright is installed and configured
   - Install Playwright and browsers if not present
   - Verify the target URL is reachable

3. **Generate Test Scripts**
   - Invoke the `e2e-tester` agent to generate Playwright test scripts
   - Cover critical user flows: navigation, forms, authentication, error handling
   - Include assertions for visual elements, network responses, and state changes

4. **Execute Tests**
   - Run the generated Playwright tests in a real browser
   - Capture screenshots at key steps and on failures
   - Record test timing and performance metrics

5. **Generate Test Result Report**
   - Produce a structured report with: pass/fail summary, screenshots, error details
   - Include coverage analysis against requirements
   - Recommend additional test cases for uncovered scenarios

## Rules
- Tests must be deterministic — avoid time-dependent or flaky assertions
- Use proper wait strategies (waitForSelector, waitForNavigation) instead of sleep
- Each test should be independent and self-contained
- Clean up test data after execution when possible

## Arguments
- `$ARGUMENTS` — Target URL and optional requirements doc path (e.g., "https://example.com ./docs/requirements.md"). If empty, ask the user.
