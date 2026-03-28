/**
 * StateManager — tracks agents, tasks, phases, documents, and timeline
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
      status: 'pending', // pending | in_progress | completed
      startedAt: null,
      completedAt: null
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

  getProjects() { return this.projects; }

  // --- Task Management ---
  createTask(data) {
    const task = {
      id: String(++this.taskIdCounter),
      title: data.title || '',
      description: data.description || '',
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
    return task;
  }

  updateTask(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
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
