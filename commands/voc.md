---
allowed-tools: ""
description: "VOC data analysis and persona/requirements derivation"
---

# /voc — Voice of Customer Analysis

You are executing the `/voc` command.

## Steps

1. **Collect VOC Data**
   - Read the VOC data source provided by the user (survey results, interview transcripts, support tickets, reviews, etc.)
   - If no data is provided, ask the user for the data source or description

2. **Invoke VOC Researcher**
   - Use the `voc-researcher` agent to analyze the collected data
   - Identify themes, pain points, unmet needs, and feature requests
   - Prioritize findings by frequency and impact

3. **Generate VOC Analysis Report**
   - Produce a structured report with: key themes, sentiment analysis, priority matrix
   - Include direct quotes and evidence for each finding

4. **Create Personas**
   - Derive user personas from the VOC data
   - Each persona includes: demographics, goals, frustrations, usage patterns, and quotes

5. **Derive Requirements**
   - Translate VOC findings into actionable product requirements
   - Map each requirement back to its VOC evidence
   - Prioritize using MoSCoW or similar framework

## Rules
- Always ground findings in actual VOC data — no assumptions without evidence
- Present quantitative data where available (frequency counts, sentiment scores)
- Clearly separate facts (from data) from interpretations (analyst judgment)

## Arguments
- `$ARGUMENTS` — VOC data source or description (file path, URL, or inline data). If empty, ask the user.
