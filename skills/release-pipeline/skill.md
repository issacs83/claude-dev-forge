---
name: release-pipeline
description: "Release automation: version, changelog, tag, package, publish"
---

# Release Pipeline Skill

## Trigger
Activated for release preparation, version bumping, or changelog generation.

## Workflow
1. **Pre-check**: verify build passes, tests pass, branch is clean
2. **Version**: determine and bump version number
3. **Changelog**: generate from git log since last release
4. **Tag**: create annotated git tag
5. **Package**: run project-specific packaging (if applicable)
6. **Publish**: push tag and create GitHub release (if requested)

## Multi-product Support
- Detect product family from `versions/<family>.env`
- Tag format: `<family>/vX.Y.Z`
- Independent release per product
