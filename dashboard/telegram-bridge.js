require('dotenv').config({ path: __dirname + '/.env' });

// Force IPv4 globally at every level
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
// Override dns.lookup to force IPv4
const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (typeof options === 'number') options = { family: options };
  options = options || {};
  options.family = 4; // Force IPv4
  return origLookup.call(dns, hostname, options, callback);
};

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set in .env'); process.exit(1); }

const DASHBOARD_URL = 'http://localhost:7700';
const BRIDGE_DATA = path.join(__dirname, 'data', 'telegram-users.json');

// --- Bot Setup ---
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: { timeout: 10 }
  },
  request: {
    family: 4 // Force IPv4
  }
});
// Suppress ALL polling errors — never crash on network issues
bot.on('polling_error', (err) => {
  const msg = err.message || String(err);
  if (msg.includes('ETIMEDOUT') || msg.includes('ENETUNREACH') || msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) {
    console.log(`  [${new Date().toISOString()}] Telegram connection error — auto-retry in next poll cycle`);
  } else if (msg.includes('409')) {
    console.log(`  [${new Date().toISOString()}] Telegram 409 conflict — another instance may be running`);
  } else {
    console.log(`  [${new Date().toISOString()}] Polling error: ${msg.substring(0, 100)}`);
  }
});

bot.on('error', (err) => {
  console.log(`  [${new Date().toISOString()}] Bot error: ${(err.message || '').substring(0, 100)}`);
});

// Prevent crash on ANY uncaught errors
process.on('uncaughtException', (err) => {
  console.error(`  [UNCAUGHT] ${err.message || err}`);
  // Do NOT exit — keep running
});
process.on('unhandledRejection', (err) => {
  console.error(`  [UNHANDLED] ${err}`);
  // Do NOT exit — keep running
});
console.log('\n  Jun Dashboard Bot (@JunDash_bot)');
console.log('  ● Telegram bridge started\n');

// --- User/Project Mapping ---
let users = {}; // chatId → { activeProject, name, authorized }
try { if (fs.existsSync(BRIDGE_DATA)) users = JSON.parse(fs.readFileSync(BRIDGE_DATA, 'utf-8')); } catch(e) {}

function saveUsers() {
  fs.writeFileSync(BRIDGE_DATA, JSON.stringify(users, null, 2), 'utf-8');
}

function getUser(chatId) {
  const id = String(chatId);
  if (!users[id]) { users[id] = { activeProject: null, name: '', authorized: true }; saveUsers(); }
  return users[id];
}

// --- Helper: Dashboard API Call ---
async function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(DASHBOARD_URL + endpoint);
    const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// --- Commands ---

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  user.name = msg.from.first_name || '';
  user.authorized = true;
  saveUsers();

  const projects = await api('GET', '/api/projects');
  let text = `🤖 *Jun\\.AI Agent Bot*\n\n안녕하세요, ${user.name}님\\!\nJun\\.AI 대시보드와 연결되었습니다\\.\n\n`;

  if (Array.isArray(projects) && projects.length > 0) {
    text += `📋 *프로젝트 목록:*\n`;
    projects.forEach(p => { text += `  /switch\\_${p.id} \\- ${escTg(p.name)}\n`; });
    text += `\n현재 활성 프로젝트: ${user.activeProject ? '프로젝트 ' + user.activeProject : '없음 \\(선택하세요\\)'}`;
  } else {
    text += `등록된 프로젝트가 없습니다\\.`;
  }

  text += `\n\n*명령어:*\n/status \\- 프로젝트 상태\n/projects \\- 프로젝트 목록\n/agents \\- 에이전트 현황\n/outputs \\- 산출물 목록\n/help \\- 도움말`;

  bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/projects/, async (msg) => {
  const projects = await api('GET', '/api/projects');
  if (!Array.isArray(projects) || !projects.length) {
    return bot.sendMessage(msg.chat.id, '등록된 프로젝트가 없습니다.');
  }

  const buttons = projects.map(p => ([{ text: `${p.name} (${p.status})`, callback_data: `switch_${p.id}` }]));
  bot.sendMessage(msg.chat.id, '📋 프로젝트를 선택하세요:', { reply_markup: { inline_keyboard: buttons } });
});

bot.onText(/\/switch_(\d+)/, async (msg, match) => {
  const user = getUser(msg.chat.id);
  user.activeProject = match[1];
  saveUsers();
  const projects = await api('GET', '/api/projects');
  const project = projects.find(p => p.id === match[1]);
  bot.sendMessage(msg.chat.id, `✅ 활성 프로젝트: ${project ? project.name : match[1]}`);
});

bot.onText(/\/status/, async (msg) => {
  const user = getUser(msg.chat.id);
  const status = await api('GET', '/api/status');
  const s = status.stats || {};

  let text = `📊 *대시보드 현황*\n\n`;
  text += `Total: ${s.total} | Active: ${s.active} | Done: ${s.done} | Rate: ${s.rate}%\n\n`;

  if (user.activeProject) {
    const tasks = (status.tasks || []).filter(t => t.project === user.activeProject);
    const project = (status.projects || []).find(p => p.id === user.activeProject);
    text += `*${escTg(project ? project.name : 'Project')}*\n`;
    const done = tasks.filter(t => t.status === 'done').length;
    text += `태스크: ${done}/${tasks.length} 완료 (${tasks.length ? Math.round(done/tasks.length*100) : 0}%)\n`;
  }

  // Agents
  const agents = status.agents || {};
  const running = Object.values(agents).filter(a => a.status === 'running');
  if (running.length > 0) {
    text += `\n*활동 중 에이전트:*\n`;
    running.forEach(a => { text += `🔄 ${escTg(a.name)}: ${a.progress||0}% ${escTg(a.task||'')}\n`; });
  }

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/agents/, async (msg) => {
  const agents = await api('GET', '/api/agents');
  if (!agents || !Object.keys(agents).length) {
    return bot.sendMessage(msg.chat.id, '활동 중인 에이전트가 없습니다.');
  }

  let text = '🤖 *에이전트 현황*\n\n';
  Object.values(agents).forEach(a => {
    const icon = a.status === 'running' ? '🔄' : a.status === 'completed' ? '✅' : '⏳';
    text += `${icon} ${escTg(a.name)}: ${a.status} ${a.progress||0}%\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/outputs/, async (msg) => {
  const user = getUser(msg.chat.id);
  const docs = await api('GET', `/api/documents${user.activeProject ? '?project=' + user.activeProject : ''}`);
  if (!Array.isArray(docs) || !docs.length) {
    return bot.sendMessage(msg.chat.id, '산출물이 없습니다.');
  }

  let text = '📁 *최근 산출물*\n\n';
  docs.slice(-10).forEach(d => {
    const icon = { docx:'📄', pptx:'📊', xlsx:'📈', png:'🖼', hwpx:'📝' }[d.format] || '📄';
    text += `${icon} ${escTg(d.file || 'unknown')}\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🤖 *Jun\\.AI Agent Bot*\n\n` +
    `*명령어:*\n` +
    `/start \\- 시작\n` +
    `/admin \\<메시지\\> \\- 시스템 관리자에게 전달\n` +
    `/status \\- 프로젝트 상태\n` +
    `/projects \\- 프로젝트 목록\n` +
    `/sessions \\- Claude 세션 목록\n` +
    `/agents \\- 에이전트 현황\n` +
    `/outputs \\- 산출물 목록\n` +
    `/help \\- 도움말\n\n` +
    `*일반 메시지* \\= 선택된 프로젝트 팀장에게 전달\n` +
    `*/admin 메시지* \\= 시스템 총괄 관리자에게 전달\n` +
    `*사진 전송* \\= 스크린샷으로 전달\n` +
    `*파일 전송* \\= 첨부 파일로 전달`,
    { parse_mode: 'MarkdownV2' }
  );
});

// --- Admin Command (→ jun-Admin session) ---
bot.onText(/\/admin\s*(.*)/, async (msg, match) => {
  const message = (match[1] || '').trim();
  if (!message) {
    return bot.sendMessage(msg.chat.id, '사용법: /admin <메시지>\n\n예:\n/admin 시스템 상태 확인해줘\n/admin 새 프로젝트 만들어줘\n/admin 세션 재시작해줘');
  }

  // Find Admin project
  const projects = await api('GET', '/api/projects');
  const adminProject = Array.isArray(projects) ? projects.find(p => p.name === 'Admin') : null;
  if (!adminProject) {
    return bot.sendMessage(msg.chat.id, '❌ Admin 프로젝트가 없습니다.');
  }

  // Send to Admin chat
  await api('POST', `/api/chat/${adminProject.id}`, {
    from: 'user',
    message: message,
    type: 'text'
  });

  bot.sendMessage(msg.chat.id, '✅ 시스템 관리자(Admin)에게 전달됨');
});

// --- Sessions Command ---
bot.onText(/\/sessions/, async (msg) => {
  const sessions = await api('GET', '/api/sessions');
  if (!Array.isArray(sessions) || !sessions.length) {
    return bot.sendMessage(msg.chat.id, '실행 중인 Claude 세션이 없습니다.');
  }

  let text = '🖥 *Claude Sessions*\n\n';
  sessions.forEach(s => {
    text += `● ${escTg(s.name)} \\(${escTg(s.command)}\\)\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
});

// --- Message Handler (text → project chat) ---
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  console.log(`  [MSG] from ${msg.chat.id}: ${msg.text.substring(0, 50)}`);

  const user = getUser(msg.chat.id);
  if (!user.activeProject) {
    // Auto-select Admin project as default
    const projects = await api('GET', '/api/projects');
    if (Array.isArray(projects) && projects.length > 0) {
      const adminProject = projects.find(p => p.name === 'Admin');
      user.activeProject = adminProject ? adminProject.id : projects[0].id;
      saveUsers();
    } else {
      return bot.sendMessage(msg.chat.id, '프로젝트가 없습니다. 대시보드에서 먼저 생성하세요.');
    }
  }

  // Handle pending rejection (approval system)
  if (user._pendingReject) {
    const taskId = user._pendingReject;
    delete user._pendingReject;
    saveUsers();
    await api('POST', `/api/tasks/${taskId}/reject`, { reason: msg.text });
    bot.sendMessage(msg.chat.id, `❌ 반려 처리됨.\n사유: ${msg.text}\n에이전트에게 피드백이 전달되어 재작업을 시작합니다.`);
    return;
  }

  // Handle approval keywords in chat
  if (msg.text.match(/^(승인|확인|OK|좋아요|진행)$/i)) {
    // Check if there's a pending approval task
    const status = await api('GET', '/api/status');
    const pendingApproval = (status.tasks || []).find(t => t.approval && t.approval.status === 'pending' && t.project === user.activeProject);
    if (pendingApproval) {
      await api('POST', `/api/tasks/${pendingApproval.id}/approve`, {});
      bot.sendMessage(msg.chat.id, `✅ "${pendingApproval.title}" 결재 승인됨. 다음 단계로 진행합니다.`);
      return;
    }
  }
  if (msg.text.match(/^반려[:\s]/)) {
    const reason = msg.text.replace(/^반려[:\s]*/, '').trim();
    const status = await api('GET', '/api/status');
    const pendingApproval = (status.tasks || []).find(t => t.approval && t.approval.status === 'pending' && t.project === user.activeProject);
    if (pendingApproval) {
      await api('POST', `/api/tasks/${pendingApproval.id}/reject`, { reason: reason || '사유 미기재' });
      bot.sendMessage(msg.chat.id, `❌ "${pendingApproval.title}" 반려됨.\n사유: ${reason || '사유 미기재'}\n재작업을 시작합니다.`);
      return;
    }
  }

  // Send to dashboard chat
  await api('POST', `/api/chat/${user.activeProject}`, {
    from: 'user',
    message: msg.text,
    type: 'text'
  });

  // Determine target name
  const projects = await api('GET', '/api/projects');
  const targetProject = Array.isArray(projects) ? projects.find(p => p.id === user.activeProject) : null;
  const targetName = targetProject ? targetProject.name : 'unknown';
  const isAdmin = targetName === 'Admin';
  bot.sendMessage(msg.chat.id, `✅ ${isAdmin ? '시스템 관리자(Admin)' : targetName + ' 팀장'}에게 전달됨`);
});

// --- Photo Handler ---
bot.on('photo', async (msg) => {
  console.log(`  [PHOTO] Received from ${msg.chat.id}, caption: ${msg.caption || 'none'}`);
  const user = getUser(msg.chat.id);
  if (!user.activeProject) {
    const projects = await api('GET', '/api/projects');
    const admin = Array.isArray(projects) ? projects.find(p => p.name === 'Admin') : null;
    user.activeProject = admin ? admin.id : (projects[0] ? projects[0].id : null);
    saveUsers();
    if (!user.activeProject) return bot.sendMessage(msg.chat.id, '프로젝트가 없습니다.');
  }

  try {
    const photo = msg.photo[msg.photo.length - 1];

    // Get file path via direct HTTP (avoid bot.getFileLink which throws AggregateError)
    const https = require('https');
    const getJSON = (url) => new Promise((resolve, reject) => {
      const req = https.get(url, { family: 4, timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    });

    let fileLink;
    try {
      const fileInfo = await getJSON(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${photo.file_id}`);
      if (!fileInfo.ok) throw new Error('getFile failed');
      fileLink = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.result.file_path}`;
    } catch (e) {
      console.log(`  [PHOTO ERROR] getFile failed: ${e.message}`);
      return bot.sendMessage(msg.chat.id, '❌ 텔레그램 파일 서버 연결 실패. 잠시 후 다시 시도해주세요.');
    }

    // Download with timeout and IPv4 forced
    const getFile = (url) => new Promise((resolve, reject) => {
      const req = https.get(url, { family: 4, timeout: 15000 }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    });

    const buffer = await getFile(fileLink);
    const base64 = 'data:image/jpeg;base64,' + buffer.toString('base64');
    const uploadRes = await api('POST', '/api/upload', { data: base64, fileName: 'telegram-photo.jpg', type: 'image' });

    if (uploadRes.ok) {
      await api('POST', `/api/chat/${user.activeProject}`, {
        from: 'user',
        message: msg.caption || '',
        type: 'image',
        fileName: 'telegram-photo.jpg',
        fileUrl: uploadRes.url
      });
      const projects = await api('GET', '/api/projects');
      const targetProject = Array.isArray(projects) ? projects.find(p => p.id === user.activeProject) : null;
      bot.sendMessage(msg.chat.id, `📸 이미지가 ${targetProject ? targetProject.name : ''} 팀장에게 전달됨`);
    } else {
      bot.sendMessage(msg.chat.id, '❌ 이미지 업로드 실패');
    }
  } catch (e) {
    console.log(`  [PHOTO ERROR] ${e.message}`);
    bot.sendMessage(msg.chat.id, `❌ 이미지 처리 실패: ${e.message}`);
  }
});

// --- Document/File Handler ---
bot.on('document', async (msg) => {
  const user = getUser(msg.chat.id);
  if (!user.activeProject) {
    const projects = await api('GET', '/api/projects');
    const admin = Array.isArray(projects) ? projects.find(p => p.name === 'Admin') : null;
    user.activeProject = admin ? admin.id : (projects[0] ? projects[0].id : null);
    saveUsers();
    if (!user.activeProject) return bot.sendMessage(msg.chat.id, '프로젝트가 없습니다.');
  }

  const doc = msg.document;
  const fileLink = await bot.getFileLink(doc.file_id);

  const getFile = (url) => new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
  });

  const buffer = await getFile(fileLink);
  const base64 = 'data:application/octet-stream;base64,' + buffer.toString('base64');
  const uploadRes = await api('POST', '/api/upload', { data: base64, fileName: doc.file_name || 'file', type: 'file' });

  if (uploadRes.ok) {
    await api('POST', `/api/chat/${user.activeProject}`, {
      from: 'user',
      message: msg.caption || '',
      type: 'file',
      fileName: doc.file_name,
      fileUrl: uploadRes.url
    });
    bot.sendMessage(msg.chat.id, `📎 ${doc.file_name} 전달됨`);
  }
});

// --- Callback Query (inline buttons) ---
bot.on('callback_query', async (query) => {
  const data = query.data;

  if (data.startsWith('switch_')) {
    const projectId = data.replace('switch_', '');
    const user = getUser(query.message.chat.id);
    user.activeProject = projectId;
    saveUsers();
    const projects = await api('GET', '/api/projects');
    const project = projects.find(p => p.id === projectId);
    bot.answerCallbackQuery(query.id, { text: `✅ ${project ? project.name : projectId} 선택됨` });
    bot.sendMessage(query.message.chat.id, `✅ 활성 프로젝트: ${project ? project.name : projectId}`);
  }

  if (data.startsWith('confirm_yes_') || data.startsWith('confirm_no_')) {
    const approved = data.startsWith('confirm_yes_');
    const confirmId = data.replace('confirm_yes_', '').replace('confirm_no_', '');
    await api('POST', '/api/confirm', { id: confirmId, approved });
    bot.answerCallbackQuery(query.id, { text: approved ? '✅ 승인됨' : '❌ 거부됨' });
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
  }

  // Approval system callbacks
  if (data.startsWith('approve_')) {
    const taskId = data.replace('approve_', '');
    await api('POST', `/api/tasks/${taskId}/approve`, {});
    bot.answerCallbackQuery(query.id, { text: '✅ 결재 승인됨' });
    bot.editMessageText(query.message.text + '\n\n✅ 승인됨', { chat_id: query.message.chat.id, message_id: query.message.message_id });
  }

  if (data.startsWith('reject_')) {
    const taskId = data.replace('reject_', '');
    // Ask for rejection reason
    bot.answerCallbackQuery(query.id, { text: '반려 사유를 입력하세요' });
    bot.sendMessage(query.message.chat.id, '❌ 반려 사유를 입력해주세요:\n(다음 메시지로 입력하면 반려 처리됩니다)');
    // Store pending rejection
    const user = getUser(query.message.chat.id);
    user._pendingReject = taskId;
    saveUsers();
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
  }
});

// --- WebSocket: Listen for agent responses + notifications ---
let _wsConnected = false;
let _wsRetryCount = 0;

function connectWS() {
  let ws;
  try {
    ws = new WebSocket('ws://localhost:7700/ws');
  } catch (e) {
    console.log(`  [WS] Connection failed, retry in 5s...`);
    setTimeout(connectWS, 5000);
    return;
  }

  ws.on('open', () => {
    _wsConnected = true;
    _wsRetryCount = 0;
    console.log('  ✓ WebSocket connected to dashboard');
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      // Agent chat response → forward to Telegram
      if (msg.type === 'chat_message' && msg.data && msg.data.message && msg.data.message.from !== 'user') {
        const projectId = msg.data.projectId;
        const agentMsg = msg.data.message;
        // Find users with this active project
        Object.entries(users).forEach(([chatId, user]) => {
          if (user.activeProject === projectId) {
            const text = `💬 *${escTg(agentMsg.from)}*:\n${escTg(agentMsg.message)}`;
            bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' }).catch(() => {});
          }
        });
      }

      // Agent confirmation request → send inline buttons
      if (msg.type === 'agent_confirm' && msg.data) {
        const d = msg.data;
        const confirmId = String(Date.now());
        Object.entries(users).forEach(([chatId, user]) => {
          if (user.authorized) {
            bot.sendMessage(chatId, `⚡ *${escTg(d.title || 'Confirm')}*\n\n${escTg(d.message || '')}`, {
              parse_mode: 'MarkdownV2',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ 예', callback_data: `confirm_yes_${confirmId}` }, { text: '❌ 아니오', callback_data: `confirm_no_${confirmId}` }]
                ]
              }
            }).catch(() => {});
          }
        });
      }

    } catch (e) { /* ignore */ }
  });

  ws.on('close', () => {
    _wsConnected = false;
    _wsRetryCount++;
    const delay = Math.min(5000 * _wsRetryCount, 30000); // 5s, 10s, 15s... max 30s
    console.log(`  ✗ WebSocket disconnected, reconnecting in ${delay/1000}s... (attempt ${_wsRetryCount})`);
    setTimeout(connectWS, delay);
  });

  ws.on('error', (err) => {
    // Don't log every error — close event will handle reconnect
    if (!_wsConnected) return;
    console.log(`  [WS ERROR] ${err.message || ''}`);
  });
}

// Start WS with retry — wait for server to be ready
function startWS() {
  const http = require('http');
  const check = () => {
    http.get('http://localhost:7700/api/status', (res) => {
      if (res.statusCode === 200) {
        connectWS();
      } else {
        setTimeout(check, 3000);
      }
    }).on('error', () => {
      console.log('  [WS] Dashboard not ready, retry in 3s...');
      setTimeout(check, 3000);
    });
  };
  check();
}

startWS();

// --- Utility ---
function escTg(text) {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
