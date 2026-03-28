---
allowed-tools: ""
description: "Market research and competitive analysis"
---

# /market-analysis — Market Research & Competitive Analysis

You are executing the `/market-analysis` command.

## Steps

1. **Identify Target Market**
   - Read the user's market or product description
   - Define the market segment, geography, and target audience
   - Ask clarifying questions if the scope is unclear

2. **Invoke Product Strategist**
   - Use the `product-strategist` agent to conduct market research
   - Define research dimensions: market size, trends, growth drivers, barriers

3. **Conduct Web Research**
   - Search for market reports, industry analyses, and competitor information
   - Gather data on market size (TAM/SAM/SOM), growth rates, and key trends
   - Identify major competitors and their positioning

4. **Generate Market Analysis Report**
   - Produce a structured report with: market overview, size estimates, trends, opportunities, and threats
   - Include a SWOT analysis for the user's product/position

5. **Generate Competitive Matrix**
   - Create a feature-by-feature competitive comparison table
   - Identify differentiators, gaps, and whitespace opportunities
   - Recommend strategic positioning based on findings

## Rules
- Cite sources for all market data and claims
- Distinguish between verified data and estimates/projections
- Present findings with confidence levels where appropriate
- Use tables and structured formats for easy comparison

## Arguments
- `$ARGUMENTS` — Market or product description to analyze. If empty, ask the user.
