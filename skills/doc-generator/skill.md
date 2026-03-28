---
name: doc-generator
description: "Automated document generation with format-specific writer dispatch"
---

# Document Generator Skill

## Trigger
Activated when analysis/design/test phases complete and documents need to be produced.

## Workflow
1. **Analyze**: Determine what document types are needed from the phase output
2. **Format**: Select appropriate format based on document type:
   - Technical reports, specs, manuals → report-writer (.docx)
   - Presentations, proposals → presentation-writer (.pptx)
   - Korean official docs, certifications → hwp-writer (.hwpx)
   - Data tables, matrices, BOM → spreadsheet-writer (.xlsx)
3. **Generate**: Dispatch the appropriate writer agent with content
4. **Verify**: Confirm file was created successfully
5. **Report**: List generated files to user

## Format Decision Matrix
| Content Type | Primary Format | Secondary |
|---|---|---|
| Analysis report | .docx | .pptx |
| Design spec | .docx | — |
| Test results | .docx | .xlsx |
| BOM / budget | .xlsx | — |
| Traceability matrix | .xlsx | — |
| Executive summary | .pptx | .docx |
| Government submission | .hwpx | — |
| FMEA | .xlsx | .docx |
| User manual | .docx | — |
| Competitive comparison | .xlsx | .pptx |

## Output Directory Structure
```
output/
├── phase-0-research/
├── phase-1-voc/
├── phase-2-market/
├── ...
├── phase-11-evaluation/
├── screenshots/
└── test-reports/
```
