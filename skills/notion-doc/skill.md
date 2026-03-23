---
name: notion-doc
description: "Write or update documentation in Notion MO6 개발노트 — auto-categorize and create pages"
---

# Notion Documentation Skill

## Trigger
Activated when user asks to write, create, update, or organize documentation in Notion.
Also triggered by `/notion-doc` command.

## Usage
```
/notion-doc <action> [category] [title]
```

### Actions
- `create <category> <title>` — Create new doc under category
- `list` — Show current Notion structure
- `sync <local-file>` — Sync local docs/ file to Notion
- `update <page-id>` — Update existing page

## MO6 개발노트 Structure

Root Page: `321d3781-7d6e-809e-8972-e1299425d069`

| Category | Page ID | Content |
|----------|---------|---------|
| 📋 프로젝트 현황 | `321d3781-7d6e-81b1-b3e6-d00b2f11ec1c` | Roadmap, checklist, version ledger, restructuring plan |
| 🔧 BSP & 부팅 | `321d3781-7d6e-81e4-84ea-eadfe20f1733` | Kernel, DTS, U-Boot, boot optimization, security |
| 📱 애플리케이션 | `321d3781-7d6e-81ec-a0cc-f377623ee5b3` | WiFi, BLE, UVC, Crash Management |
| ⚡ Zero Boot | `321d3781-7d6e-8137-bf2d-c08bc7d01bee` | Hibernation instant boot, snapshot optimization |
| 🛠 Maintenance Tool | `321d3781-7d6e-81e1-b26f-c4f58e7f2a32` | Dev roadmap, API, multi-board, provisioning |
| 🐛 이슈 리포트 | `321d3781-7d6e-81f9-80f9-c74d0a462814` | Maintenance Tool issues, FW/BSP issues |
| 📝 성공/실패 기록 | `321d3781-7d6e-8145-9a9a-d70367168fe4` | Build lessons, hibernate lessons, troubleshooting |
| ✅ 테스트 & 검증 | `321d3781-7d6e-81f0-b1ad-d84b34a934a0` | Test manuals, HW test specs, UVC test, results |
| 📦 빌드 & 릴리스 | `321d3781-7d6e-8191-9ccd-c7da4cd4d04f` | Build guide, WSL2, release strategy, OTA |
| 📚 레퍼런스 | `321d3781-7d6e-8153-9b71-d4780804961b` | MO3 overview, workflow guide |

## Category Selection Rules

Auto-select category based on content:

| Keyword Pattern | Category |
|----------------|----------|
| kernel, dts, u-boot, boot, rootfs, gpio, pinmux, security | BSP & 부팅 |
| wifi, ble, uvc, gadget, app, crash, socket, hostapd | 애플리케이션 |
| hibernate, zero-boot, snapshot, resume, suspend, falcon | Zero Boot |
| maintenance, flash, serial, agent, probe, multi-board, api | Maintenance Tool |
| issue, bug, error, fix, regression | 이슈 리포트 |
| lesson, fail, success, troubleshoot, workaround, postmortem | 성공/실패 기록 |
| test, verify, spec, validation, pass/fail, qa | 테스트 & 검증 |
| build, kas, bitbake, release, ota, deploy, artifact, version | 빌드 & 릴리스 |
| roadmap, checklist, milestone, plan, restructure | 프로젝트 현황 |
| mo3, reference, legacy, overview, workflow | 레퍼런스 |

## Workflow

### Creating a new document
1. Determine category from content or user specification
2. Fetch current category page to check existing children
3. Create page under the correct category parent using `notion-create-pages`
4. Content format: Notion-flavored Markdown (see spec below)
5. Return page URL to user

### Syncing local file to Notion
1. Read local file from `docs/` or project directory
2. Convert standard Markdown to Notion-flavored Markdown
3. Determine target category
4. Check if page already exists (search by title)
5. If exists: update content. If not: create new page.

## Notion Markdown Quick Reference

### Supported blocks
- Headings: `# H1`, `## H2`, `### H3`
- Lists: `- bullet`, `1. numbered`
- Code: ``` ```language ... ``` ```
- Table: `<table>` with `<tr>`, `<td>` (NOT standard markdown tables)
- Callout: `::: callout {icon="emoji" color="color_bg"}\ncontent\n:::`
- Toggle: `<details><summary>Title</summary>\n\tContent\n</details>`
- Divider: `---`

### Colors
Text: gray, brown, orange, yellow, green, blue, purple, pink, red
Background: gray_bg, brown_bg, orange_bg, yellow_bg, green_bg, blue_bg, purple_bg, pink_bg, red_bg

### DO NOT
- Include page title in content (it goes in properties.title)
- Use standard markdown tables (`| col |`) — use `<table>` HTML format
- Escape characters inside code blocks
- Use `<page>` tag unless intentionally moving a page

## Document Template

When creating technical documentation, follow this structure:

```
# Overview
Brief description of the topic.

---

# Hardware (if applicable)
Circuit block diagram, component specs, DTS pin configuration.

# Software Architecture
Full stack block diagram, boot sequence.

# File Structure
All related files with role/reason/code excerpt/install path.

# How to Modify
Change scenarios with file + code + build commands.

# Build
Full/partial build commands and output paths.

# Verification & Testing
Step-by-step verification, manual test methods.

# Troubleshooting
<details>
<summary>Failure scenario</summary>
	Cause and solution
</details>

# Target Filesystem Map
Rootfs file tree with recipe traceability.

# Lessons Learned
Issue resolution history table.
```

## HARD RULES
1. **Always create under MO6 개발노트** — never standalone
2. **Check existing structure first** — fetch category page before creating
3. **Match category** — use the category selection rules above
4. **Korean communication** — document content can be Korean or English per context
5. **Code/comments in English** — code blocks always in English
