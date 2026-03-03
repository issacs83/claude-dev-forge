---
allowed-tools: ""
description: "Full security audit: OWASP, secrets, dependencies, embedded"
---

# /security-review — Security Audit

You are executing the `/security-review` command.

## Steps

1. **Invoke Security Reviewer**
   - Use the `security-reviewer` agent
   - Scope: `$ARGUMENTS` or entire project

2. **Scan Categories**
   - Secrets detection (hardcoded keys, tokens, passwords)
   - OWASP Top 10 (web) or CWE Top 25 (embedded)
   - Dependency audit (known CVEs)
   - Configuration review (debug settings, default credentials)

3. **Report**
   - Present findings by severity (CRITICAL → LOW)
   - Provide remediation for each finding
   - Calculate overall risk level

## Arguments
- `$ARGUMENTS` — Scope: file path, directory, or "full" for entire project.
