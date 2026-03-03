# Date Calculation Rules

## Format
- Always use ISO 8601: `YYYY-MM-DD` for dates, `YYYY-MM-DDTHH:mm:ssZ` for timestamps
- Use system date for current date — never hardcode
- Store in UTC, display in local timezone

## Calculations
- Use proper date libraries (date-fns, dayjs, chrono) — avoid manual arithmetic
- Account for timezone differences in scheduling
- Handle DST transitions carefully
- Validate date ranges before processing

## Versioning Dates
- Release dates: `YYYY-MM-DD` format
- Changelog entries: newest first
- Build timestamps: UTC with timezone suffix
