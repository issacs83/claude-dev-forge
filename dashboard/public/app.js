// Jun.AI — Dashboard Client
let ws = null;
let state = { tasks: [], agents: {}, phases: [], documents: [], stats: {}, phaseProgress: 0 };
let activeRoleFilter = 'all';
let activeProjectFilter = 'all';

// --- WebSocket ---
function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    document.getElementById('liveBadge').className = 'live-badge';
    document.getElementById('liveBadge').textContent = '● Live';
  };

  ws.onclose = () => {
    document.getElementById('liveBadge').className = 'live-badge disconnected';
    document.getElementById('liveBadge').textContent = '● Offline';
    setTimeout(connect, 3000);
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'state_update') {
      state = msg.data;
      render();
    } else if (msg.type === 'agent_confirm') {
      showConfirmNotification(msg.data);
    } else if (msg.type === 'event' && msg.data && msg.data.type === 'agent_complete') {
      showAgentCompleteNotification(msg.data);
    }
  };
}

// --- Render ---
function render() {
  renderStats();
  renderPhases();
  renderProjects();
  renderKanban();
  renderSessions();
  renderAgents();
  renderDocuments();
}

function renderProjects() {
  const projects = state.projects || [];
  const filterSelect = document.getElementById('projectFilter');
  const taskProjectSelect = document.getElementById('newTaskProject');
  const currentVal = filterSelect.value;

  // Update filter dropdown
  filterSelect.innerHTML = '<option value="all">All Projects</option>' +
    projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  filterSelect.value = currentVal;

  // Update task modal project dropdown
  if (taskProjectSelect) {
    taskProjectSelect.innerHTML = '<option value="">No Project</option>' +
      projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }

  // Show/hide delete button based on selection
  let delBtn = document.getElementById('deleteProjectBtn');
  if (!delBtn) {
    delBtn = document.createElement('button');
    delBtn.id = 'deleteProjectBtn';
    delBtn.style.cssText = 'font-size:12px;padding:5px 8px;margin-left:4px;background:rgba(239,68,68,0.15);color:var(--accent-red);border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;display:none';
    delBtn.textContent = '🗑';
    filterSelect.parentElement.appendChild(delBtn);
  }
  if (activeProjectFilter !== 'all') {
    delBtn.style.display = 'inline';
    delBtn.onclick = () => deleteProjectConfirm(activeProjectFilter);
  } else {
    delBtn.style.display = 'none';
  }
}

function renderStats() {
  const s = state.stats || {};
  document.getElementById('statTotal').textContent = s.total || 0;
  document.getElementById('statActive').textContent = s.active || 0;
  document.getElementById('statDone').textContent = s.done || 0;
  document.getElementById('statRate').textContent = (s.rate || 0) + '%';
}

function renderPhases() {
  const track = document.getElementById('phaseTrack');
  const phaseNames = [
    'P0:Research', 'P1:VOC', 'P2:Market', 'P3:Plan',
    'P4:Detail', 'P5:Arch', 'P6:Design', 'P7:Detail',
    'P8:Impl', 'P9:Test', 'P10:Verify', 'P11:Eval'
  ];
  const phases = state.phases || [];
  track.innerHTML = phases.map((p, i) =>
    `<div class="phase-block ${p.status}" data-name="${phaseNames[i] || p.name}" style="cursor:pointer" onclick="openPhaseDetail(${i})">
      ${i}
    </div>`
  ).join('');
  document.getElementById('phasePercent').textContent = (state.phaseProgress || 0) + '%';
}

function renderKanban() {
  const cols = {
    todo: [], hold: [], claimed: [], in_progress: [], review: [], done: []
  };

  const tasks = (state.tasks || []).filter(t => {
    if (activeRoleFilter !== 'all' && t.role !== activeRoleFilter) return false;
    if (activeProjectFilter !== 'all' && t.project !== activeProjectFilter) return false;
    return true;
  });

  tasks.forEach(t => {
    const status = t.status || 'todo';
    if (cols[status]) cols[status].push(t);
  });

  Object.keys(cols).forEach(status => {
    const container = document.getElementById('col' + capitalize(status));
    if (!container) return;
    container.innerHTML = cols[status].length
      ? cols[status].map(renderCard).join('')
      : '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px">No tasks</div>';

    // Update counts
    const countId = 'count' + capitalize(status);
    const el = document.getElementById(countId);
    if (el) el.textContent = cols[status].length;
  });
}

function renderCard(task) {
  const priorityClass = 'priority-' + (task.priority || 'medium');
  const roleClass = 'role-' + (task.role || 'dev');
  const timeAgo = getTimeAgo(task.updatedAt);
  const assignee = task.assignee || task.agent || '';
  const progress = task.progress || 0;
  const isWorking = task.status === 'in_progress';

  // Calculate elapsed and estimated remaining time
  let timeInfo = '';
  if (isWorking && task.createdAt) {
    const elapsed = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 60000);
    const estTotal = task.estimatedMinutes || 60;
    const remaining = Math.max(0, estTotal - elapsed);
    const pct = progress > 0 ? progress : Math.min(95, Math.floor((elapsed / estTotal) * 100));
    timeInfo = `
      <div class="progress-section">
        <div class="progress-header">
          <span class="spinner"></span>
          <span class="progress-pct">${pct}%</span>
          <span class="progress-time">${elapsed}m elapsed / ~${remaining}m left</span>
        </div>
        <div class="progress-bar-card">
          <div class="progress-fill-card" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }

  // Find agent working on this task
  const agents = state.agents || {};
  const assignedAgent = task.agent ? agents[task.agent] : null;

  let agentStatusHTML = '';
  if (task.status === 'in_progress' && assignedAgent && assignedAgent.status === 'running') {
    const pct = assignedAgent.progress || 0;
    const elapsed = getElapsedTime(assignedAgent.startedAt);
    const remaining = estimateRemaining(assignedAgent.startedAt, pct);
    agentStatusHTML = `
      <div class="card-agent-status">
        <div class="card-spinner"></div>
        <div class="card-status-info">
          <span class="agent-label">${task.agent} ${pct}%</span>
          <span class="time-label">${elapsed} / ~${remaining}</span>
        </div>
      </div>
      <div class="card-progress-mini"><div class="fill" style="width:${pct}%"></div></div>
    `;
  } else if (task.status === 'in_progress' && task.agent) {
    agentStatusHTML = `
      <div class="card-agent-status">
        <div class="card-spinner"></div>
        <div class="card-status-info">
          <span class="agent-label">${task.agent}</span>
          <span class="time-label">working...</span>
        </div>
      </div>
    `;
  }

  // Health status indicator
  let healthHTML = '';
  const hs = task._healthStatus;
  if (hs === 'timeout') {
    healthHTML = `<div class="health-badge health-timeout">⏱ 타임아웃 — 무응답으로 복귀됨</div>`;
  } else if (hs === 'stale') {
    healthHTML = `<div class="health-badge health-stale">⚠ 정체 — ${escapeHtml(task._healthMessage || '')}</div>`;
  } else if (hs === 'no_agent') {
    healthHTML = `<div class="health-badge health-error">❌ 세션 미연결 — ${escapeHtml(task._healthMessage || '')}</div>`;
  } else if (hs === 'waiting') {
    healthHTML = `<div class="health-badge health-waiting">⏳ ${escapeHtml(task._healthMessage || '대기 중')}</div>`;
  } else if (hs === 'agent_done') {
    healthHTML = `<div class="health-badge health-done">✅ ${escapeHtml(task._healthMessage || '')}</div>`;
  }

  if (task.status === 'done' && task.agent) {
    agentStatusHTML = `
      <div class="card-agent-status completed-status">
        <div class="card-spinner done"></div>
        <div class="card-status-info">
          <span class="agent-label done">${task.agent}</span>
          <span class="time-label">Status changed to DONE</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="task-card ${isWorking ? 'working' : ''}" data-id="${task.id}" draggable="true">
      <div class="card-top">
        <span class="card-title">${escapeHtml(task.title)}</span>
        <span class="priority-badge ${priorityClass}">${capitalize(task.priority || 'medium')}</span>
      </div>
      <span class="role-badge ${roleClass}">${assignee || task.role || 'unassigned'}</span>
      ${timeInfo}
      ${healthHTML}
      <div class="card-meta">
        <span>
          ${task.status === 'done' ? '✅ Done' : isWorking ? '' : ''}
        </span>
      </div>
      <div class="card-meta" style="margin-top:4px">
        <span class="card-agent">${assignee}</span>
        <span>${timeAgo}</span>
      </div>
    </div>
  `;
}

// --- Drag & Drop (event delegation) ---
let _draggedTaskId = null;

// Global drag event listeners on the kanban board
// Initialize drag-and-drop + click — runs immediately since script is at body end
let _isDragging = false;

(function initDragAndDrop() {
  const board = document.getElementById('kanbanBoard');
  if (!board) { setTimeout(initDragAndDrop, 200); return; }

  // Dragstart
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    _draggedTaskId = card.dataset.id;
    _isDragging = true;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _draggedTaskId);
  });

  // Dragend
  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drop-target'));
    _draggedTaskId = null;
    setTimeout(() => { _isDragging = false; }, 100);
  });

  // Dragover + auto-scroll when near edges
  board.addEventListener('dragover', (e) => {
    const col = e.target.closest('.kanban-column');
    if (!col) {
      // Auto-scroll page when dragging near top/bottom edge
      const scrollZone = 80;
      if (e.clientY < scrollZone) {
        window.scrollBy(0, -10);
      } else if (e.clientY > window.innerHeight - scrollZone) {
        window.scrollBy(0, 10);
      }
      // Auto-scroll horizontally near left/right edge
      if (e.clientX < scrollZone) {
        board.scrollLeft -= 10;
      } else if (e.clientX > window.innerWidth - scrollZone) {
        board.scrollLeft += 10;
      }
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('drop-target');

    // Auto-scroll vertically
    const scrollZone = 80;
    if (e.clientY < scrollZone) {
      window.scrollBy(0, -10);
    } else if (e.clientY > window.innerHeight - scrollZone) {
      window.scrollBy(0, 10);
    }
  });

  // Dragleave
  board.addEventListener('dragleave', (e) => {
    const col = e.target.closest('.kanban-column');
    if (col && !col.contains(e.relatedTarget)) {
      col.classList.remove('drop-target');
    }
  });

  // Drop
  board.addEventListener('drop', (e) => {
    e.preventDefault();
    const col = e.target.closest('.kanban-column');
    if (!col) return;
    col.classList.remove('drop-target');
    const taskId = e.dataTransfer.getData('text/plain') || _draggedTaskId;
    if (!taskId) return;
    const newStatus = col.dataset.status;
    if (newStatus) moveTask(taskId, newStatus);
  });

  // Click — open task detail modal
  board.addEventListener('click', (e) => {
    if (_isDragging) return;
    const card = e.target.closest('.task-card');
    if (!card) return;
    const taskId = card.dataset.id;
    if (taskId) openTaskDetail(taskId);
  });

  console.log('Jun.AI: Drag-and-drop + click initialized');
})();

async function moveTask(taskId, newStatus) {
  const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
  if (!task) return;
  const oldStatus = task.status;
  if (oldStatus === newStatus) return;

  // Update task status
  const res = await fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  const updated = await res.json();

  // If moved to in_progress → dispatch agent + send to Claude session
  if (newStatus === 'in_progress' && updated.agent) {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_start',
        agent: updated.agent,
        phase: updated.phase,
        task: updated.title,
        timestamp: new Date().toISOString()
      })
    });
    // Send task to Claude session via tmux
    await dispatchToClaudeSession(updated);
    showInfoNotification('에이전트 실행', `"${updated.title}" → ${updated.agent} 에이전트에게 전달됨`);
  } else if (newStatus === 'in_progress' && !updated.agent) {
    showAgentAssignForTask(taskId);
  }

  // If moved to done → mark agent as completed
  if (newStatus === 'done' && updated.agent) {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_complete',
        agent: updated.agent,
        phase: updated.phase,
        task: updated.title,
        timestamp: new Date().toISOString()
      })
    });
  }

  fetchAndRender();
}

function showAgentAssignForTask(taskId) {
  const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
  if (!task) return;

  const agentList = [
    'project-director','web-developer','architect','planner','code-reviewer',
    'security-reviewer','tdd-guide','verify-agent','build-error-resolver',
    'e2e-tester','evaluator','bsp-engineer','firmware-engineer','circuit-engineer',
    'hardware-engineer','algorithm-researcher','graphics-engineer','sdk-developer',
    'devops-engineer','maintenance-engineer','product-strategist','regulatory-specialist',
    'doc-manager','qa-engineer','voc-researcher','ux-designer','marketing-strategist',
    'report-writer','presentation-writer','hwp-writer','spreadsheet-writer',
    'paper-patent-researcher','data-engineer','labeling-manager','labeling-reviewer',
    'ai-trainer','mlops-engineer','cuda-engineer','npu-engineer','inference-optimizer',
    'reverse-engineer','retroactive-documenter','env-provisioner'
  ];

  const modal = document.createElement('div');
  modal.className = 'task-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="task-modal" style="max-width:420px;max-height:80vh;overflow-y:auto">
      <h3>에이전트 배정</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
        "<b>${escapeHtml(task.title)}</b>"를 실행할 에이전트를 선택하세요.
      </p>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${agentList.map(a => {
          const agents = state.agents || {};
          const busy = agents[a] && agents[a].status === 'running';
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-primary);border-radius:6px;cursor:pointer;transition:background 0.1s"
                       onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-primary)'"
                       onclick="assignAndDispatch('${taskId}','${a}');this.closest('.task-modal-overlay').remove()">
            <span style="width:8px;height:8px;border-radius:50%;background:${busy ? 'var(--accent-orange)' : 'var(--accent-green)'}"></span>
            <span style="font-size:13px;font-weight:500">${a}</span>
            ${busy ? '<span style="font-size:11px;color:var(--text-muted)">(작업 중)</span>' : ''}
          </div>`;
        }).join('')}
      </div>
      <button class="close-btn" onclick="this.closest('.task-modal-overlay').remove()">취소</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function assignAndDispatch(taskId, agentName) {
  // Assign agent to task
  await fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: agentName, assignee: agentName, status: 'in_progress' })
  });

  const task = (state.tasks || []).find(t => String(t.id) === String(taskId));

  // Dispatch agent_start event
  await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'agent_start',
      agent: agentName,
      phase: task ? task.phase : undefined,
      task: task ? task.title : '',
      timestamp: new Date().toISOString()
    })
  });

  // Send task to Claude session
  const updated = { ...(task || {}), agent: agentName };
  await dispatchToClaudeSession(updated);

  showInfoNotification('에이전트 실행', `"${task ? task.title : ''}" → ${agentName} 에이전트에게 전달됨`);
  fetchAndRender();
}

// --- Dispatch to Claude Session via tmux ---
async function dispatchToClaudeSession(task) {
  if (!task || !task.title) return;

  // Find the matching Claude session
  let targetWindow = null;
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();

    // Find project-specific session first (jun-xxx)
    const project = (state.projects || []).find(p => p.id === task.project);
    if (project) {
      const safeName = 'jun-' + project.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '').substring(0, 20);
      targetWindow = sessions.find(s => s.name === safeName);
    }

    // Fallback: any claude session
    if (!targetWindow) {
      targetWindow = sessions.find(s => s.command === 'claude');
    }
  } catch (e) { /* ignore */ }

  if (!targetWindow) {
    // No session found — start one
    const project = (state.projects || []).find(p => p.id === task.project);
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: project ? project.name : 'task',
        projectPath: '/home/issacs/work'
      })
    });
    // Wait for session to start
    await new Promise(r => setTimeout(r, 3000));
    const res2 = await fetch('/api/sessions');
    const sessions2 = await res2.json();
    targetWindow = sessions2.find(s => s.command === 'claude' && s.name.startsWith('jun-'));
  }

  if (targetWindow) {
    // Build instruction message for Claude
    const agent = task.agent || '';
    const objective = task.objective || task.description || '';
    const phase = task.phase !== undefined ? `Phase ${task.phase}` : '';

    let instruction = `[Jun.AI 대시보드 태스크 전달] "${task.title}"`;
    if (agent) instruction += ` — ${agent} 에이전트로 실행해주세요.`;
    if (phase) instruction += ` (${phase})`;
    if (objective) instruction += ` 목표: ${objective}`;
    instruction += ` 완료 후 대시보드에 결과를 보고해주세요: curl -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_complete","agent":"${agent}","task":"${task.title.replace(/'/g, '')}"}'`;

    await fetch('/api/sessions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        windowName: targetWindow.name,
        message: instruction
      })
    });
  }
}

// --- Card Click (full detail modal) ---
async function openTaskDetail(taskId) {
  if (!taskId) return;
  let data;
  try {
    const res = await fetch('/api/tasks/' + taskId);
    data = await res.json();
    if (!data || !data.id) { console.error('Task not found:', taskId); return; }
  } catch (e) { console.error('Failed to load task:', e); return; }

  const task = data;
  const history = data.history || [];
  const comments = data.comments || [];
  const docs = data.documents || [];
  const agents = state.agents || {};
  const assignedAgent = task.agent ? agents[task.agent] : null;

  // Agent status info
  let agentInfo = '';
  if (assignedAgent && assignedAgent.status === 'running') {
    const pct = assignedAgent.progress || 0;
    const elapsed = getElapsedTime(assignedAgent.startedAt);
    const remaining = estimateRemaining(assignedAgent.startedAt, pct);
    agentInfo = `
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <div class="spinner"></div>
        <span style="color:var(--accent-orange);font-weight:600">${task.agent}</span>
        <span style="color:var(--text-muted)">${assignedAgent.status}</span>
      </div>
      <div class="progress-bar-card"><div class="progress-fill-card" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px">
        <span>경과: ${elapsed}</span>
        <span style="color:var(--accent-orange);font-weight:600">${pct}%</span>
        <span>남은: ${remaining}</span>
      </div>
    `;
  } else if (assignedAgent) {
    agentInfo = `
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <span style="color:var(--accent-green)">${task.agent}</span>
        <span style="color:var(--text-muted)">${assignedAgent.status || 'assigned'}</span>
        ${assignedAgent.duration ? '<span style="color:var(--text-muted)">(' + assignedAgent.duration + 'min)</span>' : ''}
      </div>
    `;
  }

  // Build AVAILABLE_AGENTS list for dropdown
  const agentList = [
    'project-director','web-developer','architect','planner','code-reviewer',
    'security-reviewer','tdd-guide','verify-agent','build-error-resolver',
    'e2e-tester','evaluator','bsp-engineer','firmware-engineer','circuit-engineer',
    'hardware-engineer','algorithm-researcher','graphics-engineer','sdk-developer',
    'devops-engineer','maintenance-engineer','product-strategist','regulatory-specialist',
    'doc-manager','qa-engineer','voc-researcher','ux-designer','marketing-strategist',
    'report-writer','presentation-writer','hwp-writer','spreadsheet-writer',
    'paper-patent-researcher','data-engineer','labeling-manager','labeling-reviewer',
    'ai-trainer','mlops-engineer','cuda-engineer','npu-engineer','inference-optimizer',
    'reverse-engineer','retroactive-documenter','env-provisioner'
  ];

  // History HTML
  const historyHTML = history.length > 0
    ? history.map(h => {
        const t = new Date(h.timestamp).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
        return `<div style="display:flex;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(51,65,85,0.3)">
          <span style="color:var(--text-muted);min-width:50px">${t}</span>
          <span style="color:var(--text-secondary)">${escapeHtml(h.message)}</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--text-muted);font-size:12px">히스토리 없음</div>';

  // Documents HTML
  const docsHTML = docs.length > 0
    ? docs.map(d => `<div style="font-size:12px;padding:3px 0">📄 ${escapeHtml(d.file)} <span style="color:var(--text-muted)">.${d.format}</span></div>`).join('')
    : '<div style="color:var(--text-muted);font-size:12px">산출물 없음</div>';

  // Comments HTML
  const commentsHTML = comments.length > 0
    ? comments.map(c => {
        const isUser = c.from === 'user';
        const bubbleStyle = isUser
          ? 'background:rgba(59,130,246,0.15);border-left:3px solid var(--accent-blue)'
          : 'background:rgba(100,116,139,0.1);border-left:3px solid var(--text-muted)';
        const t = new Date(c.timestamp).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
        return `<div style="${bubbleStyle};padding:8px 12px;border-radius:6px;margin:4px 0">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
            <span style="font-weight:600;color:${isUser ? 'var(--accent-blue)' : 'var(--text-secondary)'}">${escapeHtml(c.from)}</span>
            <span style="color:var(--text-muted)">${t}</span>
          </div>
          <div style="font-size:13px">${escapeHtml(c.message)}</div>
        </div>`;
      }).join('')
    : '';

  const statuses = ['todo','hold','claimed','in_progress','review','done'];
  const statusLabels = {'todo':'📋 To Do','hold':'⏸ Hold','claimed':'👋 Claimed','in_progress':'🔄 Progress','review':'🔍 Review','done':'✅ Done'};
  const priorityColors = {'low':'var(--text-muted)','medium':'var(--accent-blue)','high':'var(--accent-orange)','critical':'var(--accent-red)'};

  const modal = document.createElement('div');
  modal.className = 'task-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="task-modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:16px;flex:1">${escapeHtml(task.title)}</h3>
        <span style="color:${priorityColors[task.priority] || 'var(--text-muted)'};font-size:12px;font-weight:600">${(task.priority||'medium').toUpperCase()}</span>
      </div>

      <div style="margin:12px 0">
        <label>상태:</label>
        <div class="status-buttons">
          ${statuses.map(s => `
            <button class="status-btn ${s === task.status ? 'active' : ''}" style="font-size:11px;padding:6px"
                    onclick="changeTaskStatus('${taskId}','${s}')">${statusLabels[s] || s}</button>
          `).join('')}
        </div>
      </div>

      <div style="margin:12px 0">
        <label>담당 에이전트:</label>
        ${agentInfo}
        <select style="width:100%;padding:6px;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;font-size:13px"
                onchange="changeTaskAgent('${taskId}',this.value)">
          <option value="">-- 에이전트 선택 --</option>
          ${agentList.map(a => `<option value="${a}" ${a === task.agent ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>

      <div style="margin:12px 0">
        <label>목표:</label>
        <textarea id="taskObjective" style="width:100%;height:60px;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;font-size:13px;resize:vertical"
                  onblur="saveObjective('${taskId}',this.value)">${escapeHtml(task.objective || '')}</textarea>
      </div>

      <div style="margin:12px 0">
        <label>히스토리:</label>
        <div id="taskHistory" style="max-height:120px;overflow-y:auto;background:var(--bg-primary);border-radius:6px;padding:8px">${historyHTML}</div>
      </div>

      <div style="margin:12px 0">
        <label>산출물:</label>
        <div style="background:var(--bg-primary);border-radius:6px;padding:8px">${docsHTML}</div>
      </div>

      <div style="margin:12px 0">
        <label>에이전트 소통:</label>
        <div id="commentArea" style="max-height:150px;overflow-y:auto;background:var(--bg-primary);border-radius:6px;padding:8px;margin-bottom:8px">
          ${commentsHTML || '<div style="color:var(--text-muted);font-size:12px">메시지 없음</div>'}
        </div>
        <div style="display:flex;gap:8px">
          <input id="commentInput" placeholder="메시지 입력..." style="flex:1;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;font-size:13px"
                 onkeydown="if(event.key==='Enter')sendComment('${taskId}')" />
          <button onclick="sendComment('${taskId}')" style="padding:8px 16px;background:var(--accent-blue);color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">전송</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:16px">
        <button onclick="deleteTaskConfirm('${taskId}')" style="padding:8px 16px;background:rgba(239,68,68,0.15);color:var(--accent-red);border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;font-size:13px">삭제</button>
        <button class="close-btn" style="width:auto;margin:0" onclick="this.closest('.task-modal-overlay').remove()">닫기</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Auto-scroll history and comments to bottom
  setTimeout(() => {
    const historyEl = modal.querySelector('[id="taskHistory"]') || modal.querySelectorAll('[style*="max-height:120px"]')[0];
    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
    const commentEl = document.getElementById('commentArea');
    if (commentEl) commentEl.scrollTop = commentEl.scrollHeight;
  }, 100);
}

async function changeTaskStatus(taskId, newStatus) {
  await fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  document.querySelector('.task-modal-overlay')?.remove();
  fetchAndRender();
}

async function changeTaskAgent(taskId, agent) {
  await fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: agent, assignee: agent })
  });
  fetchAndRender();
}

async function saveObjective(taskId, objective) {
  await fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objective })
  });
}

async function sendComment(taskId) {
  const input = document.getElementById('commentInput');
  const msg = input.value.trim();
  if (!msg) return;
  const res = await fetch('/api/tasks/' + taskId + '/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'user', message: msg })
  });
  input.value = '';
  // Show delivery notification
  showInfoNotification('메시지 전달', `Claude 세션에 전달됨: "${msg.substring(0, 30)}..."`);
  // Refresh the modal
  document.querySelector('.task-modal-overlay')?.remove();
  openTaskDetail(taskId);
}

async function deleteTaskConfirm(taskId) {
  if (!confirm('이 태스크를 삭제하시겠습니까?')) return;
  await fetch('/api/tasks/' + taskId, { method: 'DELETE' });
  document.querySelector('.task-modal-overlay')?.remove();
  fetchAndRender();
}

// --- Phase Detail Modal ---
async function openPhaseDetail(phaseId) {
  const res = await fetch('/api/phases/' + phaseId);
  const data = await res.json();
  if (!data) return;

  const statusIcon = data.status === 'completed' ? '✅' : data.status === 'in_progress' ? '🔄' : '⬜';
  const elapsed = data.startedAt ? getElapsedTime(data.startedAt) : '--';

  const agentsHTML = (data.agents || []).map(a => {
    const icon = a.status === 'running' ? '🔄' : a.status === 'completed' ? '✅' : '⏳';
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">
      <span>${icon}</span>
      <span style="font-weight:500;min-width:150px">${a.name}</span>
      <span style="color:var(--text-muted);flex:1">${a.task || ''}</span>
      <span style="font-size:11px;color:var(--text-muted)">${a.status}</span>
    </div>`;
  }).join('') || '<div style="color:var(--text-muted);font-size:12px">배정된 에이전트 없음</div>';

  const tasksHTML = (data.tasks || []).map(t => {
    const icon = t.status === 'done' ? '✅' : t.status === 'in_progress' ? '🔄' : '⬜';
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer" onclick="document.querySelector('.task-modal-overlay')?.remove();openTaskDetail('${t.id}')">
      <span>${icon}</span>
      <span style="flex:1">${escapeHtml(t.title)}</span>
      <span style="font-size:11px;color:var(--text-muted)">${t.status}</span>
    </div>`;
  }).join('') || '<div style="color:var(--text-muted);font-size:12px">태스크 없음</div>';

  const docsHTML = (data.documents || []).map(d =>
    `<div style="font-size:12px;padding:3px 0">📄 ${escapeHtml(d.file)} <span style="color:var(--text-muted)">.${d.format}</span></div>`
  ).join('') || '<div style="color:var(--text-muted);font-size:12px">산출물 없음</div>';

  const modal = document.createElement('div');
  modal.className = 'task-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="task-modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0;font-size:16px">${statusIcon} Phase ${data.id}: ${escapeHtml(data.name)}</h3>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;font-size:13px">
        <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
          <div style="color:var(--text-muted);font-size:11px">상태</div>
          <div style="font-weight:600">${data.status}</div>
        </div>
        <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
          <div style="color:var(--text-muted);font-size:11px">경과 시간</div>
          <div style="font-weight:600">${elapsed}</div>
        </div>
        <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
          <div style="color:var(--text-muted);font-size:11px">태스크</div>
          <div style="font-weight:600">${data.tasksDone}/${data.tasksTotal} (${data.taskProgress}%)</div>
        </div>
        <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
          <div style="color:var(--text-muted);font-size:11px">시작</div>
          <div style="font-weight:600">${data.startedAt ? new Date(data.startedAt).toLocaleString('ko-KR') : '미시작'}</div>
        </div>
      </div>

      <div style="margin:8px 0">
        <div class="progress-bar-card"><div class="progress-fill-card" style="width:${data.taskProgress}%"></div></div>
      </div>

      <div style="margin:12px 0">
        <label style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:8px">담당 에이전트</label>
        <div style="background:var(--bg-primary);border-radius:6px;padding:8px">${agentsHTML}</div>
      </div>

      <div style="margin:12px 0">
        <label style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:8px">이 Phase의 태스크</label>
        <div style="background:var(--bg-primary);border-radius:6px;padding:8px">${tasksHTML}</div>
      </div>

      <div style="margin:12px 0">
        <label style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:8px">산출물</label>
        <div style="background:var(--bg-primary);border-radius:6px;padding:8px">${docsHTML}</div>
      </div>

      <button class="close-btn" onclick="this.closest('.task-modal-overlay').remove()">닫기</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// --- Project Delete ---
function deleteProjectConfirm(projectId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;

  const modal = document.createElement('div');
  modal.className = 'task-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="task-modal" style="max-width:420px">
      <h3 style="color:var(--accent-red)">⚠️ 프로젝트 삭제</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin:12px 0;line-height:1.6">
        "<b>${escapeHtml(project.name)}</b>" 프로젝트를 삭제하면<br>
        모든 태스크, 히스토리, 산출물 기록이<br>
        <b style="color:var(--accent-red)">영구적으로 삭제</b>됩니다.
      </p>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">삭제하려면 프로젝트 이름을 정확히 입력하세요:</p>
      <input id="deleteProjectConfirmInput" placeholder="${escapeHtml(project.name)}" style="width:100%;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--accent-red);border-radius:6px;font-size:14px" />
      <div class="modal-actions" style="margin-top:12px">
        <button onclick="executeDeleteProject('${projectId}','${escapeHtml(project.name)}')" style="background:var(--accent-red)">삭제</button>
        <button onclick="this.closest('.task-modal-overlay').remove()">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function executeDeleteProject(projectId, projectName) {
  const input = document.getElementById('deleteProjectConfirmInput');
  if (input.value.trim() !== projectName) {
    alert('프로젝트 이름이 일치하지 않습니다.');
    return;
  }
  await fetch('/api/projects/' + projectId, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmName: projectName })
  });
  document.querySelector('.task-modal-overlay')?.remove();
  activeProjectFilter = 'all';
  fetchAndRender();
}

function updateTaskStatus(taskId, newStatus, btn) {
  fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  }).then(() => {
    document.querySelector('.task-modal-overlay')?.remove();
    fetchAndRender();
  });
}

function assignAgent(taskId, agent) {
  fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignee: agent, agent: agent })
  }).then(() => fetchAndRender());
}

function showAgentDispatch(task) {
  const msg = `🤖 Agent "${task.assignee}" dispatched for: ${task.title}`;
  console.log(msg);
  // Could show a toast notification here
}

function renderAgents() {
  const list = document.getElementById('agentList');
  const agents = state.agents || {};
  const entries = Object.values(agents);

  if (!entries.length) {
    list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">No active agents</div>';
    return;
  }

  // Sort: running first, then waiting, then completed
  const order = { running: 0, waiting: 1, completed: 2 };
  entries.sort((a, b) => (order[a.status] || 9) - (order[b.status] || 9));

  list.innerHTML = entries.map(a => {
    const statusClass = 'status-' + (a.status || 'waiting');
    const spinnerClass = a.status === 'completed' ? 'completed' : a.status === 'waiting' ? 'waiting' : '';
    const progressClass = a.status === 'completed' ? 'completed' : 'running';
    const pct = a.progress || 0;
    const pctClass = a.status === 'completed' ? 'done' : '';

    // Time calculations
    const elapsed = getElapsedTime(a.startedAt);
    const remaining = estimateRemaining(a.startedAt, pct);
    const duration = a.duration ? a.duration + 'min' : '';

    const timeHTML = a.status === 'completed'
      ? `<span class="elapsed">completed ${duration ? 'in ' + duration : ''}</span>`
      : a.status === 'running'
      ? `<span class="elapsed">elapsed: ${elapsed}</span><span class="remaining">remaining: ~${remaining}</span>`
      : `<span class="elapsed">waiting...</span>`;

    const taskText = a.task || a.waitingFor || a.message || '';

    return `
      <div class="agent-row">
        <div class="agent-spinner ${spinnerClass}"></div>
        <span class="agent-name">${a.name}</span>
        <span class="agent-task" title="${escapeHtml(taskText)}">${escapeHtml(taskText)}</span>
        <span class="agent-status-badge ${statusClass}">${a.status}</span>
        <div class="agent-progress-col">
          <div class="progress-bar">
            <div class="progress-fill ${progressClass}" style="width:${pct}%"></div>
          </div>
          <div class="progress-text">
            <span class="progress-percent ${pctClass}">${pct}%</span>
            <span>${a.message && a.status === 'running' ? escapeHtml(a.message) : ''}</span>
          </div>
        </div>
        <div class="agent-time">${timeHTML}</div>
      </div>
    `;
  }).join('');
}

function renderDocuments() {
  const list = document.getElementById('docList');
  let docs = (state.documents || []).filter(d => d.file);

  // Project filter — match active project filter
  if (activeProjectFilter !== 'all') {
    docs = docs.filter(d => d.project === activeProjectFilter);
  }

  // Category filter
  const filterEl = document.getElementById('outputCategoryFilter');
  const categoryFilter = filterEl ? filterEl.value : 'all';
  if (categoryFilter !== 'all') {
    docs = docs.filter(d => d.category === categoryFilter);
  }

  if (!docs.length) {
    const filterMsg = activeProjectFilter !== 'all'
      ? '선택된 프로젝트에 산출물 없음'
      : categoryFilter !== 'all'
        ? `"${categoryFilter}" 카테고리 산출물 없음`
        : '산출물 없음 — 에이전트가 작업을 완료하면 여기에 표시됩니다';
    list.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">${filterMsg}</div>`;
    return;
  }

  const formatIcons = { docx: '📄', pptx: '📊', hwpx: '📝', xlsx: '📈', pdf: '📋', png: '🖼', jpg: '🖼', svg: '🖼' };
  const categoryLabels = {
    analysis: '분석', design: '설계', certification: '인증', test: '테스트',
    manual: '매뉴얼', presentation: '발표', data: '데이터', official: '공문서',
    media: '미디어', document: '문서'
  };
  const categoryColors = {
    analysis: 'var(--accent-blue)', design: 'var(--accent-purple)', certification: 'var(--accent-red)',
    test: 'var(--accent-green)', manual: 'var(--accent-cyan)', presentation: 'var(--accent-orange)',
    data: 'var(--accent-gold)', official: 'var(--accent-pink)', media: 'var(--text-muted)', document: 'var(--text-secondary)'
  };

  // Group by directory (phase)
  const groups = {};
  docs.forEach(d => {
    const dir = d.file ? d.file.split('/').slice(0, -1).join('/') || 'root' : 'root';
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(d);
  });

  let html = '';

  // Stats bar
  const totalCount = docs.length;
  const formatCounts = {};
  docs.forEach(d => { formatCounts[d.format] = (formatCounts[d.format] || 0) + 1; });
  const formatStats = Object.entries(formatCounts).map(([f, c]) => `.${f}: ${c}`).join(' | ');
  html += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(51,65,85,0.3)">총 ${totalCount}개 산출물 | ${formatStats}</div>`;

  // Grouped list
  Object.keys(groups).sort().forEach(dir => {
    html += `<div style="margin-bottom:8px">`;
    html += `<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">📁 ${escapeHtml(dir)} (${groups[dir].length})</div>`;
    groups[dir].forEach(d => {
      const icon = formatIcons[d.format] || '📄';
      const cat = d.category || 'document';
      const catLabel = categoryLabels[cat] || cat;
      const catColor = categoryColors[cat] || 'var(--text-muted)';
      const fileName = d.file ? d.file.split('/').pop() : 'unknown';
      const fileUrl = d.file ? '/files/' + encodeURI(d.file) : '#';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0 3px 16px;font-size:12px">
        <span>${icon}</span>
        <a href="${fileUrl}" target="_blank" style="flex:1;color:var(--text-primary);text-decoration:none;cursor:pointer"
           onmouseover="this.style.color='var(--accent-blue)'"
           onmouseout="this.style.color='var(--text-primary)'"
           onclick="event.preventDefault();openFile('${fileUrl}','${escapeHtml(fileName)}')">${escapeHtml(fileName)}</a>
        <span style="color:${catColor};font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(100,116,139,0.1)">${catLabel}</span>
        <span style="color:var(--text-muted);font-size:10px">${getTimeAgo(d.createdAt)}</span>
      </div>`;
    });
    html += `</div>`;
  });

  list.innerHTML = html;
}

// --- Actions ---
function showNewTaskModal() { document.getElementById('newTaskModal').style.display = 'flex'; }
function hideNewTaskModal() { document.getElementById('newTaskModal').style.display = 'none'; }

async function createTask() {
  const title = document.getElementById('newTaskTitle').value.trim();
  if (!title) return;
  const priority = document.getElementById('newTaskPriority').value;
  const role = document.getElementById('newTaskRole').value;
  const project = document.getElementById('newTaskProject').value;

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, role, project, status: 'todo' })
  });

  document.getElementById('newTaskTitle').value = '';
  hideNewTaskModal();
}

function showNewProjectModal() { document.getElementById('newProjectModal').style.display = 'flex'; }
function hideNewProjectModal() { document.getElementById('newProjectModal').style.display = 'none'; }

async function setupProject() {
  const name = document.getElementById('setupProjectName').value.trim();
  if (!name) { alert('프로젝트 이름을 입력하세요'); return; }
  const description = document.getElementById('setupProjectDesc').value.trim();
  const domain = document.getElementById('setupProjectDomain').value;

  // Collect selected phases
  const checkboxes = document.querySelectorAll('#phaseCheckboxes input[type="checkbox"]:checked');
  const phases = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (phases.length === 0) { alert('최소 1개 이상의 Phase를 선택하세요'); return; }

  const res = await fetch('/api/projects/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, domain, phases })
  });
  const data = await res.json();

  // Reset form
  document.getElementById('setupProjectName').value = '';
  document.getElementById('setupProjectDesc').value = '';
  hideNewProjectModal();

  // Auto-select the new project in filter
  setTimeout(() => {
    const sel = document.getElementById('projectFilter');
    if (sel && data.project) {
      sel.value = data.project.id;
      onProjectFilterChange();
    }
  }, 500);

  // Auto-start Claude session if checked
  const autoSession = document.getElementById('setupAutoSession');
  const projectPath = document.getElementById('setupProjectPath').value.trim();
  if (autoSession && autoSession.checked && data.project) {
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: name,
        projectPath: projectPath || '/home/issacs/work',
        projectId: data.project.id
      })
    });
  }

  // Show success banner
  const sessionMsg = (autoSession && autoSession.checked) ? ' + Claude 세션 시작됨' : '';
  const banner = document.createElement('div');
  banner.className = 'setup-banner';
  banner.innerHTML = `
    <span class="text">✅ "${escapeHtml(name)}" 프로젝트 셋업 완료 — ${data.tasks ? data.tasks.length : 0}개 PDLC 태스크 생성됨 (${domain})${sessionMsg}</span>
    <button class="dismiss" onclick="this.parentElement.remove()">×</button>
  `;
  const board = document.getElementById('kanbanBoard');
  board.parentElement.insertBefore(banner, board);
  setTimeout(() => banner.remove(), 15000);
}

// Legacy createProject for backward compat
async function createProject() {
  return setupProject();
}

function onProjectFilterChange() {
  activeProjectFilter = document.getElementById('projectFilter').value;
  renderKanban();
  renderDocuments();
}

// --- Drag & Drop ---
let dragTaskId = null;

function onDragStart(e, taskId) {
  dragTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.column-body').forEach(c => c.classList.remove('drag-over'));
}

async function onDrop(e, newStatus) {
  if (!dragTaskId) return;
  const task = (state.tasks || []).find(t => t.id === dragTaskId);
  if (!task) return;

  const oldStatus = task.status;
  if (oldStatus === newStatus) { dragTaskId = null; return; }

  // If moving to in_progress → show agent assign modal
  if (newStatus === 'in_progress' || newStatus === 'claimed') {
    showAssignModal(dragTaskId, newStatus);
    dragTaskId = null;
    return;
  }

  // Otherwise just update status
  await updateTaskStatus(dragTaskId, newStatus);
  dragTaskId = null;
}

async function updateTaskStatus(taskId, status, agent) {
  const body = { status };
  if (agent) body.agent = agent;

  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // If assigning to in_progress with agent → notify server to dispatch
  if (status === 'in_progress' && agent) {
    const task = (state.tasks || []).find(t => t.id === taskId);
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_start',
        agent: agent,
        task: task ? task.title : '',
        phase: task ? task.phase : undefined,
        timestamp: new Date().toISOString()
      })
    });
    showInfoNotification('에이전트 배정', `"${task ? task.title : ''}" → ${agent} 에이전트에게 전달되었습니다.`);
  }
}

// --- Agent Assign Modal ---
let pendingAssignTaskId = null;
let pendingAssignStatus = null;

const AVAILABLE_AGENTS = [
  'project-director', 'web-developer', 'architect', 'planner',
  'code-reviewer', 'security-reviewer', 'tdd-guide', 'verify-agent',
  'build-error-resolver', 'e2e-tester', 'evaluator',
  'bsp-engineer', 'firmware-engineer', 'circuit-engineer',
  'hardware-engineer', 'algorithm-researcher', 'graphics-engineer',
  'sdk-developer', 'devops-engineer', 'maintenance-engineer',
  'product-strategist', 'regulatory-specialist', 'doc-manager', 'qa-engineer',
  'voc-researcher', 'ux-designer', 'marketing-strategist',
  'report-writer', 'presentation-writer', 'hwp-writer', 'spreadsheet-writer',
  'paper-patent-researcher', 'data-engineer', 'labeling-manager',
  'labeling-reviewer', 'ai-trainer', 'mlops-engineer',
  'cuda-engineer', 'npu-engineer', 'inference-optimizer',
  'reverse-engineer', 'retroactive-documenter', 'env-provisioner'
];

function showAssignModal(taskId, newStatus) {
  pendingAssignTaskId = taskId;
  pendingAssignStatus = newStatus;
  const task = (state.tasks || []).find(t => t.id === taskId);
  const agents = state.agents || {};

  document.getElementById('assignInfo').innerHTML =
    `<b>"${escapeHtml(task ? task.title : '')}"</b> → <b>${newStatus}</b>로 이동합니다.<br>담당 에이전트를 선택하세요.`;

  const listHTML = AVAILABLE_AGENTS.map(name => {
    const a = agents[name];
    const busy = a && a.status === 'running';
    const dotClass = busy ? 'busy' : 'available';
    const statusText = busy ? '(작업 중)' : '';
    return `
      <div class="assign-agent-item" onclick="assignAgent('${name}')">
        <span><span class="status-dot ${dotClass}"></span><span class="name">${name}</span> ${statusText}</span>
      </div>
    `;
  }).join('');

  document.getElementById('assignAgentList').innerHTML = listHTML;
  document.getElementById('assignAgentModal').style.display = 'flex';
}

function hideAssignModal() {
  document.getElementById('assignAgentModal').style.display = 'none';
  pendingAssignTaskId = null;
  pendingAssignStatus = null;
}

async function assignAgent(agentName) {
  if (!pendingAssignTaskId) return;
  await updateTaskStatus(pendingAssignTaskId, pendingAssignStatus, agentName);
  hideAssignModal();
}

function togglePanel(id) {
  const panel = document.getElementById(id);
  const body = panel.querySelector('.panel-body');
  body.classList.toggle('collapsed');
}

// --- Role Filter ---
document.getElementById('roleTabs').addEventListener('click', (e) => {
  if (!e.target.classList.contains('role-tab')) return;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  activeRoleFilter = e.target.dataset.role;
  renderKanban();
});

// --- Utilities ---
function capitalize(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
    .replace('in progress', 'InProgress')
    .replace('In progress', 'InProgress')
    .replace(' ', '');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s || '';
  return div.innerHTML;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '--';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return secs + 's';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + 'm ' + (secs % 60) + 's';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm';
  const days = Math.floor(hrs / 24);
  return days + 'd ' + (hrs % 24) + 'h';
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  return formatDuration(diff) + ' ago';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function getElapsedTime(startedAt) {
  if (!startedAt) return '--';
  return formatDuration(Date.now() - new Date(startedAt).getTime());
}

function estimateRemaining(startedAt, progress) {
  if (!startedAt || !progress || progress <= 0) return '--';
  if (progress >= 100) return '0s';
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const totalEstimate = elapsed / (progress / 100);
  const remaining = totalEstimate - elapsed;
  return '~' + formatDuration(remaining);
}

// Auto-refresh elapsed times every second for running agents
setInterval(() => {
  const agents = state.agents || {};
  const hasRunning = Object.values(agents).some(a => a.status === 'running');
  if (hasRunning) {
    renderAgents();
    renderKanban();
  }
}, 1000);

// --- Notifications ---
let notifIdCounter = 0;

function showAgentCompleteNotification(data) {
  const agent = data.agent || 'Agent';
  const task = data.task || '';
  const nextAgent = data.next_agent || '';
  const nextTask = data.next_task || '';

  if (nextAgent) {
    showConfirmNotification({
      id: String(++notifIdCounter),
      title: `${agent} 완료`,
      message: `"${task}" 작업을 완료했습니다.\n이어서 ${nextAgent}로 "${nextTask}" 진행하시겠습니까?`,
      agent: nextAgent,
      task: nextTask
    });
  } else {
    showInfoNotification(`${agent}`, `"${task}" 작업을 완료했습니다.`);
  }
}

function showConfirmNotification(data) {
  const container = document.getElementById('notificationContainer');
  const id = data.id || String(++notifIdCounter);
  const div = document.createElement('div');
  div.className = 'notification warning';
  div.id = 'notif-' + id;
  div.innerHTML = `
    <div class="notification-title">⚡ ${escapeHtml(data.title || 'Confirmation')}</div>
    <div class="notification-body">${escapeHtml(data.message || '')}</div>
    <div class="notification-actions">
      <button class="btn-yes" onclick="respondNotification('${id}', true)">예</button>
      <button class="btn-no" onclick="respondNotification('${id}', false)">아니오</button>
    </div>
  `;
  container.appendChild(div);
}

function showInfoNotification(title, message) {
  const container = document.getElementById('notificationContainer');
  const id = String(++notifIdCounter);
  const div = document.createElement('div');
  div.className = 'notification success';
  div.id = 'notif-' + id;
  div.innerHTML = `
    <div class="notification-title">✅ ${escapeHtml(title)}</div>
    <div class="notification-body">${escapeHtml(message)}</div>
    <div class="notification-actions">
      <button class="btn-dismiss" onclick="dismissNotification('${id}')">닫기</button>
    </div>
  `;
  container.appendChild(div);
  setTimeout(() => dismissNotification(id), 8000);
}

function respondNotification(id, approved) {
  // Send response back to server
  fetch('/api/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, approved })
  });
  dismissNotification(id);
  if (approved) {
    showInfoNotification('승인됨', '다음 단계를 진행합니다.');
  } else {
    showInfoNotification('보류', '작업이 보류되었습니다.');
  }
}

function dismissNotification(id) {
  const el = document.getElementById('notif-' + id);
  if (el) {
    el.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => el.remove(), 300);
  }
}

// --- File Viewer ---
async function openFile(url, fileName) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      window.open(url, '_blank');
    } else {
      showInfoNotification('파일 미생성', `"${fileName}" 파일이 아직 생성되지 않았습니다. 에이전트 작업 완료 후 생성됩니다.`);
    }
  } catch (e) {
    showInfoNotification('파일 미생성', `"${fileName}" 파일이 아직 생성되지 않았습니다.`);
  }
}

// --- Init ---
connect();

// Fetch initial state via REST as fallback
// --- Sessions ---
async function renderSessions() {
  const list = document.getElementById('sessionList');
  if (!list) return;
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    if (!sessions.length) {
      list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">No active sessions</div>';
      return;
    }
    list.innerHTML = sessions.map(s => {
      const isJun = s.name.startsWith('jun-');
      const statusColor = s.command === 'claude' ? 'var(--accent-green)' : 'var(--text-muted)';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(51,65,85,0.3);font-size:13px">
          <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0"></span>
          <span style="font-weight:500;min-width:120px">${escapeHtml(s.name)}</span>
          <span style="color:var(--text-muted);flex:1">${escapeHtml(s.cwd || '')}</span>
          <span style="color:var(--text-secondary);font-size:11px">${s.command}</span>
          ${isJun ? `<button onclick="stopSession('${s.name}')" style="padding:3px 8px;background:rgba(239,68,68,0.15);color:var(--accent-red);border:1px solid rgba(239,68,68,0.3);border-radius:4px;cursor:pointer;font-size:11px">종료</button>` : ''}
        </div>
      `;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">세션 조회 실패</div>';
  }
}

async function startNewSession(projectName, projectPath) {
  const res = await fetch('/api/sessions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName: projectName || 'new', projectPath: projectPath || '/home/issacs/work' })
  });
  const data = await res.json();
  showInfoNotification('세션', data.message || '세션 시작됨');
  renderSessions();
}

async function stopSession(windowName) {
  if (!confirm(`"${windowName}" 세션을 종료하시겠습니까?`)) return;
  await fetch('/api/sessions/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ windowName })
  });
  showInfoNotification('세션', `"${windowName}" 종료됨`);
  renderSessions();
}

// Refresh sessions every 5s
setInterval(renderSessions, 5000);

// --- Terminal Viewer ---
let autoRefreshTerminal = null;

async function loadTerminalOutput() {
  const sel = document.getElementById('terminalSessionSelect');
  const name = sel.value;
  const output = document.getElementById('terminalOutput');
  if (!name) {
    output.textContent = 'Select a session to view terminal output.';
    if (autoRefreshTerminal) { clearInterval(autoRefreshTerminal); autoRefreshTerminal = null; }
    return;
  }
  try {
    const res = await fetch('/api/sessions/' + encodeURIComponent(name) + '/output');
    const data = await res.json();
    output.textContent = data.output || '(empty)';
    output.scrollTop = output.scrollHeight;
  } catch (e) {
    output.textContent = 'Failed to load output.';
  }

  // Auto-refresh every 3s while a session is selected
  if (autoRefreshTerminal) clearInterval(autoRefreshTerminal);
  autoRefreshTerminal = setInterval(async () => {
    const currentName = document.getElementById('terminalSessionSelect').value;
    if (!currentName) { clearInterval(autoRefreshTerminal); autoRefreshTerminal = null; return; }
    try {
      const res = await fetch('/api/sessions/' + encodeURIComponent(currentName) + '/output');
      const data = await res.json();
      const el = document.getElementById('terminalOutput');
      const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      el.textContent = data.output || '(empty)';
      if (wasAtBottom) el.scrollTop = el.scrollHeight;
    } catch (e) { /* ignore */ }
  }, 3000);
}

// Update terminal session dropdown when sessions change
async function updateTerminalSelect() {
  const sel = document.getElementById('terminalSessionSelect');
  if (!sel) return;
  const currentVal = sel.value;
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    sel.innerHTML = '<option value="">-- select session --</option>' +
      sessions.map(s => `<option value="${s.name}" ${s.name === currentVal ? 'selected' : ''}>${s.name} (${s.command})</option>`).join('');
  } catch (e) { /* ignore */ }
}
setInterval(updateTerminalSelect, 5000);
setTimeout(updateTerminalSelect, 1000);

function fetchAndRender() {
  fetch('/api/status')
    .then(r => r.json())
    .then(data => { state = data; render(); })
    .catch(() => {});
}

fetchAndRender();

// Auto-refresh every 5 seconds
setInterval(fetchAndRender, 5000);
