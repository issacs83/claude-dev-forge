---
name: security-pipeline
description: "Comprehensive security scan, audit, and remediation pipeline"
---

# Security Pipeline Skill

## Trigger
Activated for security audits, vulnerability scanning, or compliance checks.

## Workflow
1. **Scan**: secrets detection, dependency audit, code analysis
2. **Classify**: group findings by severity (CRITICAL/HIGH/MEDIUM/LOW)
3. **Remediate**: auto-fix where safe, suggest manual fixes
4. **Report**: generate security audit report
5. **Verify**: re-scan after fixes

## Tools Used
- `security-reviewer` agent for deep analysis
- grep-based secret detection
- Dependency version checking
