// TaskForce.AI — Dashboard Client
let ws = null;
let state = { tasks: [], agents: {}, phases: [], documents: [], stats: {}, phaseProgress: 0 };
let activeRoleFilter = 'all';

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
    }
  };
}

// --- Render ---
function render() {
  renderStats();
  renderPhases();
  renderKanban();
  renderAgents();
  renderDocuments();
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
    todo: [], claimed: [], in_progress: [], review: [], done: []
  };

  const tasks = (state.tasks || []).filter(t => {
    if (activeRoleFilter === 'all') return true;
    return t.role === activeRoleFilter;
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
    const progressClass = a.status === 'completed' ? 'completed' : 'running';
    return `
      <div class="agent-row">
        <span class="agent-name">${a.name}</span>
        <span>${a.task || a.waitingFor || ''}</span>
        <span class="agent-status-badge ${statusClass}">${a.status}</span>
        <div class="progress-bar">
          <div class="progress-fill ${progressClass}" style="width:${a.progress || 0}%"></div>
        </div>
        <span style="color:var(--text-muted);font-size:12px">${a.message || ''}</span>
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

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, role, status: 'todo' })
  });

  document.getElementById('newTaskTitle').value = '';
  hideNewTaskModal();
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
