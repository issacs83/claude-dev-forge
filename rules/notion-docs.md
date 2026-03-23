# Notion Documentation Rules

## MO6 개발노트 구조

Root Page: `321d3781-7d6e-809e-8972-e1299425d069`

| Category | Page ID | Content |
|----------|---------|---------|
| 📋 프로젝트 현황 | `321d3781-7d6e-81b1-b3e6-d00b2f11ec1c` | Roadmap, checklist, version ledger |
| 🔧 BSP & 부팅 | `321d3781-7d6e-81e4-84ea-eadfe20f1733` | Kernel, DTS, U-Boot, boot, security |
| 📱 애플리케이션 | `321d3781-7d6e-81ec-a0cc-f377623ee5b3` | WiFi, BLE, UVC, Crash Management |
| ⚡ Zero Boot | `321d3781-7d6e-8137-bf2d-c08bc7d01bee` | Hibernation, snapshot optimization |
| 🛠 Maintenance Tool | `321d3781-7d6e-81e1-b26f-c4f58e7f2a32` | Dev roadmap, API, multi-board |
| 🐛 이슈 리포트 | `321d3781-7d6e-81f9-80f9-c74d0a462814` | Maintenance Tool issues, FW/BSP issues |
| 📝 성공/실패 기록 | `321d3781-7d6e-8145-9a9a-d70367168fe4` | Build lessons, troubleshooting |
| ✅ 테스트 & 검증 | `321d3781-7d6e-81f0-b1ad-d84b34a934a0` | Test manuals, HW test specs |
| 📦 빌드 & 릴리스 | `321d3781-7d6e-8191-9ccd-c7da4cd4d04f` | Build guide, release strategy, OTA |
| 📚 레퍼런스 | `321d3781-7d6e-8153-9b71-d4780804961b` | MO3 overview, workflow guide |

## Category Auto-Selection

| Keyword Pattern | Category |
|----------------|----------|
| kernel, dts, u-boot, boot, rootfs, gpio, pinmux | BSP & 부팅 |
| wifi, ble, uvc, gadget, app, crash, hostapd | 애플리케이션 |
| hibernate, zero-boot, snapshot, resume, suspend | Zero Boot |
| maintenance, flash, serial, agent, probe, multi-board, api | Maintenance Tool |
| issue, bug, error, fix, regression | 이슈 리포트 |
| lesson, fail, success, troubleshoot, postmortem | 성공/실패 기록 |
| test, verify, spec, validation, qa | 테스트 & 검증 |
| build, kas, bitbake, release, ota, deploy, artifact | 빌드 & 릴리스 |
| roadmap, checklist, milestone, plan | 프로젝트 현황 |
| mo3, reference, legacy, overview | 레퍼런스 |

## Notion Writing Rules

1. **Always create under MO6 개발노트** — never standalone pages
2. **Check existing structure first** — fetch category page before creating
3. **Match category** — use keyword rules above for auto-selection
4. **Use Notion-flavored Markdown**:
   - Tables: `<table>` HTML format (NOT `| col |` markdown tables)
   - Callout: `::: callout {icon="emoji" color="color_bg"}\ncontent\n:::`
   - Toggle: `<details><summary>Title</summary>\n\tContent\n</details>`
5. **Title goes in properties.title** — do NOT include title in page content body
6. **Korean communication, English code** — document prose in Korean, code blocks in English

## Workflow

1. Determine category from content keywords
2. `notion-search` to check if page already exists
3. `notion-fetch` on category page to see children
4. `notion-create-pages` under correct parent page ID
5. Return page URL to user
