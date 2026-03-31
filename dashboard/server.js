'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const pty = require('node-pty');

const { StateManager } = require('./lib/state');
const { JsonRepository } = require('./repositories/json-repository');
const broadcastSvc = require('./services/broadcast');
const { startHealthMonitor } = require('./services/health-monitor');

// Routes
const createProjectsRouter = require('./routes/projects');
const createTasksRouter = require('./routes/tasks');
const createAgentsRouter = require('./routes/agents');
const { DEFAULT_AGENT_SKILLS } = require('./routes/agents');
const createSessionsRouter = require('./routes/sessions');
const createChatRouter = require('./routes/chat');
const createEventsRouter = require('./routes/events');
const createDocumentsRouter = require('./routes/documents');
const createPhasesRouter = require('./routes/phases');
const createFilesRouter = require('./routes/files');
const createActivityRouter = require('./routes/activity');
const { ActivityLogger } = require('./services/activity-logger');
const createOrgChartRouter = require('./routes/org-chart');
const { DEFAULT_ORG_CHART, updateAgentOrg } = require('./routes/org-chart');

const PORT = process.env.DASHBOARD_PORT || 7700;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const CHAT_DIR = path.join(__dirname, 'data', 'chat');

// --- Express + HTTP server setup ---
const app = express();
const server = http.createServer(app);

// --- WebSocket routing (noServer mode for multiple paths) ---
const wss = new WebSocket.Server({ noServer: true });
const termWss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws/terminal') {
    termWss.handleUpgrade(request, socket, head, (ws) => {
      termWss.emit('connection', ws, request);
    });
  } else {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Initialize broadcast service
broadcastSvc.init(wss);
const broadcast = broadcastSvc.broadcast;

// --- Terminal PTY (web terminal) ---
const activePtys = new Map();

termWss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionName = url.searchParams.get('session');
  if (!sessionName || !sessionName.startsWith('jun-')) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid session name' }));
    ws.close();
    return;
  }

  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: `Session "${sessionName}" not found` }));
    ws.close();
    return;
  }

  const shell = pty.spawn('tmux', ['attach-session', '-t', sessionName], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.env.HOME,
    env: { ...process.env, TERM: 'xterm-256color' }
  });

  activePtys.set(ws, shell);

  shell.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  shell.onExit(() => {
    activePtys.delete(ws);
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });

  ws.on('message', (raw) => {
    const msg = raw.toString();
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
        shell.resize(parsed.cols, parsed.rows);
        return;
      }
    } catch (e) { /* not JSON, treat as terminal input */ }
    shell.write(msg);
  });

  ws.on('close', () => {
    const p = activePtys.get(ws);
    if (p) { p.kill(); activePtys.delete(ws); }
  });
});

// --- State ---
const state = new StateManager();
const repo = new JsonRepository(state);
const activityLogger = new ActivityLogger(state);
repo.setActivityLogger(activityLogger);

// Load persisted state on startup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (state.load(DATA_FILE)) {
  console.log('  ✓ State restored from', DATA_FILE);
}

// Auto-save every 30 seconds
setInterval(() => { state.save(DATA_FILE); }, 30000);

function saveState() { state.save(DATA_FILE); }

// --- Health monitor ---
startHealthMonitor(state, broadcast, saveState, DATA_FILE, CHAT_DIR);

// --- Process signals ---
process.on('SIGINT', () => { state.save(DATA_FILE); process.exit(0); });
process.on('SIGTERM', () => { state.save(DATA_FILE); process.exit(0); });
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
  state.save(DATA_FILE);
});
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED]', err);
});

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Clean orphan documents on startup ---
setTimeout(() => {
  const removed = repo.cleanDocuments();
  if (removed > 0) {
    console.log(`  ✓ Cleaned ${removed} orphan documents`);
    saveState();
  }
}, 1000);

// --- Initialize org chart: active agents with proper hierarchy ---
setTimeout(() => {
  const orgChart = repo.getOrgChart();
  const activeAgents = repo.getAgents();

  // Always force correct hierarchy from DEFAULT_ORG_CHART
  // This ensures reportsTo is correct even if old flat data exists
  let changed = false;

  // Ensure project-director exists
  if (!orgChart['project-director']) {
    orgChart['project-director'] = DEFAULT_ORG_CHART['project-director'];
    changed = true;
  }

  // For each active agent: add or update from DEFAULT hierarchy
  Object.keys(activeAgents).forEach(name => {
    if (name.length > 50 || name.includes(';') || name.includes('rm ')) return;
    if (DEFAULT_ORG_CHART[name]) {
      // Always sync hierarchy from DEFAULT (reportsTo, level)
      orgChart[name] = { ...DEFAULT_ORG_CHART[name] };
      changed = true;
      // Also ensure their manager chain exists
      let parent = DEFAULT_ORG_CHART[name].reportsTo;
      while (parent && parent !== 'project-director' && !orgChart[parent] && DEFAULT_ORG_CHART[parent]) {
        orgChart[parent] = { ...DEFAULT_ORG_CHART[parent] };
        parent = DEFAULT_ORG_CHART[parent].reportsTo;
      }
    }
  });

  // Remove agents not in DEFAULT and not active (junk)
  Object.keys(orgChart).forEach(name => {
    if (name.length > 50 || name.includes(';') || name.includes('rm ')) {
      delete orgChart[name];
      changed = true;
    }
  });

  // Only keep: project-director + active (hired) agents
  Object.keys(orgChart).forEach(name => {
    if (name !== 'project-director' && !activeAgents[name]) {
      delete orgChart[name];
      changed = true;
    }
  });

  if (changed) {
    saveState();
    console.log(`  ✓ Org chart: ${Object.keys(orgChart).length} agents (hierarchy synced)`);
  }
}, 1500);

// --- Mount routes ---

// File serving (must be before static catch-all)
app.use('/files', createFilesRouter(repo));

// Core API routes
app.use('/api/projects', createProjectsRouter(repo, broadcast, saveState));
app.use('/api/tasks', createTasksRouter(repo, broadcast, saveState, DEFAULT_AGENT_SKILLS));
app.use('/api/sessions', createSessionsRouter(repo, saveState, DATA_FILE));
app.use('/api/chat', createChatRouter(repo, broadcast));
app.use('/api/events', createEventsRouter(repo, broadcast, saveState));
app.use('/api/phases', createPhasesRouter(repo));
app.use('/api/activity', createActivityRouter(repo));

// Documents / state management (mounted at /api to expose /api/save, /api/export, /api/backups, /api/restore, /api/documents)
const docsRouter = createDocumentsRouter(repo, broadcast, saveState, DATA_FILE);
app.use('/api/documents', docsRouter);
app.post('/api/save', (req, res) => { saveState(); res.json({ ok: true, savedAt: new Date().toISOString(), file: DATA_FILE }); });
app.get('/api/export', (req, res) => { res.setHeader('Content-Disposition', 'attachment; filename=jun-ai-state.json'); res.json(repo.getFullState()); });
app.get('/api/backups', (req, res) => { res.json(repo.listBackups(DATA_FILE)); });
app.post('/api/restore', (req, res) => {
  const { backupFile } = req.body;
  if (!backupFile) return res.status(400).json({ error: 'backupFile required' });
  const ok = repo.restoreFromBackup(DATA_FILE, backupFile);
  if (ok) {
    broadcast({ type: 'state_update', data: repo.getFullState() });
    res.json({ ok: true, message: `Restored from ${backupFile}`, projects: repo.getProjects().length, tasks: repo.getTasks().length });
  } else {
    res.status(404).json({ error: 'Backup not found or invalid' });
  }
});

// Agents router
app.use('/api/agents', createAgentsRouter(repo, broadcast, saveState));

// Org Chart router
const orgChartRouter = createOrgChartRouter(repo, broadcast, saveState);
app.use('/api/org-chart', orgChartRouter);
// Also expose PATCH /api/agents/:name/org for agent-centric updates
app.patch('/api/agents/:name/org', (req, res) => updateAgentOrg(req, res, repo, broadcast, saveState));
app.get('/api/skills', (req, res) => {
  const agents = repo.getAgents();
  const skillSet = new Set();
  Object.entries(agents).forEach(([name, agent]) => {
    const skills = (agent.skills && agent.skills.length > 0) ? agent.skills : (DEFAULT_AGENT_SKILLS[name] || []);
    skills.forEach(s => skillSet.add(s));
  });
  Object.values(DEFAULT_AGENT_SKILLS).forEach(skills => { skills.forEach(s => skillSet.add(s)); });
  res.json({ skills: Array.from(skillSet).sort() });
});

// Telegram token management routes (under /api/telegram)
const { loadTelegramTokens, saveTelegramTokens, KNOWN_TOKEN_PATHS } = require('./services/telegram');
app.post('/api/telegram/token', (req, res) => {
  const { projectId, token } = req.body;
  if (!projectId || !token) return res.status(400).json({ error: 'projectId and token required' });
  const tokens = loadTelegramTokens();
  tokens[projectId] = { token, updatedAt: new Date().toISOString() };
  saveTelegramTokens(tokens);
  repo.updateProject(projectId, { telegramToken: token });
  saveState();
  res.json({ ok: true, message: `프로젝트 ${projectId}에 텔레그램 토큰 저장됨` });
});
app.get('/api/telegram/token/:projectId', (req, res) => {
  const tokens = loadTelegramTokens();
  const entry = tokens[req.params.projectId];
  if (!entry) return res.status(404).json({ error: 'Token not found' });
  res.json({ projectId: req.params.projectId, hasToken: true, updatedAt: entry.updatedAt });
});
app.get('/api/telegram/tokens', (req, res) => {
  const tokens = loadTelegramTokens();
  const result = Object.entries(tokens).map(([pid, entry]) => ({ projectId: pid, hasToken: true, updatedAt: entry.updatedAt }));
  res.json(result);
});
app.get('/api/telegram/detect', (req, res) => {
  const found = [];
  KNOWN_TOKEN_PATHS.forEach(({ path: envPath, label }) => {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/TELEGRAM_BOT_TOKEN=(.+)/);
        if (match) {
          const token = match[1].trim();
          const masked = token.substring(0, 10) + '...' + token.substring(token.length - 4);
          found.push({ label, source: envPath, masked });
        }
      }
    } catch (e) {}
  });
  const registered = loadTelegramTokens();
  Object.entries(registered).forEach(([pid, entry]) => {
    const project = repo.getProjects().find(p => p.id === pid);
    const pName = project ? project.name : `Project ${pid}`;
    const masked = entry.token.substring(0, 10) + '...' + entry.token.substring(entry.token.length - 4);
    if (!found.some(f => f.masked === masked)) {
      found.push({ label: `${pName} (등록됨)`, source: 'registered', masked });
    }
  });
  res.json(found);
});
app.delete('/api/telegram/token/:projectId', (req, res) => {
  const tokens = loadTelegramTokens();
  delete tokens[req.params.projectId];
  saveTelegramTokens(tokens);
  repo.updateProject(req.params.projectId, { telegramToken: null });
  saveState();
  res.json({ ok: true });
});

// Simple utility endpoints
app.get('/api/status', (req, res) => { res.json(repo.getFullState()); });
app.get('/api/timeline', (req, res) => { res.json(repo.getTimeline()); });
app.get('/api/notifications', (req, res) => {
  const unread = req.query.unread === 'true';
  res.json(repo.getNotifications(unread));
});
app.post('/api/notifications/read', (req, res) => {
  if (req.body.id) { repo.markNotificationRead(req.body.id); }
  else { repo.markAllNotificationsRead(); }
  saveState();
  res.json({ ok: true });
});
app.post('/api/confirm', (req, res) => {
  const { id, approved } = req.body;
  broadcast({ type: 'confirm_response', data: { id, approved } });
  res.json({ ok: true });
});
app.post('/api/notify', (req, res) => {
  const notif = req.body;
  if (notif.confirm) {
    broadcast({ type: 'agent_confirm', data: notif });
  } else {
    broadcast({ type: 'event', data: { type: 'agent_complete', ...notif } });
  }
  res.json({ ok: true });
});

// Upload endpoint
app.post('/api/upload', (req, res) => {
  const { data, fileName, type } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });
  const safeName = `${Date.now()}-${(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '')}`;
  const filePath = path.join(__dirname, 'public', 'uploads', safeName);
  try {
    const buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
    fs.writeFileSync(filePath, buffer);
    res.json({ ok: true, url: '/uploads/' + safeName, fileName: safeName, size: buffer.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- WebSocket main connection ---
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state_update', data: repo.getFullState() }));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) { /* ignore */ }
  });
});

// --- Start server ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Jun.AI Dashboard`);
  const host = process.env.DASHBOARD_HOST || '58.29.21.11';
  console.log(`  ● Live on http://${host}:${PORT}\n`);

  // --- Auto-start & watchdog for telegram-bridge ---
  const BRIDGE_SCRIPT = path.join(__dirname, 'telegram-bridge.js');
  const BRIDGE_LOG = '/home/issacs/.jun-ai/logs/telegram.log';

  function startBridge() {
    try {
      try {
        const pids = execSync('pgrep -f "node.*telegram-bridge" 2>/dev/null', { encoding: 'utf-8' }).trim();
        if (pids) return;
      } catch (e) { /* not running */ }

      try { fs.mkdirSync(path.dirname(BRIDGE_LOG), { recursive: true }); } catch (e) {}
      exec(`cd "${__dirname}" && nohup node --unhandled-rejections=warn "${BRIDGE_SCRIPT}" >> "${BRIDGE_LOG}" 2>&1 &`);
      console.log('  ✓ Telegram bridge started');
    } catch (e) {
      console.error('  ✗ Failed to start telegram bridge:', e.message);
    }
  }

  startBridge();

  setInterval(() => {
    try {
      execSync('pgrep -f "node.*telegram-bridge" > /dev/null 2>&1');
    } catch (e) {
      console.log(`  [${new Date().toISOString()}] Telegram bridge died — restarting...`);
      startBridge();
    }
  }, 10000);
});
