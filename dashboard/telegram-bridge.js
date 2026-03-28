require('dotenv').config({ path: __dirname + '/.env' });
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
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('\n  JunAgent Bot (@JunAgent_bot)');
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
    `/status \\- 프로젝트 상태\n` +
    `/projects \\- 프로젝트 목록\n` +
    `/agents \\- 에이전트 현황\n` +
    `/outputs \\- 산출물 목록\n` +
    `/help \\- 도움말\n\n` +
    `*일반 메시지* \\= 팀장 에이전트에게 전달\n` +
    `*사진 전송* \\= 스크린샷으로 전달\n` +
    `*파일 전송* \\= 첨부 파일로 전달`,
    { parse_mode: 'MarkdownV2' }
  );
});

// --- Message Handler (text → project chat) ---
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const user = getUser(msg.chat.id);
  if (!user.activeProject) {
    // Auto-select first project
    const projects = await api('GET', '/api/projects');
    if (Array.isArray(projects) && projects.length > 0) {
      user.activeProject = projects[0].id;
      saveUsers();
    } else {
      return bot.sendMessage(msg.chat.id, '프로젝트가 없습니다. 대시보드에서 먼저 생성하세요.');
    }
  }

  // Send to dashboard chat
  await api('POST', `/api/chat/${user.activeProject}`, {
    from: 'user',
    message: msg.text,
    type: 'text'
  });

  bot.sendMessage(msg.chat.id, '✅ 팀장 에이전트에게 전달됨');
});

// --- Photo Handler ---
bot.on('photo', async (msg) => {
  const user = getUser(msg.chat.id);
  if (!user.activeProject) return bot.sendMessage(msg.chat.id, '프로젝트를 먼저 선택하세요: /projects');

  // Get largest photo
  const photo = msg.photo[msg.photo.length - 1];
  const fileLink = await bot.getFileLink(photo.file_id);

  // Download and upload to dashboard
  const https = require('https');
  const getFile = (url) => new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
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
    bot.sendMessage(msg.chat.id, '📸 이미지가 팀장에게 전달됨');
  }
});

// --- Document/File Handler ---
bot.on('document', async (msg) => {
  const user = getUser(msg.chat.id);
  if (!user.activeProject) return bot.sendMessage(msg.chat.id, '프로젝트를 먼저 선택하세요: /projects');

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
});

// --- WebSocket: Listen for agent responses + notifications ---
function connectWS() {
  const ws = new WebSocket('ws://localhost:7700');

  ws.on('open', () => { console.log('  ✓ WebSocket connected to dashboard'); });

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
    console.log('  ✗ WebSocket disconnected, reconnecting in 5s...');
    setTimeout(connectWS, 5000);
  });

  ws.on('error', () => { /* reconnect handled by close */ });
}

connectWS();

// --- Utility ---
function escTg(text) {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
