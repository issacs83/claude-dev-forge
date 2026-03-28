const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { StateManager } = require('./lib/state');

const PORT = process.env.DASHBOARD_PORT || 7700;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const state = new StateManager();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- REST API ---

// Get full state
app.get('/api/status', (req, res) => {
  res.json(state.getFullState());
});

// Get agents status
app.get('/api/agents', (req, res) => {
  res.json(state.getAgents());
});

// Get timeline
app.get('/api/timeline', (req, res) => {
  res.json(state.getTimeline());
});

// Get documents
app.get('/api/documents', (req, res) => {
  res.json(state.getDocuments());
});

// Get phases
app.get('/api/phases', (req, res) => {
  res.json(state.getPhases());
});

// Post event (called by project-director / hooks)
app.post('/api/events', (req, res) => {
  const event = req.body;
  event.timestamp = event.timestamp || new Date().toISOString();
  state.processEvent(event);
  broadcast({ type: 'event', data: event });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json({ ok: true });
});

// Get projects
app.get('/api/projects', (req, res) => {
  res.json(state.getProjects());
});

// Create project
app.post('/api/projects', (req, res) => {
  const project = state.createProject(req.body);
  broadcast({ type: 'project_created', data: project });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json(project);
});

// Update project
app.patch('/api/projects/:id', (req, res) => {
  const project = state.updateProject(req.params.id, req.body);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json(project);
});

// Create task
app.post('/api/tasks', (req, res) => {
  const task = state.createTask(req.body);
  broadcast({ type: 'task_created', data: task });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json(task);
});

// Update task
app.patch('/api/tasks/:id', (req, res) => {
  const task = state.updateTask(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  broadcast({ type: 'task_updated', data: task });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json(task);
});

// Project setup — creates project + PDLC phase tasks + initial agents
app.post('/api/projects/setup', (req, res) => {
  const { name, description, domain, phases } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  // 1. Create project
  const project = state.createProject({ name, description: description || '', status: 'active' });

  // 2. Define PDLC phases with default agents
  const pdlcPhases = [
    { phase: 0, title: 'Phase 0: 선행연구 (Prior Research)', role: 'research', agents: ['paper-patent-researcher'] },
    { phase: 1, title: 'Phase 1: VOC (Voice of Customer)', role: 'research', agents: ['voc-researcher'] },
    { phase: 2, title: 'Phase 2: 시장조사 (Market Research)', role: 'research', agents: ['product-strategist'] },
    { phase: 3, title: 'Phase 3: 기획/디자인 (Planning & Design)', role: 'management', agents: ['ux-designer', 'marketing-strategist'] },
    { phase: 4, title: 'Phase 4: 세부기획 (Detailed Planning)', role: 'management', agents: ['planner'] },
    { phase: 5, title: 'Phase 5: 아키텍처 (Architecture)', role: 'dev', agents: ['architect', 'planner'] },
    { phase: 6, title: 'Phase 6: 파트별 설계 (Part Design)', role: 'dev', agents: [] },
    { phase: 7, title: 'Phase 7: 세부설계 (Detailed Design)', role: 'dev', agents: ['security-reviewer'] },
    { phase: 8, title: 'Phase 8: 구현 (Implementation)', role: 'dev', agents: ['tdd-guide', 'verify-agent'] },
    { phase: 9, title: 'Phase 9: 테스트 (Testing)', role: 'test', agents: ['qa-engineer', 'e2e-tester'] },
    { phase: 10, title: 'Phase 10: 검증 (Verification)', role: 'test', agents: ['regulatory-specialist'] },
    { phase: 11, title: 'Phase 11: 평가 (Evaluation)', role: 'management', agents: ['evaluator'] }
  ];

  // Apply domain-specific agents to Phase 6
  const domainAgents = {
    'web-fullstack': ['web-developer', 'sdk-developer'],
    'yocto-bsp': ['bsp-engineer', 'firmware-engineer'],
    'firmware': ['firmware-engineer', 'circuit-engineer'],
    'ai-ml': ['ai-trainer', 'data-engineer', 'cuda-engineer'],
    'hardware': ['hardware-engineer', 'circuit-engineer'],
    'general': []
  };
  const phase6Agents = domainAgents[domain] || domainAgents['general'];
  pdlcPhases[6].agents = phase6Agents;

  // 3. Filter phases if subset requested
  const activePhases = phases && phases.length > 0
    ? pdlcPhases.filter(p => phases.includes(p.phase))
    : pdlcPhases;

  // 4. Create tasks for each phase
  const tasks = activePhases.map(p => {
    return state.createTask({
      title: p.title,
      project: project.id,
      role: p.role,
      priority: p.phase <= 2 ? 'high' : p.phase >= 9 ? 'high' : 'medium',
      status: 'todo',
      phase: p.phase,
      agent: p.agents[0] || '',
      description: `Agents: ${p.agents.join(', ') || 'TBD (domain-specific)'}`
    });
  });

  // 5. Set first phase as env-provisioner check
  state.processEvent({
    type: 'agent_waiting',
    agent: 'env-provisioner',
    waiting_for: `${name} 프로젝트 환경 점검 대기`,
    timestamp: new Date().toISOString()
  });

  // 6. Broadcast
  broadcast({ type: 'state_update', data: state.getFullState() });

  res.json({
    project,
    tasks,
    message: `프로젝트 "${name}" 셋업 완료 — ${tasks.length}개 PDLC 태스크 생성됨`
  });
});

// Delete project (with confirmation — client must send name match)
app.delete('/api/projects/:id', (req, res) => {
  const project = state.getProjects().find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.body.confirmName && req.body.confirmName !== project.name) {
    return res.status(400).json({ error: 'Project name does not match' });
  }
  state.deleteProject(req.params.id);
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json({ ok: true, deleted: project.name });
});

// Get task detail
app.get('/api/tasks/:id', (req, res) => {
  const task = state.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({
    ...task,
    history: state.getTaskHistory(req.params.id),
    comments: state.getComments(req.params.id),
    documents: state.getTaskDocuments(req.params.id)
  });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const task = state.deleteTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json({ ok: true });
});

// Task comments
app.get('/api/tasks/:id/comments', (req, res) => {
  res.json(state.getComments(req.params.id));
});

app.post('/api/tasks/:id/comments', (req, res) => {
  const { from, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const comment = state.addComment(req.params.id, from || 'user', message);
  broadcast({ type: 'task_comment', data: { taskId: req.params.id, comment } });
  broadcast({ type: 'state_update', data: state.getFullState() });
  res.json(comment);
});

// Task history
app.get('/api/tasks/:id/history', (req, res) => {
  res.json(state.getTaskHistory(req.params.id));
});

// Phase detail
app.get('/api/phases/:id', (req, res) => {
  const detail = state.getPhaseDetail(parseInt(req.params.id));
  if (!detail) return res.status(404).json({ error: 'Phase not found' });
  res.json(detail);
});

// --- Session Management (tmux + claude) ---
const { execSync, exec } = require('child_process');

// List active tmux windows
app.get('/api/sessions', (req, res) => {
  try {
    const out = execSync('tmux list-windows -t work -F "#{window_index}|#{window_name}|#{pane_current_command}|#{pane_current_path}" 2>/dev/null', { encoding: 'utf-8' });
    const windows = out.trim().split('\n').filter(Boolean).map(line => {
      const [index, name, command, cwd] = line.split('|');
      return { index: parseInt(index), name, command, cwd, isClaudeSession: command === 'claude' || name.startsWith('jun-') };
    });
    res.json(windows);
  } catch (e) {
    res.json([]);
  }
});

// Start new Claude Code session in tmux
app.post('/api/sessions/start', (req, res) => {
  const { projectName, projectPath, projectId } = req.body;
  if (!projectName) return res.status(400).json({ error: 'projectName required' });

  const safeName = 'jun-' + projectName.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 20);
  const workDir = projectPath || `/home/issacs/work`;

  try {
    // Check if session with this name already exists
    try {
      const existing = execSync(`tmux list-windows -t work -F "#{window_name}" 2>/dev/null`, { encoding: 'utf-8' });
      if (existing.includes(safeName)) {
        // Focus existing window
        execSync(`tmux select-window -t work:${safeName} 2>/dev/null`);
        return res.json({ ok: true, action: 'focused', window: safeName, message: `기존 세션 "${safeName}" 으로 전환됨` });
      }
    } catch (e) { /* no existing */ }

    // Create new tmux window with claude
    const cmd = `tmux new-window -t work -n "${safeName}" "cd ${workDir} && claude" 2>/dev/null`;
    exec(cmd);

    // If projectId, send initial context after claude starts
    if (projectId) {
      setTimeout(() => {
        try {
          const initMsg = `이 프로젝트는 Jun.AI Dashboard(http://58.29.21.11:7700)에 등록된 "${projectName}" 프로젝트입니다. 대시보드 API를 통해 진행 상황을 보고하세요.`;
          execSync(`tmux send-keys -t work:${safeName} "${initMsg}" Enter 2>/dev/null`);
        } catch (e) { /* ignore */ }
      }, 3000);
    }

    res.json({ ok: true, action: 'created', window: safeName, message: `새 세션 "${safeName}" 시작됨` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stop/close a tmux window
app.post('/api/sessions/stop', (req, res) => {
  const { windowName } = req.body;
  if (!windowName) return res.status(400).json({ error: 'windowName required' });
  try {
    execSync(`tmux kill-window -t work:${windowName} 2>/dev/null`);
    res.json({ ok: true, message: `세션 "${windowName}" 종료됨` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send message to a running claude session
app.post('/api/sessions/send', (req, res) => {
  const { windowName, message } = req.body;
  if (!windowName || !message) return res.status(400).json({ error: 'windowName and message required' });
  try {
    // Escape double quotes in message
    const escaped = message.replace(/"/g, '\\"');
    execSync(`tmux send-keys -t work:${windowName} "${escaped}" Enter 2>/dev/null`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirm response (from dashboard UI)
app.post('/api/confirm', (req, res) => {
  const { id, approved } = req.body;
  broadcast({ type: 'confirm_response', data: { id, approved } });
  res.json({ ok: true });
});

// Send notification to dashboard (called by project-director / agents)
app.post('/api/notify', (req, res) => {
  const notif = req.body;
  if (notif.confirm) {
    broadcast({ type: 'agent_confirm', data: notif });
  } else {
    broadcast({ type: 'event', data: { type: 'agent_complete', ...notif } });
  }
  res.json({ ok: true });
});

// --- WebSocket ---

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  // Send full state on connect
  ws.send(JSON.stringify({
    type: 'state_update',
    data: state.getFullState()
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) { /* ignore */ }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Jun.AI Dashboard`);
  const host = process.env.DASHBOARD_HOST || '58.29.21.11';
  console.log(`  ● Live on http://${host}:${PORT}\n`);
});
