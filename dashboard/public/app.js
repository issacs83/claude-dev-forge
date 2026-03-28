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
    `<div class="phase-block ${p.status}" data-name="${phaseNames[i] || p.name}">
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

    // Bind drop events on column body
    container.ondragover = (e) => { e.preventDefault(); container.classList.add('drag-over'); };
    container.ondragleave = () => { container.classList.remove('drag-over'); };
    container.ondrop = (e) => { e.preventDefault(); container.classList.remove('drag-over'); onDrop(e, status); };
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
  } else if (task.status === 'done' && task.agent) {
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
    <div class="task-card ${isWorking ? 'working' : ''}" data-id="${task.id}" draggable="true"
         ondragstart="onDragStart(event)" onclick="onCardClick('${task.id}')">
      <div class="card-top">
        <span class="card-title">${escapeHtml(task.title)}</span>
        <span class="priority-badge ${priorityClass}">${capitalize(task.priority || 'medium')}</span>
      </div>
      <span class="role-badge ${roleClass}">${assignee || task.role || 'unassigned'}</span>
      ${timeInfo}
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

// --- Drag & Drop ---
function onDragStart(event) {
  event.dataTransfer.setData('text/plain', event.target.dataset.id);
  event.target.classList.add('dragging');
}

function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drop-target');
}

function onDragLeave(event) {
  event.currentTarget.classList.remove('drop-target');
}

function onDrop(event, newStatus) {
  event.preventDefault();
  event.currentTarget.classList.remove('drop-target');
  const taskId = event.dataTransfer.getData('text/plain');
  if (!taskId) return;
  moveTask(taskId, newStatus);
}

function moveTask(taskId, newStatus) {
  fetch('/api/tasks/' + taskId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(r => r.json())
  .then(task => {
    if (newStatus === 'in_progress' && task.assignee) {
      showAgentDispatch(task);
    }
    fetchAndRender();
  });
}

// --- Card Click (status change modal) ---
function onCardClick(taskId) {
  const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
  if (!task) return;

  const modal = document.createElement('div');
  modal.className = 'task-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const statuses = ['todo', 'in_progress', 'done'];
  const agents = ['web-developer', 'ai-trainer', 'algorithm-researcher', 'e2e-tester',
                  'ux-designer', 'cuda-engineer', 'security-reviewer', 'tdd-guide',
                  'doc-manager', 'inference-optimizer'];

  modal.innerHTML = `
    <div class="task-modal">
      <h3>${escapeHtml(task.title)}</h3>
      <div style="margin:12px 0">
        <label>Status:</label>
        <div class="status-buttons">
          ${statuses.map(s => `
            <button class="status-btn ${s === task.status ? 'active' : ''}"
                    onclick="updateTaskStatus('${taskId}', '${s}', this)">${s === 'todo' ? '📋 Todo' : s === 'in_progress' ? '🔄 In Progress' : '✅ Done'}</button>
          `).join('')}
        </div>
      </div>
      <div style="margin:12px 0">
        <label>Assign Agent:</label>
        <select id="agentSelect" onchange="assignAgent('${taskId}', this.value)">
          <option value="">-- select --</option>
          ${agents.map(a => `<option value="${a}" ${a === (task.assignee || task.agent) ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <button class="close-btn" onclick="this.closest('.task-modal-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
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
  const docs = state.documents || [];

  if (!docs.length) {
    list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">No documents yet</div>';
    return;
  }

  const formatIcons = { docx: '📄', pptx: '📊', hwpx: '📝', xlsx: '📈', pdf: '📋' };

  list.innerHTML = docs.map(d => `
    <div class="doc-row">
      <span class="doc-icon">${formatIcons[d.format] || '📄'}</span>
      <span>${d.file}</span>
      <span class="doc-phase">Phase ${d.phase}</span>
      <span>.${d.format}</span>
      <span style="color:var(--text-muted)">${formatTime(d.createdAt)}</span>
    </div>
  `).join('');
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

  // Show success banner
  const banner = document.createElement('div');
  banner.className = 'setup-banner';
  banner.innerHTML = `
    <span class="text">✅ "${escapeHtml(name)}" 프로젝트 셋업 완료 — ${data.tasks ? data.tasks.length : 0}개 PDLC 태스크 생성됨 (${domain})</span>
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

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function getElapsedTime(startedAt) {
  if (!startedAt) return '--:--';
  const diff = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function estimateRemaining(startedAt, progress) {
  if (!startedAt || !progress || progress <= 0) return '--:--';
  if (progress >= 100) return '0s';
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const totalEstimate = elapsed / (progress / 100);
  const remaining = totalEstimate - elapsed;
  const secs = Math.max(0, Math.floor(remaining / 1000));
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
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

// --- Init ---
connect();

// Fetch initial state via REST as fallback
function fetchAndRender() {
  fetch('/api/status')
    .then(r => r.json())
    .then(data => { state = data; render(); })
    .catch(() => {});
}

fetchAndRender();

// Auto-refresh every 5 seconds
setInterval(fetchAndRender, 5000);
