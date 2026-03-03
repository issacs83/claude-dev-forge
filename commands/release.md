---
allowed-tools: ""
description: "Release preparation: version bump, changelog, tag, package"
---

# /release — Release Preparation

You are executing the `/release` command.

## Steps

1. **Version Analysis**
   - Detect current version from:
     - `versions/<family>.env` (Yocto/BSP projects)
     - `package.json` (npm projects)
     - `Cargo.toml` (Rust projects)
     - `VERSION` file
     - Latest git tag
   - Determine next version (patch/minor/major)

2. **Pre-release Checks**
   - Run `/verify-loop` to ensure build + tests pass
   - Check for uncommitted changes
   - Verify we're on the correct branch

3. **Changelog Generation**
   - Collect commits since last release tag
   - Categorize by type (feat, fix, docs, etc.)
   - Generate changelog entry

4. **Version Bump**
   - Update version in relevant files
   - Commit: `release: vX.Y.Z`

5. **Tag**
   - Create annotated git tag
   - For multi-product: `<family>/vX.Y.Z` (e.g., `mo6/v1.2.0`)
   - For single product: `vX.Y.Z`

6. **Package (if applicable)**
   - Run project-specific packaging (e.g., `make-fw-package.sh`)
   - Generate release artifacts

7. **Summary**
   - Show version bump details
   - Show changelog
   - Ask if user wants to push tag

## Arguments
- `$ARGUMENTS` — Version level: "patch", "minor", "major", or explicit "vX.Y.Z". Optional product family prefix.
