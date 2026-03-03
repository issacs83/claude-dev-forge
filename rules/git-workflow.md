# Git Workflow

## Commit Message Format
```
<type>: <short description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types
| Prefix | Use When |
|--------|----------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation only |
| `test:` | Adding or fixing tests |
| `ci:` | CI/CD pipeline changes |
| `chore:` | Build scripts, dependencies, tooling |
| `perf:` | Performance improvement |

## Branch Naming
- `feature/<description>` — new features
- `fix/<description>` — bug fixes
- `release/<version>` — release branches
- `hotfix/<description>` — urgent production fixes

## Rules
- Never force-push to `main` or `master`
- PR required for main branch changes
- Commit messages in English
- One logical change per commit
- Stage specific files, avoid `git add .`

## Workflow
1. Create feature branch from main
2. Make changes in small, logical commits
3. Push and create PR
4. Review → approve → merge
5. Delete feature branch after merge
