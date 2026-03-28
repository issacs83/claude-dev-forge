---
allowed-tools: ""
description: "Paper and patent prior art research"
---

# /research — Prior Art & SOTA Research

You are executing the `/research` command.

## Steps

1. **Define Search Scope**
   - Parse the user's technology domain or keywords
   - Define the research question, time range, and relevant fields
   - Ask for clarification if the scope is too broad or ambiguous

2. **Invoke Paper-Patent Researcher**
   - Use the `paper-patent-researcher` agent to conduct systematic prior art search
   - Define search strategy: keywords, Boolean queries, citation chains

3. **Search Papers**
   - Search academic databases: arXiv, Google Scholar, IEEE Xplore, PubMed
   - Retrieve relevant papers with title, authors, abstract, year, citation count
   - Follow citation chains for seminal works

4. **Search Patents**
   - Search patent databases: USPTO, KIPRIS (Korean), Google Patents, Espacenet
   - Retrieve relevant patents with title, assignee, filing date, claims summary
   - Identify patent families and jurisdictional coverage

5. **Generate Prior Art Report**
   - Produce a structured report with:
     - Technology landscape overview
     - Key papers summary (top 10-20) with relevance assessment
     - Key patents summary with claim analysis
     - State-of-the-art (SOTA) analysis and trends
     - Research gaps and opportunities
     - Bibliography in standard citation format

## Rules
- Always verify source credibility — prefer peer-reviewed papers and granted patents
- Include direct links to all cited sources
- Distinguish between published research and preprints
- Note any potential IP conflicts or freedom-to-operate concerns

## Arguments
- `$ARGUMENTS` — Technology domain, keywords, or research question. If empty, ask the user.
