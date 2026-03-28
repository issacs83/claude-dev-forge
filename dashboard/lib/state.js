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
        this.agents[event.agent] = {
          name: event.agent,
          status: 'running',
          phase: event.phase,
          task: event.task || '',
          progress: 0,
          startedAt: event.timestamp,
          message: event.message || ''
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
        }
        break;

      case 'document_created':
        this.documents.push({
          file: event.file,
          format: event.format,
          phase: event.phase,
          taskId: event.taskId || null,
          createdAt: event.timestamp
        });
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
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      role: data.role || 'general',
      agent: data.agent || '',
      phase: data.phase,
      project: data.project || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: 0
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
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    // Track status change
    if (updates.status && updates.status !== oldStatus) {
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
    return this.documents.filter(d => d.taskId === taskId);
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

  getAgents() { return this.agents; }
  getTimeline() { return this.timeline; }
  getDocuments() { return this.documents; }
  getPhases() { return this.phases; }
}

module.exports = { StateManager };
