const http = require('http');
const DOCS_PORT = process.env.DOCS_PORT || 7701;

const API_DOCS = {
  title: 'Jun.AI Dashboard API',
  version: '2.0.0',
  baseUrl: 'http://58.29.21.11:7700',
  description: 'Jun.AI PDLC Dashboard REST API & WebSocket Reference',
  endpoints: [
    {
      group: 'Projects',
      routes: [
        {
          method: 'GET', path: '/api/projects',
          desc: '등록된 프로젝트 목록 조회',
          response: '[{ id, name, description, status, createdAt }]'
        },
        {
          method: 'POST', path: '/api/projects',
          desc: '새 프로젝트 생성',
          body: '{ name: string, description?: string }',
          response: '{ id, name, description, status, createdAt }'
        },
        {
          method: 'PATCH', path: '/api/projects/:id',
          desc: '프로젝트 업데이트',
          body: '{ name?, description?, status? }',
          response: '{ ...updated project }'
        },
        {
          method: 'DELETE', path: '/api/projects/:id',
          desc: '프로젝트 삭제 (확인용 이름 필수 — 모든 관련 태스크/히스토리 영구 삭제)',
          body: '{ confirmName: string }',
          response: '{ ok: true, deleted: string }'
        },
        {
          method: 'POST', path: '/api/projects/setup',
          desc: '프로젝트 셋업 — 프로젝트 생성 + PDLC 12단계 태스크 자동 생성 (VOC 전 단계)',
          body: `{
  name: string,              // 프로젝트 이름 (필수)
  description?: string,      // 프로젝트 설명
  domain?: string,           // "general" | "web-fullstack" | "yocto-bsp" | "firmware" | "ai-ml" | "hardware"
  phases?: number[]          // 활성화할 Phase 번호 [0-11], 생략 시 전체 12단계
}`,
          response: '{ project: {...}, tasks: [...], message: string }',
          example: `// 프로젝트 셋업 (lifecycle 시작 전 호출)
curl -X POST http://58.29.21.11:7700/api/projects/setup \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "스마트 카메라 v2.0",
    "description": "AI 기반 스마트 카메라 제품 개발",
    "domain": "ai-ml",
    "phases": [0,1,2,3,4,5,6,7,8,9,10,11]
  }'`
        }
      ]
    },
    {
      group: 'Tasks',
      routes: [
        {
          method: 'GET', path: '/api/status',
          desc: '전체 상태 조회 (stats, tasks, agents, phases, projects, documents)',
          response: '{ stats, tasks[], projects[], agents{}, phases[], phaseProgress, documents[], timeline[], debugLoops[] }'
        },
        {
          method: 'POST', path: '/api/tasks',
          desc: '새 태스크 생성',
          body: '{ title: string, project?: string, status?: "todo"|"hold"|"claimed"|"in_progress"|"review"|"done", priority?: "low"|"medium"|"high"|"critical", role?: "management"|"research"|"ai-ml"|"document"|"test"|"dev", agent?: string, phase?: number }',
          response: '{ id, title, status, priority, role, agent, project, phase, createdAt, updatedAt, comments }'
        },
        {
          method: 'PATCH', path: '/api/tasks/:id',
          desc: '태스크 업데이트 (상태 변경, 에이전트 배정, 목표 수정 등)',
          body: '{ status?, title?, priority?, role?, agent?, project?, objective? }',
          response: '{ ...updated task }'
        },
        {
          method: 'GET', path: '/api/tasks/:id',
          desc: '태스크 상세 조회 (히스토리, 코멘트, 산출물 포함)',
          response: '{ ...task, history: [...], comments: [...], documents: [...] }'
        },
        {
          method: 'DELETE', path: '/api/tasks/:id',
          desc: '태스크 삭제',
          response: '{ ok: true }'
        },
        {
          method: 'GET', path: '/api/tasks/:id/comments',
          desc: '태스크 코멘트 목록',
          response: '[{ id, from, message, timestamp }]'
        },
        {
          method: 'POST', path: '/api/tasks/:id/comments',
          desc: '태스크에 코멘트 추가 (에이전트 소통)',
          body: '{ from: "user"|"agent-name", message: string }',
          response: '{ id, from, message, timestamp }'
        },
        {
          method: 'GET', path: '/api/tasks/:id/history',
          desc: '태스크 상태 변경 히스토리',
          response: '[{ type, message, timestamp }]'
        }
      ]
    },
    {
      group: 'Phases',
      routes: [
        {
          method: 'GET', path: '/api/phases',
          desc: 'PDLC 12단계 상태 조회',
          response: '[{ id, name, status, startedAt, completedAt }]'
        },
        {
          method: 'GET', path: '/api/phases/:id',
          desc: 'Phase 상세 조회 (태스크, 에이전트, 산출물, 진행률 포함)',
          response: '{ id, name, status, startedAt, completedAt, tasks[], agents[], documents[], taskProgress, tasksDone, tasksTotal }'
        }
      ]
    },
    {
      group: 'Agents',
      routes: [
        {
          method: 'GET', path: '/api/agents',
          desc: '에이전트 상태 조회',
          response: '{ [agentName]: { name, status, phase, task, progress, startedAt, message } }'
        }
      ]
    },
    {
      group: 'Events',
      routes: [
        {
          method: 'POST', path: '/api/events',
          desc: '에이전트 이벤트 발행 (project-director/hooks가 호출)',
          body: `{
  type: "agent_start" | "agent_progress" | "agent_complete" | "agent_waiting" | "phase_complete" | "document_created" | "debug_loop",
  agent?: string,
  phase?: number,
  task?: string,
  progress?: number (0-100),
  message?: string,
  output_files?: string[],
  duration_minutes?: number,
  file?: string,
  format?: string,
  loop_number?: number,
  reason?: string,
  action?: string
}`,
          response: '{ ok: true }'
        }
      ]
    },
    {
      group: 'Notifications',
      routes: [
        {
          method: 'POST', path: '/api/notify',
          desc: '대시보드에 알림 전송 (에이전트 완료/확인 요청)',
          body: `{
  confirm: boolean,          // true면 예/아니오 확인 박스, false면 정보 알림
  title: string,             // 알림 제목 (예: "ux-designer 완료")
  message: string,           // 알림 내용
  agent?: string,            // 완료한 에이전트
  task?: string,             // 완료한 작업
  next_agent?: string,       // 다음 에이전트 (confirm=true 시)
  next_task?: string         // 다음 작업 (confirm=true 시)
}`,
          response: '{ ok: true }',
          example: `// 확인 요청 알림
curl -X POST http://58.29.21.11:7700/api/notify \\
  -H 'Content-Type: application/json' \\
  -d '{
    "confirm": true,
    "title": "ux-designer 완료",
    "message": "UX 사양서 작성을 완료했습니다. 이어서 planner로 세부기획 진행하시겠습니까?",
    "agent": "ux-designer",
    "task": "UX 사양서 작성",
    "next_agent": "planner",
    "next_task": "세부기획 수립"
  }'`
        },
        {
          method: 'POST', path: '/api/confirm',
          desc: '대시보드 UI에서 사용자 응답 (예/아니오)',
          body: '{ id: string, approved: boolean }',
          response: '{ ok: true }'
        }
      ]
    },
    {
      group: 'Phases',
      routes: [
        {
          method: 'GET', path: '/api/phases',
          desc: 'PDLC 12단계 상태 조회',
          response: '[{ id: 0-11, name, status: "pending"|"in_progress"|"completed", startedAt, completedAt }]'
        }
      ]
    },
    {
      group: 'Documents',
      routes: [
        {
          method: 'GET', path: '/api/documents',
          desc: '생성된 문서 산출물 목록',
          response: '[{ file, format, phase, createdAt }]'
        }
      ]
    },
    {
      group: 'Timeline',
      routes: [
        {
          method: 'GET', path: '/api/timeline',
          desc: '이벤트 타임라인 (최근 50건)',
          response: '[{ type, agent, phase, timestamp, ... }]'
        }
      ]
    }
  ],
  websocket: {
    url: 'ws://58.29.21.11:7700',
    desc: 'WebSocket 실시간 연결 — 서버→클라이언트 메시지',
    messages: [
      { type: 'state_update', desc: '전체 상태 변경 시 자동 푸시', data: '{ stats, tasks, agents, phases, ... }' },
      { type: 'event', desc: '에이전트 이벤트 발생 시', data: '{ type: "agent_start"|"agent_complete"|..., agent, ... }' },
      { type: 'agent_confirm', desc: '에이전트 확인 요청 (예/아니오 알림)', data: '{ title, message, agent, next_agent, ... }' },
      { type: 'confirm_response', desc: '사용자 응답 브로드캐스트', data: '{ id, approved }' },
      { type: 'task_created', desc: '태스크 생성됨', data: '{ ...task }' },
      { type: 'task_updated', desc: '태스크 업데이트됨', data: '{ ...task }' },
      { type: 'project_created', desc: '프로젝트 생성됨', data: '{ ...project }' }
    ]
  },
  usage: {
    title: '사용 예시 (에이전트/개발자용)',
    examples: [
      {
        title: '1. 에이전트 시작 보고',
        code: `curl -X POST http://58.29.21.11:7700/api/events \\
  -H 'Content-Type: application/json' \\
  -d '{"type":"agent_start","agent":"web-developer","phase":8,"task":"로그인 기능 구현"}'`
      },
      {
        title: '2. 진행률 업데이트',
        code: `curl -X POST http://58.29.21.11:7700/api/events \\
  -H 'Content-Type: application/json' \\
  -d '{"type":"agent_progress","agent":"web-developer","progress":75,"message":"API 연동 중..."}'`
      },
      {
        title: '3. 에이전트 완료 + 다음 단계 확인 요청',
        code: `curl -X POST http://58.29.21.11:7700/api/notify \\
  -H 'Content-Type: application/json' \\
  -d '{"confirm":true,"title":"web-developer 완료","message":"로그인 구현 완료. e2e-tester로 테스트 진행하시겠습니까?","agent":"web-developer","task":"로그인 구현","next_agent":"e2e-tester","next_task":"E2E 테스트"}'`
      },
      {
        title: '4. 문서 생성 보고',
        code: `curl -X POST http://58.29.21.11:7700/api/events \\
  -H 'Content-Type: application/json' \\
  -d '{"type":"document_created","file":"output/V&V_보고서.docx","format":"docx","phase":10}'`
      },
      {
        title: '5. 태스크 생성',
        code: `curl -X POST http://58.29.21.11:7700/api/tasks \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"E2E 테스트 작성","project":"1","role":"test","priority":"high","status":"todo"}'`
      }
    ]
  }
};

function renderHTML(docs) {
  const groupsHTML = docs.endpoints.map(g => {
    const routesHTML = g.routes.map(r => `
      <div class="endpoint">
        <div class="method-line">
          <span class="method method-${r.method.toLowerCase()}">${r.method}</span>
          <code class="path">${r.path}</code>
        </div>
        <p class="desc">${r.desc}</p>
        ${r.body ? `<div class="field"><span class="label">Request Body:</span><pre>${escapeHTML(r.body)}</pre></div>` : ''}
        ${r.response ? `<div class="field"><span class="label">Response:</span><pre>${escapeHTML(r.response)}</pre></div>` : ''}
        ${r.example ? `<div class="field"><span class="label">Example:</span><pre>${escapeHTML(r.example)}</pre></div>` : ''}
      </div>
    `).join('');
    return `<section><h2>${g.group}</h2>${routesHTML}</section>`;
  }).join('');

  const wsHTML = docs.websocket.messages.map(m => `
    <tr><td><code>${m.type}</code></td><td>${m.desc}</td><td><code>${m.data}</code></td></tr>
  `).join('');

  const examplesHTML = docs.usage.examples.map(ex => `
    <div class="example"><h4>${ex.title}</h4><pre>${escapeHTML(ex.code)}</pre></div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${docs.title} — API Documentation</title>
<style>
  :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f1f5f9; --muted: #94a3b8; --blue: #3b82f6; --green: #22c55e; --orange: #f59e0b; --red: #ef4444; --purple: #a855f7; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 24px; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  h1 span { color: var(--orange); }
  .subtitle { color: var(--muted); margin-bottom: 32px; font-size: 14px; }
  .badge { display: inline-block; background: var(--blue); color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
  h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  h3 { font-size: 16px; margin: 24px 0 12px; color: var(--muted); }
  h4 { font-size: 14px; margin-bottom: 8px; }
  section { margin-bottom: 16px; }
  .endpoint { background: var(--card); border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
  .method-line { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .method { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; color: white; }
  .method-get { background: var(--blue); }
  .method-post { background: var(--green); }
  .method-patch { background: var(--orange); }
  .method-delete { background: var(--red); }
  .path { font-size: 15px; color: var(--text); }
  .desc { color: var(--muted); font-size: 14px; margin-bottom: 8px; }
  .field { margin-top: 8px; }
  .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  pre { background: var(--bg); padding: 12px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin-top: 4px; line-height: 1.5; color: var(--green); white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
  th { color: var(--muted); font-size: 12px; text-transform: uppercase; }
  td code { color: var(--blue); }
  .example { background: var(--card); border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
  .ws-url { background: var(--card); padding: 12px 16px; border-radius: 8px; margin: 8px 0; border: 1px solid var(--purple); }
  .ws-url code { color: var(--purple); font-size: 14px; }
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head><body>
  <h1>Jun<span>.AI</span> API <span class="badge">v${docs.version}</span></h1>
  <p class="subtitle">${docs.description} — Base URL: <code>${docs.baseUrl}</code></p>

  <nav>
    <h3>목차</h3>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      ${docs.endpoints.map(g => `<li><a href="#${g.group}">${g.group}</a></li>`).join('')}
      <li><a href="#websocket">WebSocket</a></li>
      <li><a href="#usage">사용 예시</a></li>
    </ul>
  </nav>

  ${groupsHTML}

  <section id="websocket">
    <h2>WebSocket</h2>
    <div class="ws-url"><code>${docs.websocket.url}</code></div>
    <p class="desc">${docs.websocket.desc}</p>
    <table><thead><tr><th>Type</th><th>Description</th><th>Data</th></tr></thead>
    <tbody>${wsHTML}</tbody></table>
  </section>

  <section id="usage">
    <h2>${docs.usage.title}</h2>
    ${examplesHTML}
  </section>

</body></html>`;
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const docsHTML = renderHTML(API_DOCS);

const server = http.createServer((req, res) => {
  if (req.url === '/api/docs.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(API_DOCS, null, 2));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(docsHTML);
  }
});

server.listen(DOCS_PORT, '0.0.0.0', () => {
  console.log(`\n  Jun.AI API Docs`);
  const host = process.env.DASHBOARD_HOST || '58.29.21.11';
  console.log(`  ● http://${host}:${DOCS_PORT}\n`);
});
