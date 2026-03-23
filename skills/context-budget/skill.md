---
name: context-budget
description: "Track and manage context window budget to avoid overflow"
---

# Context Budget Skill

## Trigger
- Before reading large files (>500 lines)
- When multiple large tool results accumulate
- At 80%+ estimated context usage

## Budget Categories
- **Heavy** (>2000 tokens): full file reads, build logs, git diffs
- **Medium** (500-2000 tokens): partial file reads, grep results
- **Light** (<500 tokens): status checks, small edits, confirmations

## Guidelines
1. Check file size before reading — use `limit` and `offset` for large files
2. Use `head_limit` in Grep to cap result size
3. Save large outputs to files instead of keeping in context
4. Use Agent tool for complex searches (isolates results from main context)
5. Prefer targeted reads over full file reads

## Warning Signs
- Multiple consecutive full-file reads
- Build/test output pasted into context (save to file instead)
- Reading the same large file multiple times (save key parts)

## Embedded-Specific
- `.dts` files: read specific nodes, not entire file
- `bitbake -e` output: save to file, grep specific variables
- Kernel `.config`: grep specific CONFIG_ options
- Yocto `log.do_compile`: save to file, read last 50 lines for errors
