---
allowed-tools: ""
description: "UX/UI specification generation"
---

# /design-spec — UX/UI Design Specification

You are executing the `/design-spec` command.

## Steps

1. **Read Requirements**
   - Read the requirements document or PRD provided by the user
   - Identify user flows, features, and constraints relevant to the design
   - Ask for clarification if requirements are incomplete

2. **Invoke UX Designer**
   - Use the `ux-designer` agent to analyze requirements and propose design solutions
   - Consider accessibility, platform conventions, and user mental models

3. **Create Information Architecture**
   - Define the navigation structure, page hierarchy, and content organization
   - Map user flows from entry points to task completion
   - Identify key screens and their relationships

4. **Generate Wireframes**
   - Produce text-based wireframe descriptions for each key screen
   - Define layout, component placement, and interaction patterns
   - Annotate wireframes with behavior notes (hover states, transitions, edge cases)

5. **Produce UX Spec Document**
   - Compile the full UX specification including: IA diagram, wireframes, interaction specs, component inventory
   - Include responsive behavior rules and accessibility requirements
   - Define design tokens (colors, typography, spacing) if applicable

## Rules
- Always trace design decisions back to user requirements
- Consider error states, empty states, and loading states for every screen
- Follow platform-specific design guidelines (Material, HIG, etc.) when applicable
- Spec must be implementation-ready — no ambiguity for developers

## Arguments
- `$ARGUMENTS` — Feature or product to design (name, description, or path to requirements doc). If empty, ask the user.
