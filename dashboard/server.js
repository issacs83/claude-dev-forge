const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { StateManager } = require('./lib/state');

const fs = require('fs');
const PORT = process.env.DASHBOARD_PORT || 7700;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const state = new StateManager();

// Load persisted state on startup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (state.load(DATA_FILE)) {
  console.log('  ✓ State restored from', DATA_FILE);
}

// Auto-save every 30 seconds
setInterval(() => {
  state.save(DATA_FILE);
}, 30000);

// Save on process exit
process.on('SIGINT', () => { state.save(DATA_FILE); process.exit(0); });
process.on('SIGTERM', () => { state.save(DATA_FILE); process.exit(0); });

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

// Get documents (with optional category filter)
app.get('/api/documents', (req, res) => {
  let docs = state.getDocuments();
  if (req.query.category) {
    docs = docs.filter(d => d.category === req.query.category);
  }
  if (req.query.phase !== undefined) {
    docs = docs.filter(d => d.phase === parseInt(req.query.phase));
  }
  res.json(docs);
});

// Save state manually
app.post('/api/save', (req, res) => {
  state.save(DATA_FILE);
  res.json({ ok: true, savedAt: new Date().toISOString(), file: DATA_FILE });
});

// Export full state
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=jun-ai-state.json');
  res.json(state.getFullState());
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

  // 2. Define PDLC phases with default agents and objectives
  const pdlcPhases = [
    { phase: 0, title: 'Phase 0: 선행연구 (Prior Research)', role: 'research', agents: ['paper-patent-researcher'], objective: '관련 기술 논문/특허 조사 및 SOTA 분석 보고서 작성' },
    { phase: 1, title: 'Phase 1: VOC (Voice of Customer)', role: 'research', agents: ['voc-researcher'], objective: '고객 니즈 분석, 페르소나 정의, 요구사항 초안 도출' },
    { phase: 2, title: 'Phase 2: 시장조사 (Market Research)', role: 'research', agents: ['product-strategist'], objective: '시장 규모(TAM/SAM/SOM), 경쟁사 분석, SWOT 보고서' },
    { phase: 3, title: 'Phase 3: 기획/디자인 (Planning & Design)', role: 'management', agents: ['ux-designer', 'marketing-strategist'], objective: 'PRD, UX 사양서, GTM 전략서 작성' },
    { phase: 4, title: 'Phase 4: 세부기획 (Detailed Planning)', role: 'management', agents: ['planner'], objective: 'SRS, HRS, ICD 문서, 위험분석 초안' },
    { phase: 5, title: 'Phase 5: 아키텍처 (Architecture)', role: 'dev', agents: ['architect', 'planner'], objective: '시스템 아키텍처 문서, 기술 스택 결정, WBS' },
    { phase: 6, title: 'Phase 6: 파트별 설계 (Part Design)', role: 'dev', agents: [], objective: '파트별 설계 문서, API 스펙, BOM' },
    { phase: 7, title: 'Phase 7: 세부설계 (Detailed Design)', role: 'dev', agents: ['security-reviewer'], objective: '상세 설계서, DB 스키마, 보안 설계서' },
    { phase: 8, title: 'Phase 8: 구현 (Implementation)', role: 'dev', agents: ['tdd-guide', 'verify-agent'], objective: '소스 코드 구현, 단위 테스트, 코드 리뷰' },
    { phase: 9, title: 'Phase 9: 테스트 (Testing)', role: 'test', agents: ['qa-engineer', 'e2e-tester'], objective: '테스트 계획서, E2E 테스트 결과, 커버리지 리포트' },
    { phase: 10, title: 'Phase 10: 검증 (Verification)', role: 'test', agents: ['regulatory-specialist'], objective: 'DHF, V&V 보고서, 적합성 선언서, 사용자 매뉴얼' },
    { phase: 11, title: 'Phase 11: 평가 (Evaluation)', role: 'management', agents: ['evaluator'], objective: '평가 보고서, 회고록, KPI 분석, 개선 액션' }
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
      objective: p.objective || '',
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

  // If from user → forward to Claude tmux session
  if ((from || 'user') === 'user') {
    const task = state.getTask(req.params.id);
    if (task) {
      try {
        const sessions = execSync('tmux list-windows -t work -F "#{window_name}|#{pane_current_command}" 2>/dev/null', { encoding: 'utf-8' });
        const lines = sessions.trim().split('\n');
        // Find project session or any claude session
        const project = state.getProjects().find(p => p.id === task.project);
        let targetWindow = null;
        if (project) {
          const safeName = 'jun-' + project.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 20);
          targetWindow = lines.find(l => l.startsWith(safeName + '|'));
        }
        if (!targetWindow) targetWindow = lines.find(l => l.includes('|claude'));
        if (targetWindow) {
          const windowName = targetWindow.split('|')[0];
          const escaped = message.replace(/"/g, '\\"').replace(/'/g, "'");
          const instruction = `[Jun.AI 사용자 메시지] 태스크 "${task.title}"에 대한 요청: ${escaped}`;
          exec(`tmux send-keys -t work:${windowName} "${instruction.replace(/"/g, '\\"')}" Enter`);
        }
      } catch (e) { /* ignore tmux errors */ }
    }
  }

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

    // Send dashboard integration protocol to Claude session
    if (projectId || projectName) {
      setTimeout(() => {
        try {
          const initMsg = [
            `[Jun.AI Dashboard 연동] 프로젝트: "${projectName}"`,
            `대시보드 URL: http://58.29.21.11:7700`,
            `이 세션에서 작업할 때 반드시 아래 API로 진행 상황을 보고하세요:`,
            ``,
            `작업 시작: curl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_start","agent":"에이전트명","task":"작업내용"}'`,
            `진행률: curl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_progress","agent":"에이전트명","progress":50,"message":"진행내용"}'`,
            `완료: curl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_complete","agent":"에이전트명","task":"작업내용"}'`,
            `응답: curl -s -X POST http://58.29.21.11:7700/api/tasks/태스크ID/comments -H 'Content-Type: application/json' -d '{"from":"에이전트명","message":"응답내용"}'`,
            ``,
            `사용자가 대시보드 채팅으로 메시지를 보내면 이 세션으로 전달됩니다. 응답은 위 comments API로 보내주세요.`
          ].join('\\n');
          execSync(`tmux send-keys -t work:${safeName} "${initMsg}" Enter 2>/dev/null`);
        } catch (e) { /* ignore */ }
      }, 4000);
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
    const escaped = message.replace(/"/g, '\\"');
    execSync(`tmux send-keys -t work:${windowName} "${escaped}" Enter 2>/dev/null`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get live terminal output from a tmux session (capture-pane)
app.get('/api/sessions/:name/output', (req, res) => {
  try {
    const output = execSync(
      `tmux capture-pane -t work:${req.params.name} -p -S -50 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    res.json({ window: req.params.name, output, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(404).json({ error: 'Session not found or no output' });
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
