/**
 * StateManager — tracks projects, agents, tasks, phases, documents, comments, and timeline
 */
class StateManager {
  constructor() {
    this.projects = [];
    this.projectIdCounter = 0;
    this.tasks = [];
    this.agents = {};
    this.phases = this._initPhases();
    this.documents = [];
    this.timeline = [];
    this.debugLoops = [];
    this.taskIdCounter = 0;
    this.commentIdCounter = 0;
    this.comments = {}; // taskId → [comments]
    this.taskHistory = {}; // taskId → [history entries]
    this.notifications = []; // [{id, type, title, message, timestamp, read}]
    this.activityLog = []; // [{id, timestamp, actor, action, resource, details, source}]
    this.orgChart = {}; // agentName → { reportsTo, level, department, title }
  }

  _initPhases() {
    const phaseNames = [
      'Prior Research', 'VOC', 'Market Research',
      'Planning & Design', 'Detailed Planning', 'Architecture',
      'Part Design', 'Detailed Design', 'Implementation',
      'Testing', 'Verification', 'Evaluation'
    ];
    return phaseNames.map((name, i) => ({
      id: i,
      name,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      gateConditions: []
    }));
  }

  // --- Event Processing ---
  processEvent(event) {
    this.timeline.push(event);

    switch (event.type) {
      case 'agent_start':
        // Block agent_start if the task is already done or approved
        const taskForAgent = this.tasks.find(t =>
          t.agent === event.agent && (t.title === event.task || t.phase === event.phase)
        );
        if (taskForAgent && (taskForAgent.status === 'done' || (taskForAgent.approval && taskForAgent.approval.status === 'approved'))) {
          // Task already done — ignore this agent_start to prevent re-triggering
          break;
        }

        const existingSkills = this.agents[event.agent] ? this.agents[event.agent].skills : undefined;
        this.agents[event.agent] = {
          name: event.agent,
          status: 'running',
          phase: event.phase,
          task: event.task || '',
          progress: 0,
          startedAt: event.timestamp,
          message: event.message || '',
          skills: event.skills || existingSkills || []
        };
        if (event.phase !== undefined && this.phases[event.phase]) {
          this.phases[event.phase].status = 'in_progress';
          if (!this.phases[event.phase].startedAt) {
            this.phases[event.phase].startedAt = event.timestamp;
          }
        }
        break;

      case 'agent_progress':
        if (this.agents[event.agent]) {
          this.agents[event.agent].progress = event.progress || 0;
          this.agents[event.agent].message = event.message || '';
        }
        break;

      case 'agent_complete':
        if (this.agents[event.agent]) {
          this.agents[event.agent].status = 'completed';
          this.agents[event.agent].progress = 100;
          this.agents[event.agent].completedAt = event.timestamp;
          this.agents[event.agent].duration = event.duration_minutes;
          if (event.output_files) {
            this.agents[event.agent].outputFiles = event.output_files;
          }
          // Approval Gate: move to hold (pending approval), NOT auto-done
          this.tasks.forEach(t => {
            if (t.agent === event.agent && t.status === 'in_progress') {
              t.status = 'hold';
              t._pendingApproval = true;
              t.holdReason = '에이전트 작업 완료 — 결재 대기';
              t.updatedAt = event.timestamp || new Date().toISOString();
              this._addHistory(t.id, 'status_change', `in_progress → hold (${event.agent} 완료, 결재 대기)`);
            }
          });
        }
        break;

      case 'agent_waiting':
        if (!this.agents[event.agent]) {
          this.agents[event.agent] = { name: event.agent };
        }
        this.agents[event.agent].status = 'waiting';
        this.agents[event.agent].waitingFor = event.waiting_for || '';
        break;

      case 'phase_complete':
        if (this.phases[event.phase]) {
          this.phases[event.phase].status = 'completed';
          this.phases[event.phase].completedAt = event.timestamp;
          // Approval Gate: phase_complete moves remaining tasks to hold, NOT auto-done
          this.tasks.forEach(t => {
            if (t.phase === event.phase && t.status !== 'done' && t.status !== 'hold') {
              const oldStatus = t.status;
              t.status = 'hold';
              t._pendingApproval = true;
              t.holdReason = 'Phase 완료 — 결재 대기';
              t.updatedAt = event.timestamp || new Date().toISOString();
              this._addHistory(t.id, 'status_change', `${oldStatus} → hold (Phase 완료, 결재 대기)`);
            }
          });
        }
        break;

      case 'document_created':
        // Only add if file field exists
        if (event.file) {
          this.documents.push({
            file: event.file,
            format: event.format || event.file.split('.').pop() || 'unknown',
            phase: event.phase,
            project: event.project || null,
            taskId: event.taskId || null,
            category: event.category || this._inferCategory(event.format, event.file),
            verified: false, // will be verified when file actually exists
            createdAt: event.timestamp
          });
        }
        break;

      case 'debug_loop':
        this.debugLoops.push({
          loopNumber: event.loop_number,
          reason: event.reason,
          action: event.action,
          timestamp: event.timestamp,
          status: event.status || 'in_progress'
        });
        break;
    }
  }

  // --- Project Management ---
  createProject(data) {
    const project = {
      id: String(++this.projectIdCounter),
      name: data.name || '',
      description: data.description || '',
      domain: data.domain || 'general',
      status: data.status || 'active',
      createdAt: new Date().toISOString()
    };
    this.projects.push(project);
    return project;
  }

  updateProject(id, updates) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return null;
    Object.assign(project, updates);
    return project;
  }

  deleteProject(id) {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const project = this.projects[idx];
    this.projects.splice(idx, 1);
    // Remove associated tasks, comments, history
    const taskIds = this.tasks.filter(t => t.project === id).map(t => t.id);
    this.tasks = this.tasks.filter(t => t.project !== id);
    taskIds.forEach(tid => {
      delete this.comments[tid];
      delete this.taskHistory[tid];
    });
    return project;
  }

  getProjects() { return this.projects; }

  // --- Task Management ---
  createTask(data) {
    const task = {
      id: String(++this.taskIdCounter),
      title: data.title || '',
      description: data.description || '',
      objective: data.objective || '',
      dependencies: data.dependencies || [], // [taskId] — must complete before this
      blockedBy: [],  // auto-computed
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      role: data.role || 'general',
      agent: data.agent || '',
      phase: data.phase,
      project: data.project || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: 0,
      // Status transition metadata
      holdReason: null,       // reason for moving to hold
      reviewNote: null,       // note when moving to review
      deliverables: [],       // list of output files linked at review time
      claimedAt: null,        // ISO8601 — when task was claimed
      reviewedAt: null,       // ISO8601 — when task moved to review
      holdAt: null,           // ISO8601 — when task moved to hold
      requiredSkills: data.requiredSkills || []  // skills required to execute this task
    };
    this.tasks.push(task);
    this._addHistory(task.id, 'created', `태스크 생성됨 (${task.status})`);
    return task;
  }

  updateTask(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    const oldStatus = task.status;
    const oldAgent = task.agent;
    const now = new Date().toISOString();
    Object.assign(task, updates, { updatedAt: now });
    // Track status change
    if (updates.dependencies) {
      task.dependencies = updates.dependencies;
    }
    if (updates.status && updates.status !== oldStatus) {
      // Check dependencies before allowing in_progress
      if (updates.status === 'in_progress' && task.dependencies && task.dependencies.length > 0) {
        const unfinished = task.dependencies.filter(depId => {
          const dep = this.tasks.find(t => t.id === depId);
          return dep && dep.status !== 'done';
        });
        if (unfinished.length > 0) {
          task._blockedBy = unfinished;
        }
      }

      // Auto-populate transition metadata based on new status
      switch (updates.status) {
        case 'claimed':
          task.claimedAt = now;
          break;
        case 'hold':
          task.holdAt = now;
          // holdReason may be provided in updates; keep existing if not
          if (updates.holdReason !== undefined) {
            task.holdReason = updates.holdReason;
          }
          break;
        case 'review':
          task.reviewedAt = now;
          if (updates.reviewNote !== undefined) {
            task.reviewNote = updates.reviewNote;
          }
          // Auto-link agent deliverables: find documents matching task agent/phase
          if (!task.deliverables || task.deliverables.length === 0) {
            const agentDocs = this.documents
              .filter(d => {
                if (task.agent && d.agent === task.agent) return true;
                if (task.phase !== undefined && d.phase === task.phase) return true;
                if (d.taskId === task.id) return true;
                return false;
              })
              .map(d => d.file)
              .filter(Boolean);
            if (agentDocs.length > 0) {
              task.deliverables = agentDocs;
            }
          }
          break;
        case 'in_progress':
          // Clear holdReason on restart
          if (oldStatus === 'hold') {
            task.holdReason = null;
          }
          break;
      }

      this._addHistory(id, 'status_change', `${oldStatus} → ${updates.status}`);
    }
    // Track agent change
    if (updates.agent && updates.agent !== oldAgent) {
      this._addHistory(id, 'agent_assigned', `${updates.agent} 배정됨`);
    }
    if (updates.objective) {
      this._addHistory(id, 'objective_updated', `목표 수정됨`);
    }
    return task;
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const task = this.tasks[idx];
    this.tasks.splice(idx, 1);
    delete this.comments[id];
    delete this.taskHistory[id];
    return task;
  }

  getTask(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  // --- Task History ---
  _addHistory(taskId, type, message) {
    if (!this.taskHistory[taskId]) this.taskHistory[taskId] = [];
    this.taskHistory[taskId].push({
      type,
      message,
      timestamp: new Date().toISOString()
    });
  }

  getTaskHistory(taskId) {
    return this.taskHistory[taskId] || [];
  }

  // --- Task Comments ---
  addComment(taskId, from, message) {
    if (!this.comments[taskId]) this.comments[taskId] = [];
    const comment = {
      id: String(++this.commentIdCounter),
      from,
      message,
      timestamp: new Date().toISOString()
    };
    this.comments[taskId].push(comment);
    // Update comment count on task
    const task = this.tasks.find(t => t.id === taskId);
    if (task) task.comments = this.comments[taskId].length;
    this._addHistory(taskId, 'comment', `${from}: ${message.substring(0, 50)}`);
    return comment;
  }

  getComments(taskId) {
    return this.comments[taskId] || [];
  }

  // --- Task Documents ---
  getTaskDocuments(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    // Match by taskId OR by phase
    const byTaskId = this.documents.filter(d => d.taskId === taskId);
    if (byTaskId.length > 0) return byTaskId;
    // Fallback: match by phase
    if (task && task.phase !== undefined) {
      return this.documents.filter(d => d.phase === task.phase);
    }
    return [];
  }

  // --- Phase Detail ---
  getPhaseDetail(phaseId) {
    const phase = this.phases[phaseId];
    if (!phase) return null;
    const phaseTasks = this.tasks.filter(t => t.phase === phaseId);
    const phaseAgents = Object.values(this.agents).filter(a => a.phase === phaseId);
    const phaseDocs = this.documents.filter(d => d.phase === phaseId);
    const doneTasks = phaseTasks.filter(t => t.status === 'done').length;
    const totalTasks = phaseTasks.length;
    return {
      ...phase,
      tasks: phaseTasks,
      agents: phaseAgents,
      documents: phaseDocs,
      taskProgress: totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0,
      tasksDone: doneTasks,
      tasksTotal: totalTasks
    };
  }

  // --- Getters ---
  getFullState() {
    const tasks = this.tasks;
    const stats = {
      total: tasks.length,
      active: tasks.filter(t => t.status === 'in_progress' || t.status === 'claimed').length,
      done: tasks.filter(t => t.status === 'done').length,
      rate: tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0
    };

    const completedPhases = this.phases.filter(p => p.status === 'completed').length;
    const phaseProgress = Math.round(completedPhases / this.phases.length * 100);

    return {
      stats,
      tasks,
      projects: this.projects,
      agents: this.agents,
      phases: this.phases,
      phaseProgress,
      documents: this.documents,
      timeline: this.timeline.slice(-50),
      debugLoops: this.debugLoops
    };
  }

  // --- Notifications ---
  addNotification(type, title, message) {
    const notif = { id: String(Date.now()), type, title, message, timestamp: new Date().toISOString(), read: false };
    this.notifications.push(notif);
    if (this.notifications.length > 200) this.notifications = this.notifications.slice(-200);
    return notif;
  }

  getNotifications(unreadOnly) {
    if (unreadOnly) return this.notifications.filter(n => !n.read);
    return this.notifications;
  }

  markNotificationRead(id) {
    const n = this.notifications.find(n => n.id === id);
    if (n) n.read = true;
  }

  markAllNotificationsRead() {
    this.notifications.forEach(n => n.read = true);
  }

  getAgents() { return this.agents; }
  getTimeline() { return this.timeline; }
  getDocuments() { return this.documents.filter(d => d.file); }

  // --- Org Chart ---
  getOrgChart() { return this.orgChart; }

  // Remove orphan documents (no file field)
  cleanDocuments() {
    const before = this.documents.length;
    this.documents = this.documents.filter(d => d.file);
    return before - this.documents.length;
  }
  getPhases() { return this.phases; }

  // --- Document Category Inference ---
  _inferCategory(format, filename) {
    const f = (filename || '').toLowerCase();
    if (f.includes('fda') || f.includes('510k') || f.includes('ce_') || f.includes('dhf') || f.includes('kc') || f.includes('인증')) return 'certification';
    if (f.includes('manual') || f.includes('매뉴얼') || f.includes('guide') || f.includes('가이드')) return 'manual';
    if (f.includes('test') || f.includes('테스트') || f.includes('v&v') || f.includes('검증')) return 'test';
    if (f.includes('설계') || f.includes('design') || f.includes('srs') || f.includes('sds') || f.includes('아키텍처')) return 'design';
    if (f.includes('분석') || f.includes('analysis') || f.includes('보고서') || f.includes('report')) return 'analysis';
    if (format === 'pptx') return 'presentation';
    if (format === 'xlsx') return 'data';
    if (format === 'hwpx') return 'official';
    if (format === 'png' || format === 'jpg' || format === 'svg') return 'media';
    return 'document';
  }

  // --- Data Persistence (Protected) ---

  save(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(path.dirname(filePath), 'backups');

    // 1. Ensure backup directory exists
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // 2. Backup current file before overwriting
    if (fs.existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `state-${timestamp}.json`);
      try {
        fs.copyFileSync(filePath, backupPath);
      } catch (e) { /* ignore backup errors */ }

      // Keep last 50 backups, delete older ones
      try {
        const backups = fs.readdirSync(backupDir)
          .filter(f => f.startsWith('state-') && f.endsWith('.json'))
          .sort()
          .reverse();
        backups.slice(50).forEach(f => {
          try { fs.unlinkSync(path.join(backupDir, f)); } catch (e) {}
        });
      } catch (e) {}
    }

    // 3. Write to temp file first, then rename (atomic write)
    const data = {
      _version: 2,
      _warning: 'DO NOT DELETE - Jun.AI Dashboard state. Use /api/projects/:id DELETE with confirmName to remove projects.',
      projects: this.projects,
      projectIdCounter: this.projectIdCounter,
      tasks: this.tasks,
      taskIdCounter: this.taskIdCounter,
      agents: this.agents,
      phases: this.phases,
      documents: this.documents,
      timeline: this.timeline.slice(-500),
      debugLoops: this.debugLoops,
      comments: this.comments,
      taskHistory: this.taskHistory,
      commentIdCounter: this.commentIdCounter,
      notifications: this.notifications.slice(-200),
      activityLog: this.activityLog.slice(-5000),
      orgChart: this.orgChart,
      savedAt: new Date().toISOString()
    };

    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  load(filePath) {
    const fs = require('fs');
    try {
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw || raw.trim().length === 0) return false;
      const data = JSON.parse(raw);
      this.projects = data.projects || [];
      this.projectIdCounter = data.projectIdCounter || 0;
      this.tasks = data.tasks || [];
      this.taskIdCounter = data.taskIdCounter || 0;
      this.agents = data.agents || {};
      this.phases = data.phases || this._initPhases();
      this.documents = data.documents || [];
      this.timeline = data.timeline || [];
      this.debugLoops = data.debugLoops || [];
      this.comments = data.comments || {};
      this.taskHistory = data.taskHistory || {};
      this.commentIdCounter = data.commentIdCounter || 0;
      this.notifications = data.notifications || [];
      this.activityLog = data.activityLog || [];
      this.orgChart = data.orgChart || {};
      console.log(`  ✓ Loaded: ${this.projects.length} projects, ${this.tasks.length} tasks`);
      return true;
    } catch (e) {
      console.error('  ✗ Failed to load state:', e.message);
      // Try loading from latest backup
      return this._loadFromBackup(filePath);
    }
  }

  _loadFromBackup(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(path.dirname(filePath), 'backups');
    try {
      if (!fs.existsSync(backupDir)) return false;
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .sort()
        .reverse();
      for (const backup of backups) {
        try {
          const raw = fs.readFileSync(path.join(backupDir, backup), 'utf-8');
          const data = JSON.parse(raw);
          if (data.projects && data.tasks) {
            // Restore from backup
            fs.copyFileSync(path.join(backupDir, backup), filePath);
            console.log(`  ✓ Recovered from backup: ${backup}`);
            return this.load(filePath);
          }
        } catch (e) { continue; }
      }
    } catch (e) {}
    return false;
  }

  // List available backups for recovery
  listBackups(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(path.dirname(filePath), 'backups');
    try {
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .map(f => {
          const stat = fs.statSync(path.join(backupDir, f));
          return { file: f, size: stat.size, modified: stat.mtime.toISOString() };
        });
    } catch (e) { return []; }
  }

  // Restore from a specific backup
  restoreFromBackup(filePath, backupFile) {
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(path.dirname(filePath), 'backups', backupFile);
    if (!fs.existsSync(backupPath)) return false;

    // Backup current state first
    this.save(filePath);

    // Restore
    fs.copyFileSync(backupPath, filePath);
    return this.load(filePath);
  }
}

module.exports = { StateManager };
