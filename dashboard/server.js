const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { StateManager } = require('./lib/state');
const { execSync, exec } = require('child_process');

const fs = require('fs');
const PORT = process.env.DASHBOARD_PORT || 7700;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const app = express();
const server = http.createServer(app);
const pty = require('node-pty');

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
const activePtys = new Map(); // ws → ptyProcess

termWss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionName = url.searchParams.get('session');
  if (!sessionName || !sessionName.startsWith('jun-')) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid session name' }));
    ws.close();
    return;
  }

  // Check if tmux session exists
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: `Session "${sessionName}" not found` }));
    ws.close();
    return;
  }

  // Spawn tmux attach as a PTY
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

// --- Task Health Monitor (timeout + stale detection) ---
const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5분 무응답 시 타임아웃
const AGENT_STALE_MS = 3 * 60 * 1000;  // 3분 진행률 변화 없으면 stale

setInterval(() => {
  const now = Date.now();
  const tasks = state.tasks || [];
  const agents = state.agents || {};

  tasks.forEach(task => {
    // Skip: not in_progress, no agent, done, or pending approval
    if (task.status !== 'in_progress') return;
    if (!task.agent) return;
    if (task.approval && task.approval.status === 'pending') return;

    const agent = agents[task.agent];
    if (!agent) {
      task._healthStatus = 'no_agent';
      task._healthMessage = `에이전트 "${task.agent}" 응답 없음 — 세션 미연결`;
      return;
    }

    // Skip if agent already completed (will be handled by auto-done below)
    if (agent.status === 'completed') return;

    if (agent.status === 'running') {
      const startedAt = new Date(agent.startedAt || task.updatedAt).getTime();
      const elapsed = now - startedAt;
      const progress = agent.progress || 0;

      if (progress === 0 && elapsed > TASK_TIMEOUT_MS) {
        task._healthStatus = 'timeout';
        task._healthMessage = `${Math.floor(elapsed/60000)}분 경과, 진행률 0% — 세션 미응답`;

        // Auto-revert to todo
        task.status = 'todo';
        task.updatedAt = new Date().toISOString();
        state._addHistory(task.id, 'timeout_revert', `타임아웃: ${Math.floor(elapsed/60000)}분 무응답 → todo 복귀`);

        // Also reset the agent status to prevent re-triggering
        agent.status = 'idle';
        agent.progress = 0;

        broadcast({ type: 'state_update', data: state.getFullState() });
        saveState();

      } else if (progress > 0 && progress < 100) {
        // Check if progress is stale (no change for 3 min)
        const lastProgress = agent._lastProgressTime || startedAt;
        if (now - lastProgress > AGENT_STALE_MS && agent._lastProgress === progress) {
          task._healthStatus = 'stale';
          task._healthMessage = `진행률 ${progress}%에서 ${Math.floor((now-lastProgress)/60000)}분째 멈춤`;
        } else {
          task._healthStatus = 'running';
          task._healthMessage = `정상 진행 중 (${progress}%)`;
        }
      } else {
        task._healthStatus = 'running';
        task._healthMessage = `정상 진행 중 (${progress}%)`;
      }
    } else if (agent.status === 'waiting') {
      task._healthStatus = 'waiting';
      task._healthMessage = `대기 중: ${agent.waitingFor || '선행 작업 완료 대기'}`;
    } else if (agent.status === 'completed') {
      task._healthStatus = 'agent_done';
      task._healthMessage = `에이전트 완료 — 태스크 상태 변경 필요`;
    }
  });

  // Track progress changes for stale detection
  Object.values(agents).forEach(a => {
    if (a.status === 'running') {
      if (a._lastProgress !== a.progress) {
        a._lastProgress = a.progress;
        a._lastProgressTime = now;
      }
    }
  });

  // --- Zombie Agent Cleanup ---
  // Running agents with no matching in_progress task and no progress for 10 min → auto-complete
  const AGENT_ZOMBIE_MS = 10 * 60 * 1000;
  Object.entries(agents).forEach(([name, agent]) => {
    if (agent.status !== 'running') return;
    const startedAt = new Date(agent.startedAt || 0).getTime();
    const elapsed = now - startedAt;
    const hasActiveTask = tasks.some(t => t.agent === name && t.status === 'in_progress');

    if (!hasActiveTask && elapsed > AGENT_ZOMBIE_MS && (agent.progress || 0) === 0) {
      agent.status = 'completed';
      agent.progress = 100;
      agent.completedAt = new Date().toISOString();
      agent._zombieCleanup = true;
      broadcast({ type: 'state_update', data: state.getFullState() });
      saveState();
    }
  });

  // --- Team Lead (project-director) auto-management ---
  // Auto-mark tasks done when agent is completed
  tasks.forEach(task => {
    if (task.status !== 'in_progress' || !task.agent) return;
    const agent = agents[task.agent];
    if (agent && agent.status === 'completed') {
      task.status = 'done';
      task.updatedAt = new Date().toISOString();
      state._addHistory(task.id, 'auto_done', `${task.agent} 완료 → 자동 Done`);
      broadcast({ type: 'state_update', data: state.getFullState() });
      saveState();
    }
  });

}, 30000); // Check every 30 seconds

// Pending message queue — retry when Claude session becomes idle
setInterval(() => {
  if (!state._pendingMessages || !state._pendingMessages.length) return;
  const pending = [...state._pendingMessages];
  state._pendingMessages = [];

  pending.forEach(pm => {
    try {
      const sessionTarget = pm.sessionName || pm.windowName;
      const paneContent = execSync(`tmux capture-pane -t "${sessionTarget}" -p -S -3 2>/dev/null`, { encoding: 'utf-8' });
      const isIdle = paneContent.includes('❯') || paneContent.includes('> ') || paneContent.trim().endsWith('>');
      if (isIdle) {
        const instruction = `[Jun.AI 대기 메시지] ${pm.message}. 응답은 curl -s -X POST http://58.29.21.11:7700/api/chat/${pm.projectId} -H 'Content-Type: application/json' -d '{"from":"project-director","message":"응답"}' 으로 보내주세요.`;
        const escaped = instruction.replace(/"/g, '\\"');
        exec(`tmux send-keys -t "${sessionTarget}" "${escaped}" Enter`);

        // Notify user
        const chatFile = path.join(CHAT_DIR, `project-${pm.projectId}.json`);
        let msgs = [];
        try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}
        const deliveredMsg = {
          id: String(Date.now()), from: 'project-director',
          message: `✅ 대기 메시지가 Claude 세션에 전달되었습니다: "${pm.message}"`,
          type: 'text', fileName: null, fileUrl: null, timestamp: new Date().toISOString()
        };
        msgs.push(deliveredMsg);
        fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
        broadcast({ type: 'chat_message', data: { projectId: pm.projectId, message: deliveredMsg } });
      } else {
        // Still busy → re-queue
        state._pendingMessages.push(pm);
      }
    } catch (e) {
      state._pendingMessages.push(pm); // retry next cycle
    }
  });
}, 15000); // Check every 15 seconds

// Save on process exit
process.on('SIGINT', () => { state.save(DATA_FILE); process.exit(0); });
process.on('SIGTERM', () => { state.save(DATA_FILE); process.exit(0); });

// Prevent crash on uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
  state.save(DATA_FILE);
});
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED]', err);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve project output files (for download/view)
// Try multiple paths: sessions dir, project dirs, absolute path
app.get('/files/*', (req, res) => {
  const filePath = decodeURIComponent(req.params[0]);
  const tryPaths = [];

  // Try inside each project dir first
  const projects = state.getProjects();
  projects.forEach(p => {
    if (p.projectDir) {
      tryPaths.push(path.join(p.projectDir, filePath));
    }
  });

  tryPaths.push(
    path.join('/home/issacs/sessions', filePath),
    path.join('/home/issacs/work', filePath),
    filePath.startsWith('/') ? filePath : path.join('/home/issacs', filePath)
  );

  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }

  res.status(404).json({
    error: 'File not found',
    message: `"${filePath}" 파일이 아직 생성되지 않았습니다. 에이전트가 작업을 완료하면 파일이 생성됩니다.`,
    searchedPaths: tryPaths
  });
});

// Clean orphan documents on startup
setTimeout(() => {
  const removed = state.cleanDocuments();
  if (removed > 0) {
    console.log(`  ✓ Cleaned ${removed} orphan documents`);
    state.save(DATA_FILE);
  }
}, 1000);

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

// Scan actual project output files from disk
app.get('/api/projects/:id/outputs', (req, res) => {
  const project = state.getProjects().find(p => p.id === req.params.id);
  if (!project || !project.projectDir) {
    return res.json({ files: [], message: 'projectDir not set' });
  }

  const projectDir = project.projectDir;
  if (!fs.existsSync(projectDir)) {
    return res.json({ files: [], message: 'Directory not found' });
  }

  try {
    // Scan all files (exclude .git, node_modules, __pycache__)
    const output = execSync(
      `find "${projectDir}" -type f \\( -name "*.py" -o -name "*.dart" -o -name "*.js" -o -name "*.ts" -o -name "*.docx" -o -name "*.xlsx" -o -name "*.pptx" -o -name "*.hwpx" -o -name "*.pdf" -o -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.h5" -o -name "*.md" -o -name "*.yaml" -o -name "*.json" \\) ! -path "*/.git/*" ! -path "*/node_modules/*" ! -path "*/__pycache__/*" ! -path "*/.dart_tool/*" ! -path "*/.pub-cache/*" 2>/dev/null | sort`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const files = output.trim().split('\n').filter(Boolean).map(f => {
      const rel = f.replace(projectDir + '/', '');
      const ext = path.extname(f).replace('.', '');
      const stat = fs.statSync(f);
      const category = state._inferCategory(ext, rel);
      return {
        path: rel,
        fullPath: f,
        format: ext,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        category,
        status: 'exists'
      };
    });

    // Group by directory
    const groups = {};
    files.forEach(f => {
      const dir = f.path.split('/').slice(0, -1).join('/') || 'root';
      if (!groups[dir]) groups[dir] = { files: [], totalSize: 0 };
      groups[dir].files.push(f);
      groups[dir].totalSize += f.size;
    });

    // Format stats
    const formatCounts = {};
    files.forEach(f => { formatCounts[f.format] = (formatCounts[f.format] || 0) + 1; });

    res.json({
      projectDir,
      totalFiles: files.length,
      totalSize: files.reduce((s, f) => s + f.size, 0),
      formatCounts,
      groups,
      files
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get documents (with project/category/phase filter, verify file exists)
app.get('/api/documents', (req, res) => {
  let docs = state.getDocuments();

  // Project filter
  if (req.query.project) {
    docs = docs.filter(d => d.project === req.query.project);
  }
  // Category filter
  if (req.query.category) {
    docs = docs.filter(d => d.category === req.query.category);
  }
  // Phase filter
  if (req.query.phase !== undefined) {
    docs = docs.filter(d => d.phase === parseInt(req.query.phase));
  }
  // Verify only — only return docs where file actually exists
  if (req.query.verified === 'true') {
    docs = docs.filter(d => {
      if (!d.file) return false;
      const projects = state.getProjects();
      for (const p of projects) {
        if (p.projectDir && fs.existsSync(path.join(p.projectDir, d.file))) return true;
      }
      return fs.existsSync(path.join('/home/issacs/sessions', d.file));
    });
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

// List backups for recovery
app.get('/api/backups', (req, res) => {
  res.json(state.listBackups(DATA_FILE));
});

// Restore from backup
app.post('/api/restore', (req, res) => {
  const { backupFile } = req.body;
  if (!backupFile) return res.status(400).json({ error: 'backupFile required' });
  const ok = state.restoreFromBackup(DATA_FILE, backupFile);
  if (ok) {
    broadcast({ type: 'state_update', data: state.getFullState() });
    res.json({ ok: true, message: `Restored from ${backupFile}`, projects: state.getProjects().length, tasks: state.tasks.length });
  } else {
    res.status(404).json({ error: 'Backup not found or invalid' });
  }
});

// Get phases
app.get('/api/phases', (req, res) => {
  res.json(state.getPhases());
});

// Helper: save after every mutation
function saveState() { state.save(DATA_FILE); }

// Post event (called by project-director / hooks)
app.post('/api/events', (req, res) => {
  const event = req.body;
  event.timestamp = event.timestamp || new Date().toISOString();
  state.processEvent(event);

  // Auto-record notification for key events
  if (event.type === 'agent_complete') {
    state.addNotification('success', `${event.agent} 완료`, event.task || '');
  } else if (event.type === 'agent_start') {
    state.addNotification('info', `${event.agent} 시작`, event.task || '');
  } else if (event.type === 'phase_complete') {
    state.addNotification('success', `Phase ${event.phase} 완료`, '');
  } else if (event.type === 'document_created') {
    state.addNotification('info', '산출물 생성', event.file || '');
    // Auto-convert .md → .docx
    if (event.file && event.file.endsWith('.md') && event.format === 'md') {
      autoConvertMdToDocx(event.file);
    }
  }

  broadcast({ type: 'event', data: event });
  broadcast({ type: 'state_update', data: state.getFullState() });
  saveState();
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
  saveState();
  res.json(project);
});

// Update project
app.patch('/api/projects/:id', (req, res) => {
  const project = state.updateProject(req.params.id, req.body);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  broadcast({ type: 'state_update', data: state.getFullState() });
  saveState();
  res.json(project);
});

// Create task
app.post('/api/tasks', (req, res) => {
  const task = state.createTask(req.body);
  broadcast({ type: 'task_created', data: task });
  broadcast({ type: 'state_update', data: state.getFullState() });
  saveState();
  res.json(task);
});

// Update task
app.patch('/api/tasks/:id', (req, res) => {
  const oldTask = state.getTask(req.params.id);
  const oldStatus = oldTask ? oldTask.status : null;
  const task = state.updateTask(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  broadcast({ type: 'task_updated', data: task });
  broadcast({ type: 'state_update', data: state.getFullState() });
  saveState();

  // Auto-dispatch: when task moves to in_progress → send to Claude session
  if (req.body.status === 'in_progress' && oldStatus !== 'in_progress' && task.project) {
    const project = state.getProjects().find(p => p.id === task.project);
    if (project && project.sessionName) {
      try {
        // Check session exists
        const allSessions = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
        if (allSessions.trim().split('\n').includes(project.sessionName)) {
          const agentInfo = task.agent ? `담당 에이전트: ${task.agent}` : '에이전트 미배정';
          const objective = task.objective ? `\n목표: ${task.objective}` : '';
          const instruction = `[Jun.AI 태스크 디스패치] "${task.title}" 가 In Progress로 이동되었습니다. ${agentInfo}${objective}\n이 태스크를 즉시 수행하세요. 진행 상황은 curl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_progress","agent":"${task.agent || 'project-director'}","progress":50,"message":"진행내용"}' 으로 보고하세요. 완료 시 agent_complete 이벤트를 보내세요.`;
          const escaped = instruction.replace(/"/g, '\\"');
          exec(`tmux send-keys -t "${project.sessionName}" "${escaped}" Enter`);

          // Also report agent_start event
          state.processEvent({
            type: 'agent_start',
            agent: task.agent || 'project-director',
            phase: task.phase,
            task: task.title,
            timestamp: new Date().toISOString()
          });
          broadcast({ type: 'state_update', data: state.getFullState() });
          saveState();
        }
      } catch (e) { /* ignore tmux errors */ }
    }
  }

  res.json(task);
});

// Project setup — creates project + PDLC phase tasks + initial agents
app.post('/api/projects/setup', (req, res) => {
  const { name, description, domain, phases } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  // 1. Create project
  const project = state.createProject({ name, description: description || '', domain: domain || 'general', status: 'active' });

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

  // 6. Create .claude/CLAUDE.md in project directory (if projectDir exists or can be created)
  const setupProjectDir = project.projectDir || (domain !== 'general' ? path.join('/home/issacs/sessions', 'jun-' + name.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 30)) : null);
  if (setupProjectDir) {
    try {
      const claudeDir = path.join(setupProjectDir, '.claude');
      if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });

      const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
      if (!fs.existsSync(claudeMdPath)) {
        const claudeMdContent = `# ${name}\n\n## HARD GATE: Dashboard-First Rule\n**모든 작업은 Jun.AI Dashboard(http://58.29.21.11:7700)에 먼저 보고한 후 실행한다.**\nProject ID: ${project.id}\nAPI Docs: http://58.29.21.11:7701\n\n### 작업 순서\n1. agent_start 보고 → 2. 작업 수행 → 3. progress 보고 → 4. agent_complete 보고 → 5. document_created 보고\n\n### API\n\`\`\`bash\ncurl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{\"type\":\"agent_start\",\"agent\":\"에이전트명\",\"task\":\"작업내용\"}'\ncurl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{\"type\":\"agent_progress\",\"agent\":\"에이전트명\",\"progress\":50,\"message\":\"진행내용\"}'\ncurl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{\"type\":\"agent_complete\",\"agent\":\"에이전트명\",\"task\":\"작업내용\"}'\ncurl -s -X POST http://58.29.21.11:7700/api/chat/${project.id} -H 'Content-Type: application/json' -d '{\"from\":\"에이전트명\",\"message\":\"응답\"}'\n\`\`\`\n`;
        fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8');
      }
      project.projectDir = setupProjectDir;
      state.updateProject(project.id, { projectDir: setupProjectDir });
    } catch (e) { /* ignore dir creation errors */ }
  }

  // 7. Save + Broadcast
  saveState();
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
  // Force backup before deletion
  saveState();
  state.deleteProject(req.params.id);
  broadcast({ type: 'state_update', data: state.getFullState() });
  saveState();
  res.json({ ok: true, deleted: project.name, message: '삭제됨. 복구: GET /api/backups → POST /api/restore' });
});

// --- Approval System (결재) ---

// Request approval for a task
app.post('/api/tasks/:id/approval', (req, res) => {
  const task = state.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { summary, deliverables } = req.body;

  task.approval = {
    status: 'pending', // pending | approved | rejected
    summary: summary || '',
    deliverables: deliverables || [],
    requestedAt: new Date().toISOString(),
    respondedAt: null,
    rejectReason: null
  };
  task.updatedAt = new Date().toISOString();
  state._addHistory(task.id, 'approval_requested', `결재 요청: ${summary || task.title}`);
  saveState();

  broadcast({ type: 'approval_request', data: { taskId: task.id, task } });
  broadcast({ type: 'state_update', data: state.getFullState() });

  // Send telegram notification with approve/reject buttons
  try {
    const TELEGRAM_USERS_FILE = path.join(__dirname, 'data', 'telegram-users.json');
    const botToken = (() => { try { const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8'); const m = env.match(/TELEGRAM_BOT_TOKEN=(.+)/); return m ? m[1].trim() : null; } catch(e) { return null; } })();
    if (botToken && fs.existsSync(TELEGRAM_USERS_FILE)) {
      const tgUsers = JSON.parse(fs.readFileSync(TELEGRAM_USERS_FILE, 'utf-8'));
      const project = state.getProjects().find(p => p.id === task.project);
      const projectName = project ? project.name : 'Unknown';
      const delivList = (deliverables || []).map(d => `  - ${d}`).join('\n') || '  (없음)';
      const tgMessage = `📋 [결재요청] ${projectName}\n\n${task.title}\n\n${summary || ''}\n\n산출물:\n${delivList}`;
      const keyboard = JSON.stringify({
        inline_keyboard: [
          [
            { text: '✅ 승인', callback_data: `approve_${task.id}` },
            { text: '❌ 반려', callback_data: `reject_${task.id}` }
          ]
        ]
      });

      Object.keys(tgUsers).forEach(chatId => {
        const https = require('https');
        const payload = JSON.stringify({ chat_id: chatId, text: tgMessage, reply_markup: JSON.parse(keyboard) });
        const tgReq = https.request({
          hostname: 'api.telegram.org',
          path: `/bot${botToken}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        });
        tgReq.write(payload);
        tgReq.end();
      });
    }
  } catch (e) { /* ignore telegram errors */ }

  res.json({ ok: true, approval: task.approval });
});

// Approve a task
app.post('/api/tasks/:id/approve', (req, res) => {
  const task = state.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.approval = task.approval || {};
  task.approval.status = 'approved';
  task.approval.respondedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  state._addHistory(task.id, 'approval_approved', '결재 승인됨');
  saveState();

  broadcast({ type: 'approval_response', data: { taskId: task.id, status: 'approved' } });
  broadcast({ type: 'state_update', data: state.getFullState() });

  // Notify Claude session to proceed
  const project = state.getProjects().find(p => p.id === task.project);
  if (project && project.sessionName) {
    const instruction = `[Jun.AI 결재] "${task.title}" 이 승인되었습니다. 다음 Phase로 진행하세요.`;
    exec(`tmux send-keys -t "${project.sessionName}" "${instruction.replace(/"/g, '\\"')}" Enter`);
  }

  // Notify via chat
  if (task.project) {
    const chatFile = path.join(__dirname, 'data', 'chat', `project-${task.project}.json`);
    let msgs = [];
    try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}
    msgs.push({ id: String(Date.now()), from: 'system', message: `✅ "${task.title}" 결재 승인됨. 다음 단계로 진행합니다.`, type: 'text', fileName: null, fileUrl: null, timestamp: new Date().toISOString() });
    fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
    broadcast({ type: 'chat_message', data: { projectId: task.project, message: msgs[msgs.length - 1], notify: true } });
  }

  res.json({ ok: true, status: 'approved' });
});

// Reject a task
app.post('/api/tasks/:id/reject', (req, res) => {
  const task = state.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { reason } = req.body;

  task.approval = task.approval || {};
  task.approval.status = 'rejected';
  task.approval.rejectReason = reason || '사유 미기재';
  task.approval.respondedAt = new Date().toISOString();
  task.status = 'in_progress'; // back to in_progress for rework
  task.updatedAt = new Date().toISOString();
  state._addHistory(task.id, 'approval_rejected', `결재 반려: ${reason || '사유 미기재'}`);
  saveState();

  broadcast({ type: 'approval_response', data: { taskId: task.id, status: 'rejected', reason } });
  broadcast({ type: 'state_update', data: state.getFullState() });

  // Notify Claude session to rework
  const project = state.getProjects().find(p => p.id === task.project);
  if (project && project.sessionName) {
    const instruction = `[Jun.AI 결재반려] "${task.title}" 이 반려되었습니다. 반려 사유: ${reason || '사유 미기재'}. 사유를 반영하여 재작업하고 다시 결재를 요청하세요.`;
    exec(`tmux send-keys -t "${project.sessionName}" "${instruction.replace(/"/g, '\\"')}" Enter`);
  }

  // Notify via chat
  if (task.project) {
    const chatFile = path.join(__dirname, 'data', 'chat', `project-${task.project}.json`);
    let msgs = [];
    try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}
    msgs.push({ id: String(Date.now()), from: 'system', message: `❌ "${task.title}" 결재 반려됨.\n사유: ${reason || '사유 미기재'}\n재작업을 시작합니다.`, type: 'text', fileName: null, fileUrl: null, timestamp: new Date().toISOString() });
    fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
    broadcast({ type: 'chat_message', data: { projectId: task.project, message: msgs[msgs.length - 1], notify: true } });
  }

  res.json({ ok: true, status: 'rejected' });
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

  // If from user → forward to Claude independent tmux session with response instructions
  if ((from || 'user') === 'user') {
    const task = state.getTask(req.params.id);
    if (task) {
      try {
        const project = state.getProjects().find(p => p.id === task.project);
        if (project && project.sessionName) {
          // Check session exists
          let sessionExists = false;
          try {
            const allSessions = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
            sessionExists = allSessions.trim().split('\n').includes(project.sessionName);
          } catch (e) {}

          if (sessionExists) {
            const escaped = message.replace(/"/g, '\\"').replace(/'/g, "'");
            const taskId = req.params.id;
            const instruction = `[Jun.AI 사용자 메시지] 태스크 "${task.title}"에 대한 질문: ${escaped}\n반드시 아래 명령으로 응답하세요:\ncurl -s -X POST http://58.29.21.11:7700/api/tasks/${taskId}/comments -H 'Content-Type: application/json' -d '{"from":"${task.agent || 'project-director'}","message":"여기에 응답 작성"}'`;
            exec(`tmux send-keys -t "${project.sessionName}" "${instruction.replace(/"/g, '\\"')}" Enter`);
          }
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

// --- Auto Response Generator ---
function generateAutoResponse(message, projectId) {
  const msg = (message || '').toLowerCase();
  const project = state.getProjects().find(p => p.id === projectId);
  const projectName = project ? project.name : '';
  const tasks = state.tasks.filter(t => t.project === projectId);
  const agents = state.agents || {};
  const docs = state.getDocuments().filter(d => d.project === projectId);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const rate = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
  const runningAgents = Object.values(agents).filter(a => a.status === 'running');

  // Status queries
  if (msg.includes('상태') || msg.includes('status') || msg.includes('현황') || msg.includes('보고') || msg.includes('상황') || msg.includes('진행') || msg.includes('어때') || msg.includes('알려')) {
    let res = `📊 ${projectName} 현황:\n\n`;
    res += `태스크: ${doneTasks}/${totalTasks} 완료 (${rate}%)\n`;
    if (activeTasks.length > 0) {
      res += `\n진행 중:\n`;
      activeTasks.forEach(t => { res += `  🔄 ${t.title} (${t.agent || '미배정'})\n`; });
    }
    if (runningAgents.length > 0) {
      res += `\n활동 에이전트:\n`;
      runningAgents.forEach(a => { res += `  🔄 ${a.name}: ${a.progress||0}% ${a.task||''}\n`; });
    }
    if (docs.length > 0) {
      res += `\n산출물: ${docs.length}개\n`;
    }
    return res;
  }

  // Greeting
  if (msg.includes('안녕') || msg.includes('hello') || msg.includes('hi')) {
    return `안녕하세요! ${projectName} 프로젝트 팀장입니다.\n\n현재 진행률: ${rate}% (${doneTasks}/${totalTasks})\n활동 에이전트: ${runningAgents.length}개\n\n무엇을 도와드릴까요?`;
  }

  // Agent queries
  if (msg.includes('에이전트') || msg.includes('agent') || msg.includes('누가')) {
    const allAgents = Object.values(agents);
    if (allAgents.length === 0) return '현재 활동 중인 에이전트가 없습니다.';
    let res = '🤖 에이전트 현황:\n\n';
    allAgents.forEach(a => {
      const icon = a.status === 'running' ? '🔄' : a.status === 'completed' ? '✅' : '⏳';
      res += `${icon} ${a.name}: ${a.status} ${a.progress||0}%\n`;
    });
    return res;
  }

  // Task queries
  if (msg.includes('할일') || msg.includes('todo') || msg.includes('남은') || msg.includes('뭐 해')) {
    const todoTasks = tasks.filter(t => t.status === 'todo');
    if (todoTasks.length === 0) return '모든 태스크가 완료되었습니다! 🎉';
    let res = `📋 남은 작업 (${todoTasks.length}개):\n\n`;
    todoTasks.slice(0, 10).forEach(t => { res += `  ⬜ ${t.title}\n`; });
    if (todoTasks.length > 10) res += `  ... +${todoTasks.length - 10}개 더\n`;
    return res;
  }

  // Output queries
  if (msg.includes('산출물') || msg.includes('output') || msg.includes('문서') || msg.includes('파일')) {
    if (docs.length === 0) return '아직 생성된 산출물이 없습니다.';
    let res = `📁 산출물 (${docs.length}개):\n\n`;
    docs.slice(-10).forEach(d => { res += `  📄 ${d.file}\n`; });
    return res;
  }

  // Connection/session queries
  if (msg.includes('연결') || msg.includes('connect') || msg.includes('세션') || msg.includes('session')) {
    try {
      const allSessions = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
      const claudeSessions = allSessions.trim().split('\n').filter(s => s.startsWith('jun-'));
      let res = `🔗 연결 상태:\n\n`;
      res += `Dashboard: ● Running (http://58.29.21.11:7700)\n`;
      res += `Telegram: ● ${require('child_process').execSync('pgrep -f telegram-bridge > /dev/null 2>&1 && echo Connected || echo Disconnected', {encoding:'utf-8'}).trim()}\n`;
      res += `Claude 세션: ${claudeSessions.length}개\n`;
      claudeSessions.forEach(name => {
        res += `  ● ${name}\n`;
      });
      return res;
    } catch(e) {
      return '🔗 연결 상태 확인 실패';
    }
  }

  // Help
  if (msg.includes('도움') || msg.includes('help') || msg.includes('뭐 할 수')) {
    return `사용 가능한 질문:\n\n• "상태" / "현황" — 프로젝트 진행 상황\n• "에이전트" — 활동 에이전트 현황\n• "할일" / "남은 작업" — 미완료 태스크\n• "산출물" — 생성된 파일 목록\n• 기타 요청 — Claude 세션에 전달됨`;
  }

  // Default: no auto-response (will be forwarded to Claude session)
  return null;
}

// --- Session Management (tmux + claude) ---

// List active Claude tmux sessions (independent sessions with jun- prefix)
app.get('/api/sessions', (req, res) => {
  try {
    const out = execSync('tmux list-sessions -F "#{session_name}|#{session_created}|#{pane_current_command}|#{pane_current_path}" 2>/dev/null', { encoding: 'utf-8' });
    const sessions = out.trim().split('\n').filter(Boolean)
      .map(line => {
        const [name, created, command, cwd] = line.split('|');
        return { name, created: parseInt(created), command, cwd, isClaudeSession: name.startsWith('jun-') };
      })
      .filter(s => s.isClaudeSession);
    res.json(sessions);
  } catch (e) {
    res.json([]);
  }
});

// Start new Claude Code session in tmux with project directory
const SESSIONS_ROOT = '/home/issacs/sessions';

app.post('/api/sessions/start', (req, res) => {
  const { projectName, projectPath, projectId, domain } = req.body;
  if (!projectName) return res.status(400).json({ error: 'projectName required' });

  const cleanName = projectName.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 30);
  const sessionName = 'jun-' + cleanName;
  const projectDir = projectPath || path.join(SESSIONS_ROOT, cleanName);

  try {
    // Check if independent tmux session already exists
    try {
      const existing = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
      if (existing.trim().split('\n').includes(sessionName)) {
        return res.json({ ok: true, action: 'focused', session: sessionName, projectDir, message: `기존 세션 "${sessionName}" 이 실행 중입니다` });
      }
    } catch (e) { /* no existing */ }

    // 1. Create project directory structure
    const outputDirs = [
      'phase-00-research', 'phase-01-voc', 'phase-02-market',
      'phase-03-planning', 'phase-04-requirements', 'phase-05-architecture',
      'phase-06-design', 'phase-07-detailed-design', 'phase-08-implementation',
      'phase-09-testing/screenshots', 'phase-10-verification', 'phase-11-evaluation',
      'certification', 'media/screenshots', 'media/figures', 'media/diagrams'
    ];
    outputDirs.forEach(d => {
      const dir = path.join(projectDir, 'output', d);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    if (!fs.existsSync(path.join(projectDir, 'src'))) {
      fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    }

    // 2. Create .claude/CLAUDE.md with dashboard protocol
    const claudeDir = path.join(projectDir, '.claude');
    if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });

    // Load director protocol template and substitute variables
    const templatePath = path.join(__dirname, 'templates', 'director-claude-md.md');
    let claudeMd = fs.readFileSync(templatePath, 'utf-8');
    claudeMd = claudeMd
      .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
      .replace(/\{\{PROJECT_ID\}\}/g, projectId || 'N/A')
      .replace(/\{\{DOMAIN\}\}/g, domain || 'general')
      .replace(/\{\{SESSION_NAME\}\}/g, sessionName);
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), claudeMd, 'utf-8');

    // 3. Create README.md
    const readme = `# ${projectName}\n\nCreated by Jun.AI Dashboard\nDomain: ${domain || 'general'}\nDate: ${new Date().toISOString()}\n`;
    const readmePath = path.join(projectDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, readme, 'utf-8');
    }

    // 4. Initialize git
    try {
      if (!fs.existsSync(path.join(projectDir, '.git'))) {
        execSync(`cd ${projectDir} && git init && git add -A && git commit -m "init: ${projectName} project setup by Jun.AI" 2>/dev/null`, { encoding: 'utf-8' });
      }
    } catch (e) { /* ignore */ }

    // 5. Create independent tmux session (first creation: no --resume)
    const claudeCmd = 'claude --dangerously-skip-permissions';
    exec(`tmux new-session -d -s "${sessionName}" -c "${projectDir}" "${claudeCmd}" 2>/dev/null`);

    // 6. Update project record with directory path
    if (projectId) {
      state.updateProject(projectId, { projectDir, sessionName });
    }

    // 7. Save state
    state.save(DATA_FILE);

    res.json({
      ok: true,
      action: 'created',
      session: sessionName,
      projectDir,
      structure: {
        root: projectDir,
        output: path.join(projectDir, 'output'),
        src: path.join(projectDir, 'src'),
        claude: path.join(projectDir, '.claude')
      },
      message: `프로젝트 "${projectName}" 독립 세션 생성됨 — tmux: ${sessionName}, dir: ${projectDir}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get project directory listing
app.get('/api/sessions/:name/files', (req, res) => {
  const projectDir = path.join(SESSIONS_ROOT, req.params.name);
  try {
    const files = execSync(`find ${projectDir}/output -type f 2>/dev/null | sort`, { encoding: 'utf-8' });
    const list = files.trim().split('\n').filter(Boolean).map(f => {
      const rel = f.replace(projectDir + '/', '');
      const ext = path.extname(f).replace('.', '');
      return { path: rel, fullPath: f, format: ext };
    });
    res.json({ projectDir, files: list, count: list.length });
  } catch (e) {
    res.json({ projectDir, files: [], count: 0 });
  }
});

// Stop/close an independent tmux session
app.post('/api/sessions/stop', (req, res) => {
  const { sessionName } = req.body;
  if (!sessionName) return res.status(400).json({ error: 'sessionName required' });
  try {
    execSync(`tmux kill-session -t "${sessionName}" 2>/dev/null`);
    res.json({ ok: true, message: `세션 "${sessionName}" 종료됨` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send message to an independent claude session
app.post('/api/sessions/send', (req, res) => {
  const { sessionName, message } = req.body;
  if (!sessionName || !message) return res.status(400).json({ error: 'sessionName and message required' });
  try {
    const escaped = message.replace(/"/g, '\\"');
    execSync(`tmux send-keys -t "${sessionName}" "${escaped}" Enter 2>/dev/null`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get live terminal output from an independent tmux session
app.get('/api/sessions/:name/output', (req, res) => {
  try {
    const output = execSync(
      `tmux capture-pane -t "${req.params.name}" -p -S -50 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    res.json({ session: req.params.name, output, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(404).json({ error: 'Session not found or no output' });
  }
});

// --- Project Chat (팀장 소통) ---
const CHAT_DIR = path.join(__dirname, 'data', 'chat');

// Get chat history for a project
app.get('/api/chat/:projectId', (req, res) => {
  const chatFile = path.join(CHAT_DIR, `project-${req.params.projectId}.json`);
  try {
    if (fs.existsSync(chatFile)) {
      const messages = JSON.parse(fs.readFileSync(chatFile, 'utf-8'));
      res.json(messages);
    } else {
      res.json([]);
    }
  } catch (e) { res.json([]); }
});

// --- Telegram Token Management ---
const TELEGRAM_TOKEN_FILE = path.join(__dirname, 'data', 'telegram-tokens.json');

// Known locations where telegram tokens may exist
const KNOWN_TOKEN_PATHS = [
  { path: path.join(__dirname, '.env'), label: 'Dashboard .env (@JunDash_bot)' },
  { path: '/home/issacs/.claude/channels/telegram/.env', label: 'Claude Telegram Plugin' },
  { path: '/home/issacs/work/claude-dev-forge/dashboard/.env', label: 'Legacy Dashboard .env' },
];

function loadTelegramTokens() {
  try {
    if (fs.existsSync(TELEGRAM_TOKEN_FILE)) return JSON.parse(fs.readFileSync(TELEGRAM_TOKEN_FILE, 'utf-8'));
  } catch (e) {}
  return {};
}

function saveTelegramTokens(tokens) {
  fs.writeFileSync(TELEGRAM_TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

// Save telegram bot token for a project
app.post('/api/telegram/token', (req, res) => {
  const { projectId, token } = req.body;
  if (!projectId || !token) return res.status(400).json({ error: 'projectId and token required' });
  const tokens = loadTelegramTokens();
  tokens[projectId] = { token, updatedAt: new Date().toISOString() };
  saveTelegramTokens(tokens);
  // Update project record
  state.updateProject(projectId, { telegramToken: token });
  saveState();
  res.json({ ok: true, message: `프로젝트 ${projectId}에 텔레그램 토큰 저장됨` });
});

// Get telegram token for a project
app.get('/api/telegram/token/:projectId', (req, res) => {
  const tokens = loadTelegramTokens();
  const entry = tokens[req.params.projectId];
  if (!entry) return res.status(404).json({ error: 'Token not found' });
  res.json({ projectId: req.params.projectId, hasToken: true, updatedAt: entry.updatedAt });
});

// List all telegram tokens
app.get('/api/telegram/tokens', (req, res) => {
  const tokens = loadTelegramTokens();
  const result = Object.entries(tokens).map(([pid, entry]) => ({
    projectId: pid, hasToken: true, updatedAt: entry.updatedAt
  }));
  res.json(result);
});

// Detect existing telegram tokens from known locations
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
          found.push({ label, source: envPath, token, masked });
        }
      }
    } catch (e) {}
  });
  // Also include already-registered project tokens
  const registered = loadTelegramTokens();
  Object.entries(registered).forEach(([pid, entry]) => {
    const project = state.getProjects().find(p => p.id === pid);
    const pName = project ? project.name : `Project ${pid}`;
    const masked = entry.token.substring(0, 10) + '...' + entry.token.substring(entry.token.length - 4);
    if (!found.some(f => f.token === entry.token)) {
      found.push({ label: `${pName} (등록됨)`, source: 'registered', token: entry.token, masked });
    }
  });
  res.json(found);
});

// Delete telegram token
app.delete('/api/telegram/token/:projectId', (req, res) => {
  const tokens = loadTelegramTokens();
  delete tokens[req.params.projectId];
  saveTelegramTokens(tokens);
  state.updateProject(req.params.projectId, { telegramToken: null });
  saveState();
  res.json({ ok: true });
});

// --- Auto md→docx on document_created event ---
const MD2DOCX_SCRIPT = path.join(__dirname, 'scripts', 'md2docx.py');

function autoConvertMdToDocx(filePath) {
  if (!filePath || !filePath.endsWith('.md')) return;
  // Resolve full path
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join('/home/issacs/sessions', filePath);
  if (!fs.existsSync(fullPath)) return;
  const docxPath = fullPath.replace(/\.md$/, '.docx');
  exec(`python3 "${MD2DOCX_SCRIPT}" "${fullPath}" "${docxPath}"`, (err, stdout) => {
    if (!err && fs.existsSync(docxPath)) {
      const relPath = filePath.replace(/\.md$/, '.docx');
      state.processEvent({
        type: 'document_created',
        file: relPath,
        format: 'docx',
        phase: null,
        timestamp: new Date().toISOString()
      });
      broadcast({ type: 'state_update', data: state.getFullState() });
      saveState();
    }
  });
}

// Send chat message
app.post('/api/chat/:projectId', (req, res) => {
  const { from, message, type, fileName, fileUrl } = req.body;
  if (!message && !fileUrl) return res.status(400).json({ error: 'message or file required' });

  const chatFile = path.join(CHAT_DIR, `project-${req.params.projectId}.json`);
  let messages = [];
  try { if (fs.existsSync(chatFile)) messages = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}

  const msg = {
    id: String(Date.now()),
    from: from || 'user',
    message: message || '',
    type: type || 'text', // text | image | file
    fileName: fileName || null,
    fileUrl: fileUrl || null,
    timestamp: new Date().toISOString()
  };
  messages.push(msg);

  // Keep last 500 messages per project
  if (messages.length > 500) messages = messages.slice(-500);
  fs.writeFileSync(chatFile, JSON.stringify(messages, null, 2), 'utf-8');

  // Broadcast to dashboard (with notification flag for UI sound/blink)
  broadcast({ type: 'chat_message', data: { projectId: req.params.projectId, message: msg, notify: (from || 'user') !== 'user' } });

  // If agent responds → forward to Telegram user
  if ((from || 'user') !== 'user') {
    try {
      const TELEGRAM_USERS_FILE = path.join(__dirname, 'data', 'telegram-users.json');
      if (fs.existsSync(TELEGRAM_USERS_FILE)) {
        const tgUsers = JSON.parse(fs.readFileSync(TELEGRAM_USERS_FILE, 'utf-8'));
        const botToken = process.env.TELEGRAM_BOT_TOKEN || (() => {
          try { const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8'); const m = env.match(/TELEGRAM_BOT_TOKEN=(.+)/); return m ? m[1].trim() : null; } catch(e) { return null; }
        })();
        if (botToken) {
          const project = state.getProjects().find(p => p.id === req.params.projectId);
          const projectName = project ? project.name : 'Unknown';
          const tgMessage = `💬 [${projectName}] ${from}:\n${message}`;
          // Send to all users who have this project active, or all users
          Object.entries(tgUsers).forEach(([chatId, user]) => {
            const https = require('https');
            const payload = JSON.stringify({ chat_id: chatId, text: tgMessage });
            const tgReq = https.request({
              hostname: 'api.telegram.org',
              path: `/bot${botToken}/sendMessage`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            });
            tgReq.write(payload);
            tgReq.end();
          });
        }
      }
    } catch (e) { /* ignore telegram errors */ }
  }

  // Forward to Claude session (always — no auto-response interception)
  if ((from || 'user') === 'user') {
    const projectId = req.params.projectId;

    // Skip forwarding images/files to Claude session — only text messages
    if (type === 'image' || type === 'file') {
      // Images/files are stored in chat only, not forwarded to Claude
    } else {
      const project = state.getProjects().find(p => p.id === projectId);
      if (project) {
        try {
          const sessionName = project.sessionName || 'jun-' + project.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 30);

          // Check if independent session exists
          let sessionExists = false;
          try {
            const allSessions = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
            sessionExists = allSessions.trim().split('\n').includes(sessionName);
          } catch (e) {}

          if (sessionExists) {
            // Build instruction
            let instruction = '';
            if (type === 'image' && fileUrl) {
              instruction = `[Jun.AI 채팅] 사용자가 이미지를 보냈습니다: http://58.29.21.11:7700${fileUrl}`;
              if (message) instruction += ` 메시지: ${message}`;
            } else if (type === 'file' && fileUrl) {
              instruction = `[Jun.AI 채팅] 사용자가 파일을 보냈습니다: ${fileName || 'file'} (http://58.29.21.11:7700${fileUrl})`;
              if (message) instruction += ` 메시지: ${message}`;
            } else {
              instruction = `[Jun.AI 채팅] ${message}. 응답은 반드시 curl -s -X POST http://58.29.21.11:7700/api/chat/${projectId} -H 'Content-Type: application/json' -d '{"from":"project-director","message":"응답내용"}' 으로 보내주세요.`;
            }

            // Queue message for sequential delivery (prevents overlapping send-keys)
            if (!state._sendQueue) state._sendQueue = {};
            if (!state._sendQueue[sessionName]) state._sendQueue[sessionName] = [];
            state._sendQueue[sessionName].push(instruction);

            // Process queue: only send if not already processing
            if (state._sendQueue[sessionName].length === 1) {
              (function processQueue() {
                const queue = state._sendQueue[sessionName];
                if (!queue || !queue.length) return;
                const msg = queue[0];
                const escaped = msg.replace(/"/g, '\\"');

                // Wait for idle, then send
                const trySend = () => {
                  try {
                    const pane = execSync(`tmux capture-pane -t "${sessionName}" -p -S -3 2>/dev/null`, { encoding: 'utf-8' });
                    const isIdle = pane.includes('❯') || pane.includes('> ') || pane.trim().endsWith('>');
                    if (isIdle) {
                      exec(`tmux send-keys -t "${sessionName}" "${escaped}" Enter`);
                      queue.shift();
                      if (queue.length > 0) setTimeout(processQueue, 3000); // next message after 3s
                      return;
                    }
                  } catch(e) {}
                  // Not idle → retry in 2s
                  setTimeout(trySend, 2000);
                };
                trySend();
              })();
            }

            // Check if currently idle for immediate feedback
            let isIdle = false;
            try {
              const paneContent = execSync(`tmux capture-pane -t "${sessionName}" -p -S -3 2>/dev/null`, { encoding: 'utf-8' });
              isIdle = paneContent.includes('❯') || paneContent.includes('> ') || paneContent.trim().endsWith('>');
            } catch (e) { isIdle = true; }

            if (isIdle) {
              // Will be sent by queue processor
            } else {
              // Session is busy → queue message and notify user
              setTimeout(() => {
                const chatFile = path.join(CHAT_DIR, `project-${projectId}.json`);
                let msgs = [];
                try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}
                const busyMsg = {
                  id: String(Date.now()),
                  from: 'project-director',
                  message: `⏳ Claude 세션이 현재 다른 작업 중입니다. 메시지가 대기열에 추가되었습니다.\n작업 완료 후 자동으로 전달됩니다.\n\n대기 메시지: "${message}"`,
                  type: 'text', fileName: null, fileUrl: null,
                  timestamp: new Date().toISOString()
                };
                msgs.push(busyMsg);
                if (msgs.length > 500) msgs = msgs.slice(-500);
                fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
                broadcast({ type: 'chat_message', data: { projectId, message: busyMsg } });

                // Store in pending queue for later delivery
                if (!state._pendingMessages) state._pendingMessages = [];
                state._pendingMessages.push({ projectId, sessionName, message: message, type, fileUrl, fileName, timestamp: new Date().toISOString() });
              }, 2000);
            }
          } else {
            // No session found
            setTimeout(() => {
              const chatFile = path.join(CHAT_DIR, `project-${projectId}.json`);
              let msgs = [];
              try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch(e) {}
              const noSessionMsg = {
                id: String(Date.now()),
                from: 'project-director',
                message: `❌ Claude 세션이 없습니다. 대시보드에서 세션을 시작하거나, 자동 응답 키워드(상태, 에이전트, 할일, 산출물, 도움)를 사용해주세요.`,
                type: 'text', fileName: null, fileUrl: null,
                timestamp: new Date().toISOString()
              };
              msgs.push(noSessionMsg);
              fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
              broadcast({ type: 'chat_message', data: { projectId, message: noSessionMsg } });
            }, 2000);
          }
        } catch (e) { /* ignore */ }
      }
    }
  }

  res.json(msg);
});

// Upload file (for chat attachments)
app.post('/api/upload', (req, res) => {
  const { data, fileName, type } = req.body; // base64 data
  if (!data) return res.status(400).json({ error: 'data required' });

  const ext = fileName ? path.extname(fileName) : (type === 'image' ? '.png' : '.bin');
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

// --- Notifications ---
app.get('/api/notifications', (req, res) => {
  const unread = req.query.unread === 'true';
  res.json(state.getNotifications(unread));
});

app.post('/api/notifications/read', (req, res) => {
  if (req.body.id) {
    state.markNotificationRead(req.body.id);
  } else {
    state.markAllNotificationsRead();
  }
  saveState();
  res.json({ ok: true });
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

  // --- Auto-start & watchdog for telegram-bridge ---
  const BRIDGE_SCRIPT = path.join(__dirname, 'telegram-bridge.js');
  const BRIDGE_LOG = '/home/issacs/.jun-ai/logs/telegram.log';

  function startBridge() {
    try {
      // Check if already running
      try {
        const pids = execSync('pgrep -f "node.*telegram-bridge" 2>/dev/null', { encoding: 'utf-8' }).trim();
        if (pids) return; // Already running
      } catch (e) { /* not running */ }

      // Ensure log dir exists
      try { fs.mkdirSync(path.dirname(BRIDGE_LOG), { recursive: true }); } catch(e) {}

      const bridge = exec(`nohup node --unhandled-rejections=warn "${BRIDGE_SCRIPT}" >> "${BRIDGE_LOG}" 2>&1 &`);
      console.log('  ✓ Telegram bridge started');
    } catch (e) {
      console.error('  ✗ Failed to start telegram bridge:', e.message);
    }
  }

  // Start bridge on server boot
  startBridge();

  // Watchdog: check every 30s, restart if dead
  setInterval(() => {
    try {
      execSync('pgrep -f "node.*telegram-bridge" > /dev/null 2>&1');
    } catch (e) {
      console.log(`  [${new Date().toISOString()}] Telegram bridge died — restarting...`);
      startBridge();
    }
  }, 30000);
});
