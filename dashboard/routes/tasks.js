'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const { sendTelegramMessage, sendApprovalRequest } = require('../services/telegram');

const CHAT_DIR_TASKS = path.join(__dirname, '..', 'data', 'chat');

// Allowed state transitions for agents (without x-user-action header)
const ALLOWED_AGENT_TRANSITIONS = [
  'todo→claimed',
  'claimed→in_progress',
  'in_progress→hold',
  'in_progress→review',
  'review→hold',
  'hold→in_progress',
];

/**
 * @param {import('../repositories/json-repository').JsonRepository} repo
 * @param {Function} broadcast
 * @param {Function} saveState
 * @param {object} DEFAULT_AGENT_SKILLS
 */
module.exports = function tasksRouter(repo, broadcast, saveState, DEFAULT_AGENT_SKILLS) {
  // POST /api/tasks
  router.post('/', (req, res) => {
    const task = repo.createTask(req.body);
    repo.logActivity(
      task.agent || 'user',
      'task_status_change',
      'task',
      task.id,
      { to: 'todo', title: task.title },
      'api',
      task.title
    );
    broadcast({ type: 'task_created', data: task });
    broadcast({ type: 'state_update', data: repo.getFullState() });
    saveState();
    res.json(task);
  });

  // PATCH /api/tasks/:id
  router.patch('/:id', (req, res) => {
    const oldTask = repo.getTask(req.params.id);
    const oldStatus = oldTask ? oldTask.status : null;
    const newStatus = req.body.status;
    const isUserAction = req.headers['x-user-action'] === 'true';

    // GUARD: ALL status changes require user approval (HARD GATE)
    if (oldTask && newStatus && newStatus !== oldStatus && !isUserAction) {
      const transition = `${oldStatus}→${newStatus}`;
      if (!ALLOWED_AGENT_TRANSITIONS.includes(transition)) {
        return res.status(403).json({
          error: 'Approval required',
          message: `상태 이동 "${oldStatus} → ${newStatus}" 은 사용자 결재가 필요합니다. /api/tasks/${oldTask.id}/approval 로 결재를 요청하세요.`,
          currentStatus: oldStatus,
          requestedStatus: newStatus
        });
      }
    }

    // GUARD: prevent done tasks from being moved backwards without user action
    if (oldTask && oldTask.status === 'done' && newStatus && newStatus !== 'done' && !isUserAction) {
      return res.json(oldTask); // Silently ignore
    }

    // Skill matching check: warn if dispatching to an agent lacking required skills
    let skillWarning = null;
    if (newStatus === 'in_progress' && req.body.agent) {
      const targetAgent = req.body.agent;
      const requiredSkills = oldTask ? (oldTask.requiredSkills || []) : [];
      if (requiredSkills.length > 0) {
        const agentData = repo.getAgents()[targetAgent];
        const agentSkills = (agentData && agentData.skills && agentData.skills.length > 0)
          ? agentData.skills
          : (DEFAULT_AGENT_SKILLS[targetAgent] || []);
        const missing = requiredSkills.filter(s => !agentSkills.includes(s));
        if (missing.length > 0) {
          skillWarning = { missingSkills: missing, agentSkills, requiredSkills };
        }
      }
    }

    const task = repo.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    broadcast({ type: 'task_updated', data: task });
    broadcast({ type: 'state_update', data: repo.getFullState() });
    saveState();

    // Log status changes to activity log
    if (newStatus && newStatus !== oldStatus) {
      const source = isUserAction ? 'api' : 'api';
      repo.logActivity(
        task.agent || (isUserAction ? 'user' : 'system'),
        'task_status_change',
        'task',
        task.id,
        { from: oldStatus, to: newStatus, agent: task.agent || '', userAction: isUserAction },
        source,
        task.title
      );
    }

    // --- Status transition events & notifications ---
    if (newStatus && newStatus !== oldStatus) {
      const now = new Date().toISOString();
      const project = task.project ? repo.getProject(task.project) : null;

      switch (newStatus) {
        case 'claimed': {
          repo.processEvent({
            type: 'task_claimed',
            agent: task.agent || 'unknown',
            task: task.title,
            taskId: task.id,
            timestamp: now
          });
          if (project && project.sessionName) {
            try {
              exec(`tmux send-keys -t "${project.sessionName}" "[Jun.AI] 태스크 수령됨: ${task.title.replace(/"/g, '\\"')}" Enter`);
            } catch (e) { /* ignore */ }
          }
          break;
        }

        case 'in_progress': {
          // Check if this is a hold→in_progress (rework/resume) transition
          const isResume = oldStatus === 'hold';
          const eventType = isResume ? 'task_resumed' : 'task_started';
          repo.processEvent({
            type: eventType,
            agent: task.agent || 'unknown',
            task: task.title,
            taskId: task.id,
            timestamp: now
          });
          if (task.project && project && project.sessionName) {
            try {
              const allSessions = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf-8' });
              if (allSessions.trim().split('\n').includes(project.sessionName)) {
                const agentInfo = task.agent ? `담당 에이전트: ${task.agent}` : '에이전트 미배정';
                const objective = task.objective ? `\n목표: ${task.objective}` : '';
                // Include reject reason if resuming from hold after rejection
                const rejectReason = (isResume && task.approval && task.approval.rejectReason)
                  ? `\n반려 사유: ${task.approval.rejectReason}. 사유를 반영하여 재작업하세요.` : '';
                const instruction = `[Jun.AI 태스크 디스패치] "${task.title}" 가 In Progress로 이동되었습니다. ${agentInfo}${objective}${rejectReason}\n이 태스크를 즉시 수행하세요. 진행 상황은 curl -s -X POST http://58.29.21.11:7700/api/events -H 'Content-Type: application/json' -d '{"type":"agent_progress","agent":"${task.agent || 'project-director'}","progress":50,"message":"진행내용"}' 으로 보고하세요. 완료 시 agent_complete 이벤트를 보내세요.`;
                const escaped = instruction.replace(/"/g, '\\"');
                exec(`tmux send-keys -t "${project.sessionName}" "${escaped}" Enter`);
                repo.processEvent({
                  type: 'agent_start',
                  agent: task.agent || 'project-director',
                  phase: task.phase,
                  task: task.title,
                  timestamp: now
                });
                broadcast({ type: 'state_update', data: repo.getFullState() });
                saveState();
              }
            } catch (e) { /* ignore tmux errors */ }
          }
          break;
        }

        case 'hold': {
          const holdReason = req.body.holdReason || task.holdReason || '';
          repo.processEvent({
            type: 'task_hold',
            agent: task.agent || 'unknown',
            task: task.title,
            taskId: task.id,
            holdReason,
            timestamp: now
          });
          const agents = repo.getAgents();
          if (task.agent && agents[task.agent]) {
            agents[task.agent].status = 'waiting';
            agents[task.agent].waitingFor = holdReason || '보류 중';
          }
          const holdMsg = `⏸ [Hold] ${task.title}\n사유: ${holdReason || '(사유 미기재)'}`;
          sendTelegramMessage(holdMsg);
          broadcast({ type: 'state_update', data: repo.getFullState() });
          saveState();
          break;
        }

        case 'review': {
          const reviewNote = req.body.reviewNote || task.reviewNote || '';
          repo.processEvent({
            type: 'task_review',
            agent: task.agent || 'unknown',
            task: task.title,
            taskId: task.id,
            reviewNote,
            deliverables: task.deliverables || [],
            timestamp: now
          });
          const agents = repo.getAgents();
          if (task.agent && agents[task.agent]) {
            agents[task.agent].status = 'completed';
            agents[task.agent].progress = 100;
          }
          const delivList = (task.deliverables || []).map(d => `  - ${d}`).join('\n') || '  (없음)';
          const reviewMsg = `🔍 [검증요청] ${task.title}\n${reviewNote ? `메모: ${reviewNote}\n` : ''}산출물:\n${delivList}`;
          sendTelegramMessage(reviewMsg);

          if (oldStatus !== 'review') {
            task.approval = {
              status: 'pending',
              summary: reviewNote || `${task.title} 검증 요청`,
              deliverables: task.deliverables || [],
              requestedAt: now,
              respondedAt: null,
              rejectReason: null
            };
            repo.addHistory(task.id, 'approval_requested', `검증 요청: ${reviewNote || task.title}`);
            const keyboard = {
              inline_keyboard: [[
                { text: '✅ 승인', callback_data: `approve_${task.id}` },
                { text: '❌ 반려', callback_data: `reject_${task.id}` }
              ]]
            };
            sendTelegramMessage(`📋 [결재요청] ${task.title}\n${reviewNote || ''}`, keyboard);
            broadcast({ type: 'approval_request', data: { taskId: task.id, task } });
          }
          broadcast({ type: 'state_update', data: repo.getFullState() });
          saveState();
          break;
        }
      }
    }

    if (skillWarning) {
      res.json({ ...task, _skillWarning: skillWarning });
    } else {
      res.json(task);
    }
  });

  // POST /api/tasks/:id/approval
  router.post('/:id/approval', (req, res) => {
    const task = repo.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const { summary, deliverables } = req.body;

    task.approval = {
      status: 'pending',
      summary: summary || '',
      deliverables: deliverables || [],
      requestedAt: new Date().toISOString(),
      respondedAt: null,
      rejectReason: null
    };
    task.updatedAt = new Date().toISOString();
    repo.addHistory(task.id, 'approval_requested', `결재 요청: ${summary || task.title}`);
    repo.logActivity(
      task.agent || 'system',
      'approval_action',
      'task',
      task.id,
      { action: 'requested', summary: summary || '', deliverables: deliverables || [] },
      'api',
      task.title
    );
    saveState();

    broadcast({ type: 'approval_request', data: { taskId: task.id, task } });
    broadcast({ type: 'state_update', data: repo.getFullState() });

    const project = repo.getProject(task.project);
    const projectName = project ? project.name : 'Unknown';
    sendApprovalRequest(task.id, task.title, projectName, summary, deliverables);

    res.json({ ok: true, approval: task.approval });
  });

  // POST /api/tasks/:id/approve
  router.post('/:id/approve', (req, res) => {
    const task = repo.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.approval = task.approval || {};
    task.approval.status = 'approved';
    task.approval.respondedAt = new Date().toISOString();
    const oldStatus = task.status;
    task.status = 'done';
    task._pendingApproval = false;
    task.updatedAt = new Date().toISOString();
    repo.addHistory(task.id, 'approval_approved', `결재 승인됨 (${oldStatus} → done)`);
    repo.logActivity(
      'user',
      'approval_action',
      'task',
      task.id,
      { action: 'approved', from: oldStatus, to: 'done' },
      'api',
      task.title
    );
    saveState();

    broadcast({ type: 'approval_response', data: { taskId: task.id, status: 'approved' } });
    broadcast({ type: 'state_update', data: repo.getFullState() });

    // Notify Claude session to proceed
    const project = repo.getProject(task.project);
    if (project && project.sessionName) {
      const instruction = `[Jun.AI 결재] "${task.title}" 이 승인되었습니다. 다음 Phase로 진행하세요.`;
      exec(`tmux send-keys -t "${project.sessionName}" "${instruction.replace(/"/g, '\\"')}" Enter`);
    }

    // Notify via chat
    if (task.project) {
      const chatFile = path.join(CHAT_DIR_TASKS, `project-${task.project}.json`);
      let msgs = [];
      try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch (e) {}
      msgs.push({ id: String(Date.now()), from: 'system', message: `✅ "${task.title}" 결재 승인됨. 다음 단계로 진행합니다.`, type: 'text', fileName: null, fileUrl: null, timestamp: new Date().toISOString() });
      fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
      broadcast({ type: 'chat_message', data: { projectId: task.project, message: msgs[msgs.length - 1], notify: true } });
    }

    // Emit agent_complete event for the task's agent
    if (task.agent) {
      repo.processEvent({
        type: 'agent_complete',
        agent: task.agent,
        phase: task.phase,
        task: task.title,
        timestamp: new Date().toISOString()
      });
    }

    // Check if all tasks in this phase are done → phase_complete
    if (task.phase !== undefined && task.phase !== null) {
      const phaseTasks = repo.tasks.filter(t => t.phase === task.phase && t.project === task.project);
      const allDone = phaseTasks.length > 0 && phaseTasks.every(t => t.status === 'done');
      if (allDone) {
        repo.processEvent({
          type: 'phase_complete',
          phase: task.phase,
          timestamp: new Date().toISOString()
        });
        broadcast({ type: 'state_update', data: repo.getFullState() });
        saveState();
      }
    }

    res.json({ ok: true, status: 'approved' });
  });

  // POST /api/tasks/:id/reject
  router.post('/:id/reject', (req, res) => {
    const task = repo.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const { reason } = req.body;

    task.approval = task.approval || {};
    task.approval.status = 'rejected';
    task.approval.rejectReason = reason || '사유 미기재';
    task.approval.respondedAt = new Date().toISOString();
    task.status = 'in_progress';
    task.updatedAt = new Date().toISOString();
    repo.addHistory(task.id, 'approval_rejected', `결재 반려: ${reason || '사유 미기재'}`);
    repo.logActivity(
      'user',
      'approval_action',
      'task',
      task.id,
      { action: 'rejected', reason: reason || '사유 미기재' },
      'api',
      task.title
    );
    saveState();

    broadcast({ type: 'approval_response', data: { taskId: task.id, status: 'rejected', reason } });
    broadcast({ type: 'state_update', data: repo.getFullState() });

    const project = repo.getProject(task.project);
    if (project && project.sessionName) {
      const instruction = `[Jun.AI 결재반려] "${task.title}" 이 반려되었습니다. 반려 사유: ${reason || '사유 미기재'}. 사유를 반영하여 재작업하고 다시 결재를 요청하세요.`;
      exec(`tmux send-keys -t "${project.sessionName}" "${instruction.replace(/"/g, '\\"')}" Enter`);
    }

    if (task.project) {
      const chatFile = path.join(CHAT_DIR_TASKS, `project-${task.project}.json`);
      let msgs = [];
      try { if (fs.existsSync(chatFile)) msgs = JSON.parse(fs.readFileSync(chatFile, 'utf-8')); } catch (e) {}
      msgs.push({ id: String(Date.now()), from: 'system', message: `❌ "${task.title}" 결재 반려됨.\n사유: ${reason || '사유 미기재'}\n재작업을 시작합니다.`, type: 'text', fileName: null, fileUrl: null, timestamp: new Date().toISOString() });
      fs.writeFileSync(chatFile, JSON.stringify(msgs, null, 2), 'utf-8');
      broadcast({ type: 'chat_message', data: { projectId: task.project, message: msgs[msgs.length - 1], notify: true } });
    }

    res.json({ ok: true, status: 'rejected' });
  });

  // GET /api/tasks/:id
  router.get('/:id', (req, res) => {
    const task = repo.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({
      ...task,
      history: repo.getTaskHistory(req.params.id),
      comments: repo.getComments(req.params.id),
      documents: repo.getTaskDocuments(req.params.id)
    });
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', (req, res) => {
    const task = repo.deleteTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    broadcast({ type: 'state_update', data: repo.getFullState() });
    res.json({ ok: true });
  });

  // GET /api/tasks/:id/comments
  router.get('/:id/comments', (req, res) => {
    res.json(repo.getComments(req.params.id));
  });

  // POST /api/tasks/:id/comments
  router.post('/:id/comments', (req, res) => {
    const { from, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const comment = repo.addComment(req.params.id, from || 'user', message);
    broadcast({ type: 'task_comment', data: { taskId: req.params.id, comment } });
    broadcast({ type: 'state_update', data: repo.getFullState() });

    // If from user → forward to Claude independent tmux session
    if ((from || 'user') === 'user') {
      const task = repo.getTask(req.params.id);
      if (task) {
        try {
          const project = repo.getProject(task.project);
          if (project && project.sessionName) {
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

  // GET /api/tasks/:id/history
  router.get('/:id/history', (req, res) => {
    res.json(repo.getTaskHistory(req.params.id));
  });

  return router;
};
