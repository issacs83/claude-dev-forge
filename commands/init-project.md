---
allowed-tools: ""
description: "Initialize project-level .claude overlay from template"
---

# /init-project — Project Overlay Setup

You are executing the `/init-project` command.

## Steps

1. **Check Existing Setup**
   - Look for `.claude/` in current project root
   - If exists, ask user if they want to extend or reset

2. **Select Domain Overlay**
   - Ask the user which domain template to use:
     - **yocto-bsp**: Embedded Linux BSP development (Yocto, KAS, kernel, DTS)
     - **web-fullstack**: Web application development (React, Next.js, API, DB)
     - **firmware**: Bare-metal / RTOS firmware development (MCU, FPGA)
     - **blank**: Empty template (custom project)

3. **Create Project Overlay**
   - Create `.claude/` directory structure:
     ```
     .claude/
     ├── rules/
     │   └── project-rules.md    (from overlay template)
     ├── memory/
     │   └── MEMORY.md           (blank template)
     └── prompts/
         └── system-prompt.md    (from overlay template)
     ```

4. **Customize**
   - Ask user for project name and description
   - Fill in template placeholders
   - Add project-specific agent overrides if needed

5. **Verify**
   - Confirm all files created
   - Show next steps

## Available Overlays
- `yocto-bsp`: Yocto rules, KAS build context, kernel/DTS conventions
- `web-fullstack`: React patterns, API conventions, DB rules
- `firmware`: MCU coding standards, HAL patterns, RTOS rules
- `blank`: Minimal structure only

## Arguments
- `$ARGUMENTS` — Optional domain name (yocto-bsp, web-fullstack, firmware, blank). If empty, prompt for selection.
