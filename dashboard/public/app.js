// Jun.AI — Dashboard Client
let ws = null;
let state = { tasks: [], agents: {}, phases: [], documents: [], stats: {}, phaseProgress: 0 };
let activeRoleFilter = 'all';
let activeProjectFilter = localStorage.getItem('jun_active_project') || 'all';
let activePhaseFilter = localStorage.getItem('jun_active_phase') || 'all';

// --- WebSocket ---
function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);

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
    } else if (msg.type === 'chat_message') {
      handleChatWS(msg);
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
  renderTimeline();
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
  // Restore saved project selection
  const savedProject = localStorage.getItem('jun_active_project') || 'all';
  filterSelect.value = savedProject;
  if (filterSelect.value !== savedProject) filterSelect.value = 'all';
  activeProjectFilter = filterSelect.value;

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

  // Team lead status in header
  const tlEl = document.getElementById('teamLeadStatus');
  if (tlEl) {
    const agents = state.agents || {};
    if (activeProjectFilter === 'all') {
      const running = Object.values(agents).filter(a => a.status === 'running');
      const total = Object.keys(agents).length;
      if (running.length > 0) {
        tlEl.innerHTML = `<span style="color:var(--accent-orange)">🔄 ${running.length}/${total} 에이전트 활동 중</span>`;
      } else if (total > 0) {
        tlEl.innerHTML = `<span style="color:var(--accent-green)">✅ ${total} 에이전트 대기</span>`;
      } else {
        tlEl.innerHTML = '';
      }
    } else {
      const project = projects.find(p => p.id === activeProjectFilter);
      if (project) {
        const tasks = (state.tasks || []).filter(t => t.project === activeProjectFilter);
        const projectAgentNames = [...new Set(tasks.map(t => t.agent).filter(Boolean))];
        const runningAgents = projectAgentNames.filter(a => agents[a] && agents[a].status === 'running');
        const doneCount = tasks.filter(t => t.status === 'done').length;
        const totalCount = tasks.length;
        const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

        if (runningAgents.length > 0) {
          tlEl.innerHTML = `<span style="color:var(--accent-orange)">🔄 ${escapeHtml(project.name)}: ${runningAgents.join(', ')} 작업 중 (${pct}%)</span>`;
        } else if (pct === 100) {
          tlEl.innerHTML = `<span style="color:var(--accent-green)">✅ ${escapeHtml(project.name)}: 완료 (${doneCount}/${totalCount})</span>`;
        } else {
          tlEl.innerHTML = `<span style="color:var(--text-muted)">⏸ ${escapeHtml(project.name)}: 대기 중 (${pct}%)</span>`;
        }
      }
    }
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
  track.innerHTML = phases.map((p, i) => {
    const isSelected = String(activePhaseFilter) === String(i);
    const selectedStyle = isSelected ? 'outline:2px solid white;outline-offset:1px;' : '';
    return `<div class="phase-block ${p.status}" data-name="${phaseNames[i] || p.name}" style="cursor:pointer;${selectedStyle}" onclick="togglePhaseFilter(${i})" oncontextmenu="event.preventDefault();openPhaseDetail(${i})">
      ${i}
    </div>`;
  }).join('');

  // Show active filter label
  let label = (state.phaseProgress || 0) + '%';
  if (activePhaseFilter !== 'all') {
    label = `P${activePhaseFilter} 필터 | ` + label;
  }
  document.getElementById('phasePercent').textContent = label;
}

function togglePhaseFilter(phaseId) {
  if (String(activePhaseFilter) === String(phaseId)) {
    activePhaseFilter = 'all'; // toggle off
  } else {
    activePhaseFilter = String(phaseId);
  }
  localStorage.setItem('jun_active_phase', activePhaseFilter);
  renderPhases();
  renderKanban();
}

let _blockRender = false;
function renderKanban() {
  if (_blockRender) return;
  const cols = {
    todo: [], hold: [], claimed: [], in_progress: [], review: [], done: []
  };

  const tasks = (state.tasks || []).filter(t => {
    if (activeRoleFilter !== 'all' && t.role !== activeRoleFilter) return false;
    if (activeProjectFilter !== 'all' && t.project !== activeProjectFilter) return false;
    if (activePhaseFilter !== 'all' && String(t.phase) !== String(activePhaseFilter)) return false;
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
        ${task.approval && task.approval.status === 'pending' ? '<span style="background:var(--accent-orange);color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;animation:chatBadgePulse 1.5s infinite">결재대기</span>' : ''}
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

  // Dragend (desktop)
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

  // Click — open task detail or bulk select
  board.addEventListener('click', (e) => {
    if (_isDragging) { _isDragging = false; return; } // Reset and skip this one click
    const card = e.target.closest('.task-card');
    if (!card) return;
    const taskId = card.dataset.id;
    if (!taskId) return;

    // Ctrl+click or bulk mode → toggle selection
    if (e.ctrlKey || e.metaKey || _bulkMode) {
      if (!_bulkMode) toggleBulkMode();
      toggleBulkSelect(taskId);
      card.style.outline = _bulkSelected.has(taskId) ? '2px solid var(--accent-blue)' : 'none';
      return;
    }

    openTaskDetail(taskId);
  });

  // --- Dragstart (desktop only) ---
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    _draggedTaskId = card.dataset.id;
    _isDragging = true;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _draggedTaskId);
  });

  // --- Android Touch Drag v4 (real drag-and-drop) ---
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    let _td = { id: null, active: false, timer: null, el: null, startX: 0, startY: 0, origRect: null, placeholder: null };

    function tdCleanup() {
      if (_td.el) {
        _td.el.style.position = '';
        _td.el.style.left = '';
        _td.el.style.top = '';
        _td.el.style.width = '';
        _td.el.style.zIndex = '';
        _td.el.style.opacity = '';
        _td.el.style.transform = '';
        _td.el.style.pointerEvents = '';
        _td.el.style.boxShadow = '';
        _td.el.style.transition = '';
      }
      if (_td.placeholder && _td.placeholder.parentNode) {
        _td.placeholder.remove();
      }
      document.querySelectorAll('.kanban-column').forEach(c => {
        c.style.outline = '';
        c.style.background = '';
      });
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      _td.el = null; _td.id = null; _td.active = false; _td.placeholder = null;
      _isDragging = false;
      _blockRender = false;
    }

    board.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      const t = e.touches[0];
      _td.startX = t.clientX;
      _td.startY = t.clientY;
      _td.el = card;
      _td.id = card.dataset.id;
      _td.active = false;

      _td.timer = setTimeout(() => {
        if (!_td.el) return;
        _td.active = true;
        _isDragging = true;
        _blockRender = true; // Prevent re-render during drag
        if (navigator.vibrate) navigator.vibrate(40);

        // Lock scroll
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.documentElement.style.overflow = 'hidden';

        // Save original position and size
        _td.origRect = card.getBoundingClientRect();

        // Create placeholder to keep space
        _td.placeholder = document.createElement('div');
        _td.placeholder.style.cssText = `height:${_td.origRect.height}px;border:2px dashed var(--accent-blue);border-radius:8px;opacity:0.3;`;
        card.parentNode.insertBefore(_td.placeholder, card);

        // Lift the card
        card.style.position = 'fixed';
        card.style.left = _td.origRect.left + 'px';
        card.style.top = _td.origRect.top + 'px';
        card.style.width = _td.origRect.width + 'px';
        card.style.zIndex = '5000';
        card.style.opacity = '0.92';
        card.style.transform = 'rotate(2deg) scale(1.05)';
        card.style.pointerEvents = 'none';
        card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
        card.style.transition = 'none';
      }, 400);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      // Cancel hold if moved before activation
      if (_td.timer && !_td.active) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - _td.startX) > 8 || Math.abs(t.clientY - _td.startY) > 8) {
          clearTimeout(_td.timer); _td.timer = null;
          _td.el = null; _td.id = null;
          return;
        }
      }
      if (!_td.active || !_td.el) return;
      e.preventDefault();

      const t = e.touches[0];
      const dx = t.clientX - _td.startX;
      const dy = t.clientY - _td.startY;
      _td.el.style.left = (_td.origRect.left + dx) + 'px';
      _td.el.style.top = (_td.origRect.top + dy) + 'px';

      // Highlight drop target
      _td.el.style.display = 'none';
      const under = document.elementFromPoint(t.clientX, t.clientY);
      _td.el.style.display = '';
      document.querySelectorAll('.kanban-column').forEach(c => {
        c.style.outline = '';
        c.style.background = '';
      });
      const col = under ? under.closest('.kanban-column') : null;
      if (col) {
        col.style.outline = '2px solid var(--accent-blue)';
        col.style.background = 'rgba(59,130,246,0.08)';
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (_td.timer) { clearTimeout(_td.timer); _td.timer = null; }
      if (!_td.active || !_td.el) {
        _td.el = null; _td.id = null;
        return;
      }

      const t = e.changedTouches[0];
      const taskId = _td.id;

      // Find drop target
      _td.el.style.display = 'none';
      const under = document.elementFromPoint(t.clientX, t.clientY);
      _td.el.style.display = '';

      const col = under ? under.closest('.kanban-column') : null;

      // Cleanup first
      tdCleanup();

      // Then move if valid target
      if (col && col.dataset.status && taskId) {
        moveTask(taskId, col.dataset.status);
      }
    });

    document.addEventListener('touchcancel', () => {
      if (_td.timer) { clearTimeout(_td.timer); _td.timer = null; }
      tdCleanup();
    });

    console.log('Jun.AI: Android touch drag v4 (real drag)');
  }

  console.log('Jun.AI: Drag-and-drop + click initialized');
})();

// Mobile: show status move modal on long-press
function showMobileMoveModal(taskId) {
  const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
  if (!task) return;

  const statuses = [
    { key: 'todo', label: '📋 To Do', color: '#64748b' },
    { key: 'hold', label: '⏸ Hold', color: '#8b5cf6' },
    { key: 'claimed', label: '👋 Claimed', color: '#f59e0b' },
    { key: 'in_progress', label: '🔄 In Progress', color: '#3b82f6' },
    { key: 'review', label: '🔍 Review', color: '#a855f7' },
    { key: 'done', label: '✅ Done', color: '#22c55e' }
  ];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:flex-end;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div style="width:100%;max-width:400px;background:var(--bg-secondary);border-radius:16px 16px 0 0;padding:20px;padding-bottom:max(20px,env(safe-area-inset-bottom))">
      <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px"></div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--text-primary)">${escapeHtml(task.title)}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">이동할 상태를 선택하세요</div>
      ${statuses.map(s => `
        <button onclick="moveTask('${taskId}','${s.key}');this.closest('div[style*=fixed]').remove()"
          style="display:block;width:100%;padding:14px;margin-bottom:8px;background:${s.key === task.status ? 'rgba(59,130,246,0.15)' : 'var(--bg-primary)'};color:var(--text-primary);border:1px solid ${s.key === task.status ? 'var(--accent-blue)' : 'var(--border)'};border-radius:10px;font-size:15px;text-align:left;cursor:pointer">
          ${s.label} ${s.key === task.status ? '← 현재' : ''}
        </button>
      `).join('')}
      <button onclick="this.closest('div[style*=fixed]').remove();openTaskDetail('${taskId}')"
        style="display:block;width:100%;padding:14px;margin-top:4px;background:none;color:var(--accent-blue);border:1px solid var(--accent-blue);border-radius:10px;font-size:14px;cursor:pointer">
        상세 보기
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

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

      ${task.approval && task.approval.status === 'pending' ? `
      <div style="margin:12px 0;padding:12px;background:rgba(249,175,79,0.1);border:1px solid var(--accent-orange);border-radius:8px">
        <div style="font-weight:600;color:var(--accent-orange);margin-bottom:8px">📋 결재 요청</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${escapeHtml(task.approval.summary || '')}</div>
        ${(task.approval.deliverables || []).map(d => `<div style="font-size:12px;color:var(--text-muted)">  📄 ${escapeHtml(d)}</div>`).join('')}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="approveTask('${taskId}')" style="flex:1;padding:8px;background:var(--accent-green,#91b362);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600">✅ 승인</button>
          <button onclick="rejectTask('${taskId}')" style="flex:1;padding:8px;background:var(--accent-red,#e74c3c);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600">❌ 반려</button>
        </div>
      </div>` : ''}
      ${task.approval && task.approval.status === 'approved' ? `
      <div style="margin:12px 0;padding:8px 12px;background:rgba(145,179,98,0.1);border-left:3px solid var(--accent-green,#91b362);border-radius:4px;font-size:12px;color:var(--accent-green,#91b362)">✅ 결재 승인됨 (${new Date(task.approval.respondedAt).toLocaleString('ko-KR')})</div>` : ''}
      ${task.approval && task.approval.status === 'rejected' ? `
      <div style="margin:12px 0;padding:8px 12px;background:rgba(231,76,60,0.1);border-left:3px solid var(--accent-red,#e74c3c);border-radius:4px;font-size:12px;color:var(--accent-red,#e74c3c)">❌ 결재 반려 — ${escapeHtml(task.approval.rejectReason || '')} (${new Date(task.approval.respondedAt).toLocaleString('ko-KR')})</div>` : ''}

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

async function approveTask(taskId) {
  await fetch('/api/tasks/' + taskId + '/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  document.querySelector('.task-modal-overlay')?.remove();
  fetchAndRender();
  showInfoNotification('결재', '승인되었습니다. 다음 단계로 진행합니다.');
}

async function rejectTask(taskId) {
  const reason = prompt('반려 사유를 입력하세요:');
  if (reason === null) return; // cancelled
  await fetch('/api/tasks/' + taskId + '/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || '사유 미기재' })
  });
  document.querySelector('.task-modal-overlay')?.remove();
  fetchAndRender();
  showInfoNotification('결재', '반려되었습니다. 재작업을 시작합니다.');
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

async function renderDocuments() {
  const list = document.getElementById('docList');
  const filterEl = document.getElementById('outputCategoryFilter');
  const categoryFilter = filterEl ? filterEl.value : 'all';

  const formatIcons = { py: '🐍', dart: '🎯', js: '📜', ts: '📜', docx: '📄', pptx: '📊', hwpx: '📝', xlsx: '📈', pdf: '📋', png: '🖼', jpg: '🖼', svg: '🖼', h5: '🧠', md: '📝', yaml: '⚙', json: '⚙' };
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

  // If specific project selected → scan actual files
  if (activeProjectFilter !== 'all') {
    try {
      const res = await fetch('/api/projects/' + activeProjectFilter + '/outputs');
      const data = await res.json();

      if (!data.files || data.files.length === 0) {
        // Check running agents
        const agents = state.agents || {};
        const running = Object.values(agents).filter(a => a.status === 'running');
        let statusMsg = running.length > 0
          ? `<div style="color:var(--accent-orange);text-align:center;padding:8px;font-size:12px;margin-top:8px"><span class="spinner" style="margin-right:4px"></span>${running.map(a=>a.name).join(', ')} 작업 중</div>`
          : '';
        list.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">산출물 없음${statusMsg}</div>`;
        return;
      }

      let files = data.files;
      if (categoryFilter !== 'all') {
        files = files.filter(f => f.category === categoryFilter);
      }

      // Stats
      const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
      const sizeStr = totalSize > 1048576 ? (totalSize / 1048576).toFixed(1) + ' MB' : (totalSize / 1024).toFixed(0) + ' KB';
      const fmtStats = Object.entries(data.formatCounts || {}).map(([f, c]) => `.${f}:${c}`).join(' | ');

      // Toolbar: Expand All / Collapse All
      let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(51,65,85,0.3)">
        <span style="font-size:11px;color:var(--text-muted)">총 ${data.totalFiles}개 파일 | ${sizeStr} | ${fmtStats}</span>
        <div style="display:flex;gap:4px">
          <button onclick="expandAllDirs()"
                  style="background:var(--bg-hover);color:var(--text-secondary);border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer">Expand All</button>
          <button onclick="collapseAllDirs()"
                  style="background:var(--bg-hover);color:var(--text-secondary);border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer">Collapse All</button>
        </div>
      </div>`;

      // Group by directory — default collapsed
      const groups = data.groups || {};
      let dirIdx = 0;
      Object.keys(groups).sort().forEach(dir => {
        const g = groups[dir];
        let dirFiles = g.files || [];
        if (categoryFilter !== 'all') {
          dirFiles = dirFiles.filter(f => f.category === categoryFilter);
        }
        if (dirFiles.length === 0) return;

        const dirId = 'outdir-' + (dirIdx++);
        const isOpen = _outputDirState[dir] === true;
        html += `<div style="margin-bottom:4px">`;
        html += `<div style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0" onclick="toggleOutputDir('${dirId}','${escapeHtml(dir)}')">
          <span id="tog-${dirId}" class="dir-toggle" style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;background:var(--bg-hover);border-radius:3px;font-size:11px;color:var(--text-secondary);font-weight:700;flex-shrink:0">${isOpen ? '−' : '+'}</span>
          <span style="font-size:12px;font-weight:500;color:var(--text-secondary)">📁 ${escapeHtml(dir)}</span>
          <span style="font-size:10px;color:var(--text-muted)">(${dirFiles.length})</span>
        </div>`;
        html += `<div id="${dirId}" class="output-dir-body" style="display:${isOpen ? 'block' : 'none'}">`;
        dirFiles.forEach(f => {
          const icon = formatIcons[f.format] || '📄';
          const cat = f.category || 'document';
          const catLabel = categoryLabels[cat] || cat;
          const catColor = categoryColors[cat] || 'var(--text-muted)';
          const fileName = f.path.split('/').pop();
          const fileSize = f.size > 1048576 ? (f.size/1048576).toFixed(1)+'MB' : f.size > 1024 ? (f.size/1024).toFixed(0)+'KB' : f.size+'B';
          const fileUrl = '/files/' + encodeURI(f.path);
          html += `<div style="display:flex;align-items:center;gap:6px;padding:2px 0 2px 24px;font-size:12px">
            <span>${icon}</span>
            <a href="${fileUrl}" target="_blank" style="flex:1;color:var(--text-primary);text-decoration:none" onclick="event.preventDefault();openFile('${fileUrl}','${escapeHtml(fileName)}')"
               onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-primary)'">${escapeHtml(fileName)}</a>
            <span style="color:var(--accent-green);font-size:9px">✅</span>
            <span style="color:${catColor};font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(100,116,139,0.1)">${catLabel}</span>
            <span style="color:var(--text-muted);font-size:10px">${fileSize}</span>
          </div>`;
        });
        html += `</div></div>`;
      });

      list.innerHTML = html;
      return;

    } catch (e) { /* fallback to event-based docs */ }
  }

  // All Projects view — show tabs per project
  const projects = (state.projects || []).filter(p => p.projectDir);
  if (projects.length === 0) {
    const agents = state.agents || {};
    const running = Object.values(agents).filter(a => a.status === 'running');
    let statusMsg = running.length > 0
      ? `<div style="color:var(--accent-orange);text-align:center;padding:8px;font-size:12px;margin-top:8px"><span class="spinner" style="margin-right:4px"></span>${running.map(a=>a.name).join(', ')} 작업 중</div>`
      : '';
    list.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">프로젝트에 디렉토리가 연결되지 않았습니다${statusMsg}</div>`;
    return;
  }

  // Tabs
  if (!window._activeOutputTab) window._activeOutputTab = projects[0].id;
  let tabsHtml = `<div style="display:flex;gap:4px;margin-bottom:8px;border-bottom:1px solid rgba(51,65,85,0.3);padding-bottom:8px;flex-wrap:wrap">`;
  projects.forEach(p => {
    const isActive = window._activeOutputTab === p.id;
    const style = isActive
      ? 'background:var(--accent-blue);color:white'
      : 'background:var(--bg-hover);color:var(--text-secondary)';
    tabsHtml += `<button onclick="window._activeOutputTab='${p.id}';renderDocuments()" style="${style};border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer">${escapeHtml(p.name)}</button>`;
  });
  tabsHtml += `</div>`;

  // Load selected project's files
  const selectedProject = projects.find(p => p.id === window._activeOutputTab) || projects[0];
  try {
    const res = await fetch('/api/projects/' + selectedProject.id + '/outputs');
    const data = await res.json();

    let files = data.files || [];
    if (categoryFilter !== 'all') {
      files = files.filter(f => f.category === categoryFilter);
    }

    const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
    const sizeStr = totalSize > 1048576 ? (totalSize / 1048576).toFixed(1) + ' MB' : (totalSize / 1024).toFixed(0) + ' KB';
    const fmtCounts = {};
    files.forEach(f => { fmtCounts[f.format] = (fmtCounts[f.format] || 0) + 1; });
    const fmtStats = Object.entries(fmtCounts).map(([f, c]) => `.${f}:${c}`).join(' | ');

    let html = tabsHtml;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(51,65,85,0.3)">
      <span style="font-size:11px;color:var(--text-muted)">${escapeHtml(selectedProject.name)}: ${files.length}개 파일 | ${sizeStr} | ${fmtStats}</span>
      <div style="display:flex;gap:4px">
        <button onclick="expandAllDirs()" style="background:var(--bg-hover);color:var(--text-secondary);border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer">Expand All</button>
        <button onclick="collapseAllDirs()" style="background:var(--bg-hover);color:var(--text-secondary);border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer">Collapse All</button>
      </div>
    </div>`;

    if (files.length === 0) {
      html += `<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">이 프로젝트에 산출물 없음</div>`;
      list.innerHTML = html;
      return;
    }

    const groups = data.groups || {};
    let dirIdx2 = 0;
    Object.keys(groups).sort().forEach(dir => {
      let dirFiles = (groups[dir].files || []);
      if (categoryFilter !== 'all') dirFiles = dirFiles.filter(f => f.category === categoryFilter);
      if (dirFiles.length === 0) return;

      const dirId = 'outdir-' + (dirIdx2++);
      const isOpen = _outputDirState[dir] === true;
      html += `<div style="margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0" onclick="toggleOutputDir('${dirId}','${escapeHtml(dir)}')">
          <span id="tog-${dirId}" class="dir-toggle" style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;background:var(--bg-hover);border-radius:3px;font-size:11px;color:var(--text-secondary);font-weight:700;flex-shrink:0">${isOpen ? '−' : '+'}</span>
          <span style="font-size:12px;font-weight:500;color:var(--text-secondary)">📁 ${escapeHtml(dir)}</span>
          <span style="font-size:10px;color:var(--text-muted)">(${dirFiles.length})</span>
        </div>
        <div id="${dirId}" class="output-dir-body" style="display:${isOpen ? 'block' : 'none'}">`;
      dirFiles.forEach(f => {
        const icon = formatIcons[f.format] || '📄';
        const cat = f.category || 'document';
        const catLabel = categoryLabels[cat] || cat;
        const catColor = categoryColors[cat] || 'var(--text-muted)';
        const fileName = f.path.split('/').pop();
        const fileSize = f.size > 1048576 ? (f.size/1048576).toFixed(1)+'MB' : f.size > 1024 ? (f.size/1024).toFixed(0)+'KB' : f.size+'B';
        const fileUrl = '/files/' + encodeURI(f.path);
        html += `<div style="display:flex;align-items:center;gap:6px;padding:2px 0 2px 24px;font-size:12px">
          <span>${icon}</span>
          <a href="${fileUrl}" target="_blank" style="flex:1;color:var(--text-primary);text-decoration:none" onclick="event.preventDefault();openFile('${fileUrl}','${escapeHtml(fileName)}')"
             onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-primary)'">${escapeHtml(fileName)}</a>
          <span style="color:var(--accent-green);font-size:9px">✅</span>
          <span style="color:${catColor};font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(100,116,139,0.1)">${catLabel}</span>
          <span style="color:var(--text-muted);font-size:10px">${fileSize}</span>
        </div>`;
      });
      html += `</div></div>`;
    });

    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = tabsHtml + `<div style="color:var(--text-muted);text-align:center;padding:16px">로드 실패</div>`;
  }
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

function showNewProjectModal() {
  document.getElementById('newProjectModal').style.display = 'flex';
  // Update telegram bot suggestion when project name changes
  const nameInput = document.getElementById('setupProjectName');
  const suggest = document.getElementById('telegramBotSuggestion');
  const updateSuggestion = () => {
    const n = nameInput.value.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    if (n) {
      suggest.textContent = `새 봇 추천 이름: @JunAI_${n}_bot`;
    } else {
      suggest.textContent = '';
    }
  };
  nameInput.addEventListener('input', updateSuggestion);
  updateSuggestion();

  // Load existing telegram tokens
  loadExistingTelegramTokens();
}

async function loadExistingTelegramTokens() {
  try {
    const res = await fetch('/api/telegram/detect');
    const tokens = await res.json();
    const sel = document.getElementById('setupTelegramExisting');
    sel.innerHTML = '<option value="">기존 토큰 선택...</option>';
    if (tokens.length === 0) {
      sel.innerHTML += '<option value="" disabled>감지된 토큰 없음</option>';
    }
    tokens.forEach(t => {
      sel.innerHTML += `<option value="${t.token}">${t.label} (${t.masked})</option>`;
    });
  } catch (e) {}
}

function onTelegramSelect(sel) {
  if (sel.value) {
    document.getElementById('setupTelegramToken').value = sel.value;
  }
}
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
  const telegramToken = document.getElementById('setupTelegramToken').value.trim();
  if (autoSession && autoSession.checked && data.project) {
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: name,
        projectId: data.project.id,
        ...(projectPath && { projectPath })
      })
    });
  }

  // Save telegram token if provided
  let telegramMsg = '';
  if (telegramToken && data.project) {
    const tgRes = await fetch('/api/telegram/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: data.project.id, token: telegramToken })
    });
    const tgData = await tgRes.json();
    telegramMsg = tgData.ok ? ' + Telegram 연동됨' : '';
  }
  document.getElementById('setupTelegramToken').value = '';

  // Show success banner
  const sessionMsg = (autoSession && autoSession.checked) ? ' + Claude 독립 세션 시작됨' : '';
  const banner = document.createElement('div');
  banner.className = 'setup-banner';
  banner.innerHTML = `
    <span class="text">✅ "${escapeHtml(name)}" 프로젝트 셋업 완료 — ${data.tasks ? data.tasks.length : 0}개 PDLC 태스크 생성됨 (${domain})${sessionMsg}${telegramMsg}</span>
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
  localStorage.setItem('jun_active_project', activeProjectFilter);
  renderKanban();
  renderDocuments();
  updateChatProject();
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

// --- Bulk Status Change ---
let _bulkSelected = new Set();
let _bulkMode = false;

function toggleBulkMode() {
  _bulkMode = !_bulkMode;
  _bulkSelected.clear();
  document.getElementById('bulkBar').style.display = _bulkMode ? 'flex' : 'none';
  renderKanban();
}

function toggleBulkSelect(taskId) {
  if (_bulkSelected.has(taskId)) {
    _bulkSelected.delete(taskId);
  } else {
    _bulkSelected.add(taskId);
  }
  document.getElementById('bulkCount').textContent = _bulkSelected.size + '개 선택';

  // Update checkbox visual
  const cb = document.getElementById('bulk-cb-' + taskId);
  if (cb) cb.checked = _bulkSelected.has(taskId);
}

async function bulkMove(newStatus) {
  if (_bulkSelected.size === 0) return;
  if (!confirm(`${_bulkSelected.size}개 태스크를 "${newStatus}"로 이동하시겠습니까?`)) return;

  for (const taskId of _bulkSelected) {
    await fetch('/api/tasks/' + taskId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  }

  showInfoNotification('일괄 이동', `${_bulkSelected.size}개 태스크 → ${newStatus}`);
  _bulkSelected.clear();
  _bulkMode = false;
  document.getElementById('bulkBar').style.display = 'none';
  fetchAndRender();
}

function bulkCancel() {
  _bulkSelected.clear();
  _bulkMode = false;
  document.getElementById('bulkBar').style.display = 'none';
  renderKanban();
}

// --- Agent Timeline Chart ---
function renderTimeline() {
  const container = document.getElementById('timelineChart');
  if (!container) return;

  const agents = state.agents || {};
  const entries = Object.values(agents);

  if (!entries.length) {
    container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">에이전트 활동 이력 없음</div>';
    return;
  }

  // Find time range
  const now = Date.now();
  let minTime = now;
  entries.forEach(a => {
    if (a.startedAt) {
      const t = new Date(a.startedAt).getTime();
      if (t < minTime) minTime = t;
    }
  });

  // Also check timeline events for historical data
  const timeline = state.timeline || [];
  timeline.forEach(e => {
    if (e.timestamp) {
      const t = new Date(e.timestamp).getTime();
      if (t < minTime) minTime = t;
    }
  });

  const totalRange = now - minTime;
  if (totalRange <= 0) {
    container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">타임라인 데이터 없음</div>';
    return;
  }

  // Build agent timeline bars
  // Group timeline events by agent
  const agentTimelines = {};
  timeline.forEach(e => {
    if (!e.agent) return;
    if (!agentTimelines[e.agent]) agentTimelines[e.agent] = [];
    agentTimelines[e.agent].push(e);
  });

  // Merge with current agent state
  entries.forEach(a => {
    if (!agentTimelines[a.name]) agentTimelines[a.name] = [];
  });

  let html = '';
  const sortedAgents = Object.keys(agentTimelines).sort();

  sortedAgents.forEach(name => {
    const events = agentTimelines[name];
    const agent = agents[name] || {};
    const startEvent = events.find(e => e.type === 'agent_start');
    const completeEvent = events.find(e => e.type === 'agent_complete');

    let barStart = 0, barWidth = 0, barClass = 'waiting', barLabel = '';

    if (agent.startedAt) {
      const start = new Date(agent.startedAt).getTime();
      const end = agent.completedAt ? new Date(agent.completedAt).getTime() : now;
      barStart = ((start - minTime) / totalRange) * 100;
      barWidth = ((end - start) / totalRange) * 100;
      barWidth = Math.max(barWidth, 1); // min 1%
      barClass = agent.status === 'completed' ? 'completed' : agent.status === 'running' ? 'running' : 'waiting';
      const duration = formatDuration(end - start);
      barLabel = `${agent.task || ''} (${duration})`;
    } else if (startEvent && startEvent.timestamp) {
      const start = new Date(startEvent.timestamp).getTime();
      const end = completeEvent ? new Date(completeEvent.timestamp).getTime() : now;
      barStart = ((start - minTime) / totalRange) * 100;
      barWidth = ((end - start) / totalRange) * 100;
      barWidth = Math.max(barWidth, 1);
      barClass = completeEvent ? 'completed' : 'running';
      barLabel = startEvent.task || '';
    }

    if (barWidth > 0) {
      html += `<div class="timeline-row">
        <span class="timeline-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <div class="timeline-bar-container">
          <div class="timeline-bar ${barClass}" style="left:${barStart}%;width:${barWidth}%" title="${escapeHtml(barLabel)}">${barWidth > 10 ? escapeHtml(barLabel) : ''}</div>
        </div>
      </div>`;
    }
  });

  // Time axis
  const startLabel = new Date(minTime).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
  const endLabel = new Date(now).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
  const midTime = minTime + totalRange / 2;
  const midLabel = new Date(midTime).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});

  html += `<div class="timeline-time-axis"><span>${startLabel}</span><span>${midLabel}</span><span>${endLabel}</span></div>`;

  container.innerHTML = html || '<div style="color:var(--text-muted);text-align:center;padding:16px">타임라인 없음</div>';
}

// --- Output Directory State (persisted in localStorage) ---
let _outputDirState = {};
try { _outputDirState = JSON.parse(localStorage.getItem('jun_output_dirs') || '{}'); } catch(e) {}

function toggleOutputDir(dirId, dirName) {
  const body = document.getElementById(dirId);
  const tog = document.getElementById('tog-' + dirId);
  if (!body) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (tog) tog.textContent = '−';
    _outputDirState[dirName] = true;
  } else {
    body.style.display = 'none';
    if (tog) tog.textContent = '+';
    _outputDirState[dirName] = false;
  }
  try { localStorage.setItem('jun_output_dirs', JSON.stringify(_outputDirState)); } catch(e) {}
}

function expandAllDirs() {
  document.querySelectorAll('.output-dir-body').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.dir-toggle').forEach(e => e.textContent = '−');
  // Save all as open
  document.querySelectorAll('.output-dir-body').forEach(e => {
    const dirName = e.previousElementSibling?.querySelector('[style*="font-weight:500"]')?.textContent?.replace('📁 ', '') || '';
    if (dirName) _outputDirState[dirName] = true;
  });
  try { localStorage.setItem('jun_output_dirs', JSON.stringify(_outputDirState)); } catch(e) {}
}

function collapseAllDirs() {
  document.querySelectorAll('.output-dir-body').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.dir-toggle').forEach(e => e.textContent = '+');
  _outputDirState = {};
  try { localStorage.setItem('jun_output_dirs', JSON.stringify(_outputDirState)); } catch(e) {}
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

// --- Project Chat ---
let _chatOpen = false;
let _chatPendingFiles = [];
// Restore pending state from localStorage
try {
  const saved = localStorage.getItem('jun_chat_pending');
  if (saved) {
    const p = JSON.parse(saved);
    _chatPendingFiles = p.files || [];
    _chatPendingText = p.text || null;
  }
} catch(e) {}

function saveChatPending() {
  try {
    localStorage.setItem('jun_chat_pending', JSON.stringify({
      files: _chatPendingFiles,
      text: _chatPendingText
    }));
  } catch(e) {}
}

function toggleChat() {
  _chatOpen = !_chatOpen;
  const panel = document.getElementById('chatPanel');
  panel.style.display = _chatOpen ? 'flex' : 'none';
  if (_chatOpen) {
    stopChatBlink();
    loadChatHistory();
    updateChatConnStatus();
    // Restore input + attachments
    const input = document.getElementById('chatInput');
    const savedInput = localStorage.getItem('jun_chat_input');
    if (input && savedInput) { input.value = savedInput; autoResizeChatInput(input); }
    if (_chatPendingFiles.length || _chatPendingText) updateChatPreview();
  }
}

async function updateChatConnStatus() {
  const el = document.getElementById('chatConnStatus');
  if (!el) return;
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    const hasClaude = sessions.some(s => s.command === 'claude');
    if (hasClaude) {
      el.textContent = '● Connected';
      el.style.color = 'var(--accent-green)';
      el.style.background = 'rgba(34,197,94,0.1)';
    } else {
      el.textContent = '● Disconnected';
      el.style.color = 'var(--accent-red)';
      el.style.background = 'rgba(239,68,68,0.1)';
    }
  } catch (e) {
    el.textContent = '● Disconnected';
    el.style.color = 'var(--accent-red)';
    el.style.background = 'rgba(239,68,68,0.1)';
  }
}

// Refresh connection status every 5s when chat is open
setInterval(() => { if (_chatOpen) updateChatConnStatus(); }, 5000);

let _activeChatProject = null;

async function loadChatHistory() {
  const projects = state.projects || [];
  const nameEl = document.getElementById('chatProjectName');
  const msgContainer = document.getElementById('chatMessages');

  // Determine active chat project
  if (activeProjectFilter !== 'all') {
    _activeChatProject = activeProjectFilter;
  } else if (!_activeChatProject && projects.length > 0) {
    _activeChatProject = projects[0].id;
  }

  // Build project tabs if multiple projects
  let tabsHtml = '';
  if (projects.length > 1) {
    tabsHtml = '<div style="display:flex;gap:4px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(51,65,85,0.3);flex-wrap:wrap">';
    projects.forEach(p => {
      const isActive = _activeChatProject === p.id;
      const style = isActive ? 'background:var(--accent-blue);color:white' : 'background:var(--bg-hover);color:var(--text-secondary)';
      tabsHtml += `<button onclick="_activeChatProject='${p.id}';loadChatHistory()" style="${style};border:none;border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer">${escapeHtml(p.name)}</button>`;
    });
    tabsHtml += '</div>';
  }

  const project = projects.find(p => p.id === _activeChatProject);
  const sessionStatus = project && project.sessionName ? `(${project.sessionName})` : '';
  nameEl.textContent = project ? `${project.name} — project-director ${sessionStatus}` : 'project-director';

  try {
    const res = await fetch('/api/chat/' + _activeChatProject);
    const messages = await res.json();
    renderChatMessages(messages, tabsHtml);
  } catch (e) {
    msgContainer.innerHTML = tabsHtml + '<div style="color:var(--text-muted);text-align:center;padding:16px">채팅 로드 실패</div>';
  }
}

function renderChatMessages(messages, tabsHtml) {
  const container = document.getElementById('chatMessages');
  const prefix = tabsHtml || '';

  if (!messages.length) {
    container.innerHTML = prefix + '<div style="color:var(--text-muted);text-align:center;padding:32px;font-size:13px">팀장 에이전트에게 메시지를 보내세요</div>';
    return;
  }

  // Check if last message is from user (awaiting response)
  const lastMsg = messages[messages.length - 1];
  const awaitingResponse = lastMsg && lastMsg.from === 'user';
  const typingEl = document.getElementById('chatTyping');
  if (typingEl) {
    if (awaitingResponse) {
      typingEl.style.display = 'block';
      typingEl.innerHTML = '<span class="spinner" style="margin-right:4px"></span>에이전트 응답 대기 중...';
    } else {
      typingEl.style.display = 'none';
    }
  }

  container.innerHTML = prefix + messages.map(m => {
    const isUser = m.from === 'user';
    const align = isUser ? 'flex-end' : 'flex-start';
    const bg = isUser ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)';
    const borderColor = isUser ? 'var(--accent-blue)' : 'var(--border)';
    const nameColor = isUser ? 'var(--accent-blue)' : 'var(--accent-green)';
    const time = new Date(m.timestamp).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' });

    let content = '';
    if (m.type === 'image' && m.fileUrl) {
      content = `<img src="${m.fileUrl}" style="max-width:200px;border-radius:6px;margin-top:4px;cursor:pointer" onclick="window.open('${m.fileUrl}','_blank')" />`;
      if (m.message) content = `<div style="font-size:13px;margin-bottom:4px">${escapeHtml(m.message)}</div>` + content;
    } else if (m.type === 'file' && m.fileUrl) {
      content = `<a href="${m.fileUrl}" target="_blank" style="color:var(--accent-blue);font-size:12px">📎 ${escapeHtml(m.fileName || 'file')}</a>`;
      if (m.message) content = `<div style="font-size:13px;margin-bottom:4px">${escapeHtml(m.message)}</div>` + content;
    } else {
      const msgText = m.message || '';
      const msgId = 'msg-' + m.id;
      if (msgText.length > 500) {
        content = `<div style="font-size:13px;white-space:pre-wrap;word-break:break-word">
          <div id="${msgId}-short">${escapeHtml(msgText.substring(0, 300))}...<br>
            <button onclick="document.getElementById('${msgId}-short').style.display='none';document.getElementById('${msgId}-full').style.display='block'" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:11px;padding:2px 0;margin-top:4px">▼ 더보기 (${msgText.length.toLocaleString()}자)</button>
          </div>
          <div id="${msgId}-full" style="display:none">${escapeHtml(msgText)}<br>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button onclick="document.getElementById('${msgId}-full').style.display='none';document.getElementById('${msgId}-short').style.display='block'" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:11px;padding:2px 0">▲ 접기</button>
              <button onclick="editChatMessage('${msgId}',this)" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;padding:2px 0">✏ 편집</button>
              <button onclick="navigator.clipboard.writeText(document.getElementById('${msgId}-text').innerText)" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;padding:2px 0">📋 복사</button>
            </div>
          </div>
        </div>`;
      } else {
        content = `<div style="font-size:13px;white-space:pre-wrap;word-break:break-word">${escapeHtml(msgText)}</div>`;
      }
    }

    return `<div style="display:flex;justify-content:${align};margin-bottom:8px">
      <div style="max-width:85%;background:${bg};border-left:3px solid ${borderColor};padding:8px 12px;border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:11px;font-weight:600;color:${nameColor}">${escapeHtml(m.from)}</span>
          <span style="font-size:10px;color:var(--text-muted);margin-left:12px">${time}</span>
        </div>
        ${content}
      </div>
    </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  const pid = _activeChatProject || (state.projects && state.projects[0] ? state.projects[0].id : '1');

  if (!msg && !_chatPendingFiles.length && !_chatPendingText) return;

  // Combine input text + pending text
  let fullMessage = '';
  if (_chatPendingText && msg) {
    fullMessage = _chatPendingText + '\n\n' + msg;
  } else if (_chatPendingText) {
    fullMessage = _chatPendingText;
  } else {
    fullMessage = msg;
  }

  // Show typing indicator
  const typingEl = document.getElementById('chatTyping');
  if (typingEl) typingEl.style.display = 'block';

  try {
    if (_chatPendingFiles.length > 0) {
      // Upload and send each file
      for (let i = 0; i < _chatPendingFiles.length; i++) {
        const pf = _chatPendingFiles[i];
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pf)
        });
        const uploadData = await uploadRes.json();
        if (uploadData.ok) {
          // First file carries the full message, rest are file-only
          const fileMsg = i === 0 ? fullMessage : '';
          await fetch('/api/chat/' + pid, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'user',
              message: fileMsg,
              type: pf.type === 'image' ? 'image' : 'file',
              fileName: pf.fileName,
              fileUrl: uploadData.url
            })
          });
        }
      }
      // If there was text but no message sent yet (all files failed)
      _chatPendingFiles = [];
      _chatPendingText = null;
      updateChatPreview();
    } else {
      await fetch('/api/chat/' + pid, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'user', message: fullMessage })
      });
      _chatPendingText = null;
      updateChatPreview();
    }

    input.value = '';
    localStorage.removeItem('jun_chat_pending');
    localStorage.removeItem('jun_chat_input');
    await loadChatHistory();

    // Show "waiting for response" after send
    if (typingEl) {
      typingEl.innerHTML = '<span class="spinner" style="margin-right:4px"></span>에이전트 응답 대기 중...';
      // Auto-hide after 30s if no response
      setTimeout(() => { if (typingEl) typingEl.style.display = 'none'; }, 30000);
    }
  } catch (e) {
    showInfoNotification('전송 실패', '메시지 전송에 실패했습니다. 연결 상태를 확인하세요.');
    if (typingEl) typingEl.style.display = 'none';
  }
}

// Chat input keydown: Enter=send, Shift+Enter=newline
function handleChatKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

// Auto-resize textarea + save input
function autoResizeChatInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  try { localStorage.setItem('jun_chat_input', el.value); } catch(e) {}
}

// Paste: image or large text
function handleChatPaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;

  // Check for image
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        const idx = _chatPendingFiles.filter(f => f.type === 'image').length + 1;
        _chatPendingFiles.push({ data: e.target.result, fileName: `screenshot-${idx}.png`, type: 'image' });
        updateChatPreview();
      };
      reader.readAsDataURL(file);
      return;
    }
  }

  // Check for large text paste
  const text = event.clipboardData?.getData('text/plain');
  if (text && text.length > 200) {
    event.preventDefault();
    // Store as pending attachment (don't put in input)
    _chatPendingText = text;
    updateChatPreview();
  }
}

// Pending attachments (restored from localStorage above)
let _chatPendingText = null;
try { const s = localStorage.getItem('jun_chat_pending'); if (s) _chatPendingText = JSON.parse(s).text || null; } catch(e) {}

function updateChatPreview() {
  const preview = document.getElementById('chatPreview');
  if (!_chatPendingFiles.length && !_chatPendingText) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    return;
  }

  preview.style.display = 'block';
  let html = '<div style="display:flex;flex-direction:column;gap:6px">';

  // Text attachment
  if (_chatPendingText) {
    const lines = _chatPendingText.split('\n').length;
    const chars = _chatPendingText.length;
    html += `<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--accent-blue);font-weight:600">📋 텍스트 (${chars.toLocaleString()}자, ${lines}줄)</span>
        <button onclick="_chatPendingText=null;updateChatPreview()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button>
      </div>
      <div style="max-height:60px;overflow-y:auto;font-size:11px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.4;background:var(--bg-primary);padding:6px;border-radius:4px">${escapeHtml(_chatPendingText.substring(0, 500))}${_chatPendingText.length > 500 ? '\n...' : ''}</div>
    </div>`;
  }

  // File/image attachments — multiple
  if (_chatPendingFiles.length > 0) {
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    _chatPendingFiles.forEach((pf, idx) => {
      if (pf.type === 'image') {
        html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border)">
          <img src="${pf.data}" style="max-height:40px;border-radius:4px" />
          <span style="font-size:10px;color:var(--text-secondary)">${escapeHtml(pf.fileName)}</span>
          <button onclick="_chatPendingFiles.splice(${idx},1);updateChatPreview()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px">✕</button>
        </div>`;
      } else {
        html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border)">
          <span>📎</span>
          <span style="font-size:10px;color:var(--text-secondary)">${escapeHtml(pf.fileName)}</span>
          <button onclick="_chatPendingFiles.splice(${idx},1);updateChatPreview()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px">✕</button>
        </div>`;
      }
    });
    html += `</div>`;
    if (_chatPendingFiles.length > 1) {
      html += `<div style="font-size:10px;color:var(--text-muted)">${_chatPendingFiles.length}개 첨부 | <button onclick="_chatPendingFiles=[];updateChatPreview()" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:10px">전체 삭제</button></div>`;
    }
  }

  html += '</div>';
  preview.innerHTML = html;
  saveChatPending();
}

// Drag & drop file(s) to chat input area
function handleChatDrop(event) {
  const files = event.dataTransfer?.files;
  if (!files || !files.length) return;
  // Support multiple files
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    reader.onload = (e) => {
      _chatPendingFiles.push({ data: e.target.result, fileName: file.name, type: isImage ? 'image' : 'file' });
      updateChatPreview();
    };
    reader.readAsDataURL(file);
  });
}

// File input handler
function handleChatFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  const isImage = file.type.startsWith('image/');
  reader.onload = (e) => {
    _chatPendingFiles.push({ data: e.target.result, fileName: file.name, type: isImage ? 'image' : 'file' });
    updateChatPreview();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

// --- Chat Notification Sound ---
let _chatNotifAudio = null;
function playChatNotifSound() {
  if (!_chatNotifAudio) {
    // Generate a pleasant notification tone using Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = () => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(830, ctx.currentTime);
        osc1.frequency.setValueAtTime(990, ctx.currentTime + 0.1);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(630, ctx.currentTime + 0.15);
        osc2.frequency.setValueAtTime(830, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
        osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime + 0.15); osc2.stop(ctx.currentTime + 0.4);
      };
      _chatNotifAudio = play;
      play();
    } catch(e) {}
  } else {
    _chatNotifAudio();
  }
}

let _chatBlinkInterval = null;
let _chatUnreadCount = 0;

function startChatBlink() {
  const btn = document.getElementById('chatToggle');
  if (!btn || _chatBlinkInterval) return;
  _chatUnreadCount++;
  btn.setAttribute('data-unread', _chatUnreadCount);
  _chatBlinkInterval = setInterval(() => {
    btn.style.transform = btn.style.transform === 'scale(1.2)' ? 'scale(1)' : 'scale(1.2)';
    btn.style.background = btn.style.background === 'var(--accent-red, #e74c3c)' ? 'var(--accent-blue)' : 'var(--accent-red, #e74c3c)';
  }, 500);
}

function stopChatBlink() {
  const btn = document.getElementById('chatToggle');
  if (_chatBlinkInterval) { clearInterval(_chatBlinkInterval); _chatBlinkInterval = null; }
  if (btn) {
    btn.style.transform = 'scale(1)';
    btn.style.background = 'var(--accent-blue)';
    btn.removeAttribute('data-unread');
  }
  _chatUnreadCount = 0;
}

// WebSocket: listen for chat messages
function handleChatWS(msg) {
  if (msg.type !== 'chat_message') return;
  const isAgentResponse = msg.data && msg.data.message && msg.data.message.from !== 'user';

  if (_chatOpen) {
    // Chat is open → update messages + hide typing
    const typingEl = document.getElementById('chatTyping');
    if (typingEl && isAgentResponse) {
      typingEl.style.display = 'none';
    }
    loadChatHistory();
  } else if (isAgentResponse) {
    // Chat is closed + agent responded → blink + sound
    startChatBlink();
    playChatNotifSound();
  }
}

// Update chat when project changes
function updateChatProject() {
  if (_chatOpen) loadChatHistory();
}

// --- Mobile View Switching ---
function switchMobileView(view) {
  document.body.classList.remove('mob-view-kanban', 'mob-view-terminal', 'mob-view-agents', 'mob-view-docs');
  document.body.classList.add('mob-view-' + view);
  document.querySelectorAll('.mob-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });
  if (view === 'terminal' && typeof fitAddon !== 'undefined' && fitAddon) {
    setTimeout(() => fitAddon.fit(), 100);
  }
}

// Auto-detect mobile
if (window.innerWidth <= 768) {
  switchMobileView('kanban');
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

// --- Interactive Terminal (xterm.js) ---
let term = null;
let termWs = null;
let fitAddon = null;
let termExpanded = false;

function initTerminal() {
  if (term) return;
  const container = document.getElementById('terminalContainer');
  term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    theme: {
      background: '#0a0e14',
      foreground: '#b3b1ad',
      cursor: '#e6b450',
      selectionBackground: '#253340',
      black: '#01060e', red: '#ea6c73', green: '#91b362', yellow: '#f9af4f',
      blue: '#53bdfa', magenta: '#fae994', cyan: '#90e1c6', white: '#c7c7c7',
    },
    scrollback: 5000,
    convertEol: true,
  });
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  try { term.loadAddon(new WebLinksAddon.WebLinksAddon()); } catch(e) {}
  term.open(container);
  fitAddon.fit();
  term.writeln('\x1b[90m  Select a session to connect...\x1b[0m');

  // Auto-fit on resize
  window.addEventListener('resize', () => { if (fitAddon) fitAddon.fit(); });
  new ResizeObserver(() => { if (fitAddon) fitAddon.fit(); }).observe(container);
}

function connectTerminal() {
  const sel = document.getElementById('terminalSessionSelect');
  const sessionName = sel.value;
  const statusEl = document.getElementById('terminalStatus');
  if (!sessionName) { disconnectTerminal(); return; }

  // Initialize terminal if needed
  initTerminal();

  // Disconnect previous
  if (termWs) { termWs.close(); termWs = null; }
  term.clear();
  term.writeln(`\x1b[90m  Connecting to ${sessionName}...\x1b[0m`);
  statusEl.textContent = 'connecting...';
  statusEl.style.color = 'var(--accent-orange)';

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  termWs = new WebSocket(`${protocol}//${location.host}/ws/terminal?session=${encodeURIComponent(sessionName)}`);

  termWs.onopen = () => {
    statusEl.textContent = '● connected';
    statusEl.style.color = 'var(--accent-green, #91b362)';
    term.clear();
    fitAddon.fit();
    // Send initial size
    termWs.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    // Focus terminal
    term.focus();
  };

  termWs.onmessage = (e) => {
    term.write(e.data);
  };

  termWs.onclose = () => {
    statusEl.textContent = '○ disconnected';
    statusEl.style.color = 'var(--text-muted)';
    term.writeln('\r\n\x1b[90m  Session disconnected.\x1b[0m');
    termWs = null;
  };

  termWs.onerror = () => {
    statusEl.textContent = '✕ error';
    statusEl.style.color = 'var(--accent-red, #ea6c73)';
  };

  // Send terminal input to WebSocket
  term.onData((data) => {
    if (termWs && termWs.readyState === WebSocket.OPEN) {
      termWs.send(data);
    }
  });

  // Send resize events
  term.onResize(({ cols, rows }) => {
    if (termWs && termWs.readyState === WebSocket.OPEN) {
      termWs.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  });
}

function disconnectTerminal() {
  if (termWs) { termWs.close(); termWs = null; }
  if (term) { term.clear(); term.writeln('\x1b[90m  Select a session to connect...\x1b[0m'); }
  const statusEl = document.getElementById('terminalStatus');
  if (statusEl) { statusEl.textContent = ''; }
  const sel = document.getElementById('terminalSessionSelect');
  if (sel) sel.value = '';
}

function toggleTerminalExpand() {
  const container = document.getElementById('terminalContainer');
  const panel = document.getElementById('terminalPanel');
  const btn = document.getElementById('terminalExpandBtn');
  termExpanded = !termExpanded;

  if (termExpanded) {
    const isMobile = window.innerWidth <= 768;
    const gap = isMobile ? '4px' : '16px';
    const topGap = isMobile ? '50px' : '60px';
    panel.style.position = 'fixed';
    panel.style.top = topGap;
    panel.style.left = gap;
    panel.style.right = gap;
    panel.style.bottom = gap;
    panel.style.zIndex = '999';
    panel.style.margin = '0';
    container.style.height = 'calc(100% - 40px)';
    btn.textContent = '⛶';
    btn.title = 'Shrink';
  } else {
    panel.style.position = '';
    panel.style.top = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.zIndex = '';
    panel.style.margin = '';
    container.style.height = '350px';
    btn.textContent = '⛶';
    btn.title = 'Expand';
  }

  if (fitAddon) setTimeout(() => fitAddon.fit(), 100);
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
