---
allowed-tools: ""
description: "Start PDLC monitoring dashboard"
---

# /dashboard — PDLC Monitoring Dashboard

You are executing the `/dashboard` command.

## Steps

1. **Check Prerequisites**
   - Verify Node.js is installed and accessible
   - Check if the dashboard module exists in the project
   - Install dependencies if needed

2. **Start Dashboard Server**
   - Launch the dashboard server on port 7700 (or user-specified port)
   - Establish WebSocket connection for real-time updates
   - Verify the server is running and responsive

3. **Open Browser**
   - Open the dashboard URL in the default browser
   - If no GUI is available, display the URL for manual access

## Dashboard Features
- **Agent Status**: Real-time status of all active agents (idle, running, error)
- **Project Progress**: Phase-by-phase progress visualization with completion percentage
- **Document Outputs**: List of generated documents with links and timestamps
- **Activity Log**: Live feed of agent actions and decisions via WebSocket
- **KPI Metrics**: Key performance indicators for the current project lifecycle

## Rules
- Dashboard is read-only — it monitors but does not control agent execution
- WebSocket must reconnect automatically on connection loss
- Server must gracefully shut down when the session ends
- Do not expose the dashboard on public interfaces without authentication

## Arguments
- `$ARGUMENTS` — Optional port number (default: 7700). If empty, uses default port.
