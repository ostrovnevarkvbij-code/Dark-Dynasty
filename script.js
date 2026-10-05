(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light');
})();

const u = localStorage.getItem('logged_user');
const userId = localStorage.getItem('lolka_id');
const API = 'https://kjfgzzftse.apps.bot-hosting.cloud';

function debugLog(text) {
  let box = document.getElementById('debugBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'debugBox';
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#000;color:#0f0;font-size:11px;font-family:monospace;padding:8px;z-index:9999;max-height:35vh;overflow:auto;white-space:pre-wrap;border-top:2px solid #ff2d2d;';
    document.body.appendChild(box);
  }
  box.textContent += text + '\n';
  box.scrollTop = box.scrollHeight;
}

async function fetchJSON(url, opts, timeout) {
  opts = opts || {};
  timeout = timeout || 30000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } finally {
    clearTimeout(id);
  }
}

(function initAvatar() {
  const letter = document.getElementById('avatarLetter');
  if (u && letter) letter.textContent = u.charAt(0).toUpperCase();
})();

async function loadMyProfile() {
  if (!userId) return;
  try {
    const data = await fetchJSON(`${API}/api/profile?user_id=${userId}`);
    if (!data) return;
    if (data.avatar) {
      const img = document.getElementById('avatarImg');
      img.src = data.avatar;
      img.classList.add('loaded');
      img.onerror = () => img.classList.remove('loaded');
    }
    if (data.username && data.username !== u) localStorage.setItem('logged_user', data.username);
    const letter = document.getElementById('avatarLetter');
    if (letter && data.username) letter.textContent = data.username.charAt(0).toUpperCase();
  } catch (e) {}
}

async function loadStats() {
  try {
    const data = await fetchJSON(`${API}/api/stats`);
    if (!data || data.error) return;
    document.getElementById('statGuilds').textContent = data.guilds ?? '—';
    document.getElementById('statMembers').textContent = data.members ?? '—';
    document.getElementById('statCommands').textContent = data.commands ?? '—';
  } catch (e) {}
}

async function openProfile() {
  document.getElementById('profileModal').style.display = 'flex';
  const name = localStorage.getItem('logged_user') || 'Пользователь';
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileId').textContent = 'ID: ' + (userId || '—');
  document.getElementById('profileAvatarLetter').textContent = name.charAt(0).toUpperCase();

  if (userId) {
    try {
      const data = await fetchJSON(`${API}/api/profile?user_id=${userId}`);
      if (data && !data.error) {
        document.getElementById('profileName').textContent = data.username || name;
        document.getElementById('profileId').textContent = 'ID: ' + data.id;
        document.getElementById('profileGuilds').textContent = data.guilds_count ?? 0;
        if (data.avatar) {
          const img = document.getElementById('profileAvatarImg');
          img.src = data.avatar;
          img.classList.add('loaded');
          img.onerror = () => img.classList.remove('loaded');
        }
      }
    } catch (e) {
      document.getElementById('profileGuilds').textContent = '—';
    }
  }
}

function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }

document.getElementById('profileModal').addEventListener('click', function (e) {
  if (e.target === this) closeProfile();
});

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
}
(function initThemeIcon() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.getElementById('themeBtn').textContent = saved === 'light' ? '☀️' : '🌙';
})();

function logout() { localStorage.clear(); location.href = 'auth.html'; }

document.querySelectorAll('.tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

const guildSelect = document.getElementById('guildSelect');
const selectedInfo = document.getElementById('selectedInfo');
const selectedName = document.getElementById('selectedName');
const serverPanel = document.getElementById('serverPanel');
const serverAvatar = document.getElementById('serverAvatar');
const serverTitle = document.getElementById('serverTitle');
const serverSub = document.getElementById('serverSub');

let MY_GUILDS = [];
const channelsCache = {};
const rolesCache = {};

async function loadGuilds() {
  if (!userId) return;
  guildSelect.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const data = await fetchJSON(`${API}/api/guilds?user_id=${userId}`, {}, 20000);
    if (!Array.isArray(data)) {
      guildSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
      return;
    }
    MY_GUILDS = data;
    renderGuilds();
  } catch (e) {
    guildSelect.innerHTML = '<option value="">Нет связи с ботом</option>';
  }
}

function renderGuilds() {
  guildSelect.innerHTML = '<option value="">— Выбери сервер —</option>';
  if (MY_GUILDS.length === 0) {
    guildSelect.innerHTML = '<option value="">Нет доступных серверов</option>';
    return;
  }
  MY_GUILDS.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    guildSelect.appendChild(opt);
  });
  const savedId = localStorage.getItem('selected_guild');
  if (savedId && MY_GUILDS.some(g => g.id === savedId)) {
    guildSelect.value = savedId;
    showSelected(savedId);
  }
}

function showSelected(id) {
  const g = MY_GUILDS.find(x => x.id === id);
  if (!g) {
    selectedInfo.style.display = 'none';
    serverPanel.style.display = 'none';
    return;
  }
  selectedInfo.style.display = 'flex';
  selectedName.textContent = g.name;
  serverPanel.style.display = 'block';
  serverTitle.textContent = g.name;
  serverSub.textContent = 'ID: ' + g.id;
  serverAvatar.textContent = g.name.charAt(0).toUpperCase();
}

guildSelect.addEventListener('change', function () {
  const id = this.value;
  if (!id) {
    localStorage.removeItem('selected_guild');
    selectedInfo.style.display = 'none';
    serverPanel.style.display = 'none';
    return;
  }
  localStorage.setItem('selected_guild', id);
  showSelected(id);
  ['settingsPanel', 'welcomePanel', 'automodPanel', 'logsPanel'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });
});

// ========== ОБЩИЕ ==========

async function getChannels(guildId) {
  if (channelsCache[guildId]) return channelsCache[guildId];
  const chans = await fetchJSON(`${API}/api/guilds/${guildId}/channels`);
  if (Array.isArray(chans)) channelsCache[guildId] = chans;
  return chans || [];
}

async function getRoles(guildId) {
  if (rolesCache[guildId]) return rolesCache[guildId];
  const roles = await fetchJSON(`${API}/api/guilds/${guildId}/roles`);
  if (Array.isArray(roles)) rolesCache[guildId] = roles;
  return roles || [];
}

function fillSelect(selectEl, chans, selectedId) {
  selectEl.innerHTML = '<option value="">— Выбери канал —</option>';
  chans.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = '#' + c.name;
    if (selectedId && String(selectedId) === String(c.id)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function hideAllPanels() {
  ['settingsPanel', 'welcomePanel', 'automodPanel', 'logsPanel'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });
}

// ========== НАСТРОЙКИ ==========

function toggleSettings() {
  const el = document.getElementById('settingsPanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadSettings(gid);
}

function fillRoles(selectEl, roles, selectedId) {
  selectEl.innerHTML = '<option value="">— Не выбрана —</option>';
  roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = '@' + r.name;
    if (selectedId && String(selectedId) === String(r.id)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

async function loadSettings(guildId) {
  const autoSel = document.getElementById('autoRoleSelect');
  autoSel.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const roles = await getRoles(guildId);
    let saved = {};
    try { saved = await fetchJSON(`${API}/api/settings/get?guild_id=${guildId}`) || {}; } catch (e) {}
    fillRoles(autoSel, roles, saved.auto_role_id);
    document.getElementById('antiCapsEnabled').checked = !!saved.anti_caps_enabled;
    document.getElementById('antiBotsEnabled').checked = !!saved.anti_bots_enabled;
  } catch (e) {
    autoSel.innerHTML = '<option value="">Ошибка</option>';
  }
}

async function saveSettings() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('settingsMsg', 'Выбери сервер', true);
  const payload = {
    guild_id: gid,
    auto_role_id: document.getElementById('autoRoleSelect').value || null,
    anti_caps_enabled: document.getElementById('antiCapsEnabled').checked,
    anti_bots_enabled: document.getElementById('antiBotsEnabled').checked,
  };
  try {
    const data = await fetchJSON(`${API}/api/settings/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }, 20000);
    if (data && data.status === 'ok') showMsg('settingsMsg', '✅ Сохранено!', false);
    else showMsg('settingsMsg', '❌ ' + (data?.error || 'Ошибка'), true);
  } catch (e) {
    showMsg('settingsMsg', '❌ ' + e.message, true);
  }
}

// ========== АВТОМОДЕРАЦИЯ ==========

function toggleAutomod() {
  const el = document.getElementById('automodPanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadAutomod(gid);
}

async function loadAutomod(guildId) {
  try {
    const data = await fetchJSON(`${API}/api/automod/get?guild_id=${guildId}`) || {};
    document.getElementById('antiInvite').checked = !!data.anti_invite;
    document.getElementById('antiLink').checked = !!data.anti_link;
    document.getElementById('antiSpam').checked = !!data.anti_spam;
    document.getElementById('bannedWords').value = (data.banned_words || []).join(', ');
  } catch (e) {
    debugLog('automod load: ' + e.message);
  }
}

async function saveAutomod() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('automodMsg', 'Выбери сервер', true);
  const words = document.getElementById('bannedWords').value
    .split(',').map(w => w.trim().toLowerCase()).filter(w => w);
  const payload = {
    guild_id: gid,
    anti_invite: document.getElementById('antiInvite').checked,
    anti_link: document.getElementById('antiLink').checked,
    anti_spam: document.getElementById('antiSpam').checked,
    banned_words: words,
  };
  try {
    const data = await fetchJSON(`${API}/api/automod/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }, 20000);
    if (data && data.status === 'ok') showMsg('automodMsg', '✅ Сохранено!', false);
    else showMsg('automodMsg', '❌ ' + (data?.error || 'Ошибка'), true);
  } catch (e) {
    showMsg('automodMsg', '❌ ' + e.message, true);
  }
}

// ========== ЛОГИ ==========

const LOG_FIELDS = {
  member_join: 'logMemberJoin',
  member_leave: 'logMemberLeave',
  message_delete: 'logMessageDelete',
  message_edit: 'logMessageEdit',
  member_ban: 'logMemberBan',
  member_unban: 'logMemberUnban',
  role_change: 'logRoleChange',
};

function toggleLogs() {
  const el = document.getElementById('logsPanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadLogs(gid);
}

async function loadLogs(guildId) {
  try {
    const chans = await getChannels(guildId);
    const data = await fetchJSON(`${API}/api/logs/get?guild_id=${guildId}`) || {};
    Object.keys(LOG_FIELDS).forEach(type => {
      const sel = document.getElementById(LOG_FIELDS[type]);
      fillSelect(sel, chans, data[type]);
    });
  } catch (e) {
    debugLog('logs load: ' + e.message);
  }
}

async function saveLogs() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('logsMsg', 'Выбери сервер', true);
  const cfg = {};
  Object.keys(LOG_FIELDS).forEach(type => {
    const val = document.getElementById(LOG_FIELDS[type]).value;
    if (val) cfg[type] = val;
  });
  try {
    const data = await fetchJSON(`${API}/api/logs/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ guild_id: gid, logs: cfg })
    }, 20000);
    if (data && data.status === 'ok') showMsg('logsMsg', '✅ Сохранено!', false);
    else showMsg('logsMsg', '❌ ' + (data?.error || 'Ошибка'), true);
  } catch (e) {
    showMsg('logsMsg', '❌ ' + e.message, true);
  }
}

// ========== ПРИВЕТСТВИЯ ==========

function toggleWelcome() {
  const el = document.getElementById('welcomePanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadWelcome(gid);
}

async function loadWelcome(guildId) {
  const wSel = document.getElementById('welcomeChannel');
  const gSel = document.getElementById('goodbyeChannel');
  wSel.innerHTML = '<option value="">Загрузка...</option>';
  gSel.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const chans = await getChannels(guildId);
    let saved = {};
    try { saved = await fetchJSON(`${API}/api/welcome/get?guild_id=${guildId}`) || {}; } catch (e) {}
    const w = saved.welcome || {};
    const g = saved.goodbye || {};
    fillSelect(wSel, chans, w.channel_id);
    fillSelect(gSel, chans, g.channel_id);
    document.getElementById('welcomeEnabled').checked = !!w.enabled;
    document.getElementById('welcomeText').value = w.text || '';
    document.getElementById('goodbyeEnabled').checked = !!g.enabled;
    document.getElementById('goodbyeText').value = g.text || '';
  } catch (e) {}
}

async function saveWelcome() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('welcomeMsg', 'Выбери сервер', true);
  const payload = {
    guild_id: gid,
    welcome: {
      enabled: document.getElementById('welcomeEnabled').checked,
      channel_id: document.getElementById('welcomeChannel').value,
      text: document.getElementById('welcomeText').value.trim(),
    },
    goodbye: {
      enabled: document.getElementById('goodbyeEnabled').checked,
      channel_id: document.getElementById('goodbyeChannel').value,
      text: document.getElementById('goodbyeText').value.trim(),
    }
  };
  try {
    const data = await fetchJSON(`${API}/api/welcome/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }, 20000);
    if (data && data.status === 'ok') showMsg('welcomeMsg', '✅ Сохранено!', false);
    else showMsg('welcomeMsg', '❌ ' + (data?.error || 'Ошибка'), true);
  } catch (e) {
    showMsg('welcomeMsg', '❌ ' + e.message, true);
  }
}

// ========== ОБЩЕЕ ==========

function showMsg(id, text, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

loadGuilds();
loadStats();
loadMyProfile();
setInterval(loadStats, 60000);
