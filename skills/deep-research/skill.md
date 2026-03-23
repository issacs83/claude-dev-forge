---
name: deep-research
description: "Multi-source structured research with citations and report"
---

# Deep Research Skill

## Trigger
Keywords: "조사", "연구", "research", "deep dive", "competitive analysis", "prior art"

## Workflow
1. **Define scope**: clarify research question, split into 3-5 sub-questions
2. **Search**: use WebSearch, WebFetch, context7 for multiple sources
3. **Read deeply**: select 3-5 most relevant sources, read in full
4. **Synthesize**: combine findings into structured report
5. **Gap analysis**: identify what was NOT found, note limitations

## Output Format
```markdown
# Research Report: [Topic]

## Executive Summary
[2-3 sentences]

## Findings
### [Sub-question 1]
[Content with inline citations]

### [Sub-question 2]
...

## Key Takeaways
- [Actionable insight 1]
- [Actionable insight 2]

## Research Gaps
- [What was not found]
- [Areas needing deeper investigation]

## Sources
1. [Source with URL and access date]
```

## Quality Criteria
- Every claim must have a source
- Prefer sources < 12 months old
- Distinguish fact vs opinion vs speculation
- Transparently disclose research gaps

## Embedded-Specific Sources
- NXP Community, kernel.org, Yocto Project docs
- LWN.net for kernel/driver analysis
- Datasheets from manufacturer sites
- IEEE/ACM for academic papers
