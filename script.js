(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light');
})();

const u = localStorage.getItem('logged_user');
const userId = localStorage.getItem('lolka_id');
const API = 'https://dark-arbit-proxy.ostrokadkima.workers.dev';

let customProfile = { color: '#ff2d2d', bio: '', status: '' };

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
  opts = opts || {}; timeout = timeout || 30000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } finally { clearTimeout(id); }
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
      img.src = data.avatar; img.classList.add('loaded');
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

// ========== ПРОФИЛЬ ==========
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
          img.src = data.avatar; img.classList.add('loaded');
          img.onerror = () => img.classList.remove('loaded');
        }
      }
    } catch (e) {}
    loadCustomProfile();
  }
}

async function loadCustomProfile() {
  try {
    const data = await fetchJSON(`${API}/api/profile/custom/get?user_id=${userId}`);
    if (data) {
      customProfile = data;
      applyCustomProfile(data);
      document.getElementById('editStatus').value = data.status || '';
      document.getElementById('editBio').value = data.bio || '';
    }
  } catch (e) {}
}

function applyCustomProfile(p) {
  const color = p.color || '#ff2d2d';
  const avatarBox = document.getElementById('profileAvatarBox');
  if (avatarBox) avatarBox.style.borderColor = color;
  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.style.color = color;

  const statusEl = document.getElementById('profileStatus');
  if (p.status) {
    statusEl.textContent = p.status;
    statusEl.style.display = 'block';
    statusEl.style.color = color;
    statusEl.style.borderColor = color;
  } else {
    statusEl.style.display = 'none';
  }

  const bioEl = document.getElementById('profileBio');
  if (p.bio) {
    bioEl.textContent = p.bio;
    bioEl.style.display = 'block';
  } else {
    bioEl.style.display = 'none';
  }
}

function renderPalette() {
  const colors = ['#ff2d2d', '#ff6b4a', '#f59e0b', '#22c55e', '#22d3ee', '#7c5cff', '#ec4899', '#8b5cf6'];
  const box = document.getElementById('colorPalette');
  box.innerHTML = '';
  colors.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-dot';
    btn.style.background = c;
    if (c === (customProfile.color || '#ff2d2d')) btn.classList.add('active');
    btn.onclick = () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      btn.classList.add('active');
      customProfile.color = c;
    };
    box.appendChild(btn);
  });
}

function toggleEditor() {
  const ed = document.getElementById('profileEditor');
  const opened = ed.style.display === 'block';
  ed.style.display = opened ? 'none' : 'block';
  document.getElementById('editProfileBtn').textContent = opened ? '🎨 Настроить профиль' : '✕ Скрыть настройку';
  if (!opened) renderPalette();
}

async function saveCustomProfile() {
  const status = document.getElementById('editStatus').value.trim();
  const bio = document.getElementById('editBio').value.trim();
  const color = customProfile.color || '#ff2d2d';

  try {
    const data = await fetchJSON(`${API}/api/profile/custom/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_id: userId, color, status, bio })
    });
    if (data && data.status === 'ok') {
      customProfile = { color, status, bio };
      applyCustomProfile(customProfile);
      const msg = document.getElementById('profileEditMsg');
      msg.textContent = '✅ Сохранено!';
      msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 3000);
    }
  } catch (e) {
    const msg = document.getElementById('profileEditMsg');
    msg.textContent = '❌ ' + e.message;
    msg.className = 'msg err';
  }
}

function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }
document.getElementById('profileModal').addEventListener('click', function (e) {
  if (e.target === this) closeProfile();
});

// ========== ТЕМА ==========
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
}
(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.getElementById('themeBtn').textContent = saved === 'light' ? '☀️' : '🌙';
})();

function logout() { localStorage.clear(); location.href = 'auth.html'; }

// ========== ВКЛАДКИ ==========
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

// ========== АДМИНИСТРАЦИЯ ==========
async function loadAdmins() {
  const grid = document.getElementById('adminsGrid');
  try {
    const admins = await fetchJSON(`${API}/api/admins/public`);
    if (!Array.isArray(admins) || admins.length === 0) {
      grid.innerHTML = '<div class="admins-loading">Список пуст</div>';
      return;
    }
    grid.innerHTML = '';
    admins.forEach(a => {
      const card = document.createElement('div');
      card.className = 'admin-card';
      const initial = (a.nick || '?').charAt(0).toUpperCase();
      card.innerHTML = `
        <div class="admin-avatar">
          ${a.avatar ? `<img src="${a.avatar}" alt="">` : `<span>${initial}</span>`}
        </div>
        <div class="admin-role">${a.role_title}</div>
        <h3 class="admin-nick">${a.nick}</h3>
        ${a.bio ? `<p class="admin-bio">${a.bio}</p>` : ''}
        ${a.since ? `<div class="admin-since">В команде с ${a.since}</div>` : ''}
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = '<div class="admins-loading">Ошибка загрузки</div>';
  }
}

// ========== ИВЕНТ ==========
async function loadEvent() {
  const box = document.getElementById('eventContent');
  try {
    const ev = await fetchJSON(`${API}/api/event/current`);
    if (!ev || !ev.enabled) {
      box.innerHTML = '<div class="event-loading">Сейчас активных ивентов нет</div>';
      return;
    }
    const timer = getTimer(ev.date);
    const prizesHtml = (ev.prizes || []).map(p => `<li>${p}</li>`).join('');
    box.innerHTML = `
      <div class="event-hero">
        <div class="event-badge">🔥 АКТИВНЫЙ ИВЕНТ</div>
        <h2>${ev.title}</h2>
        <div class="event-date">📅 ${ev.date_text}</div>
        <p class="event-desc">${ev.description}</p>
        <div class="event-timer">
          <div class="timer-label">До конца ивента:</div>
          <div class="timer-value">${timer}</div>
        </div>
        <div class="event-prizes">
          <h3>🏆 Награды для топ-10</h3>
          <ul>${prizesHtml}</ul>
        </div>
      </div>
    `;
  } catch (e) {
    box.innerHTML = '<div class="event-loading">Ошибка загрузки ивента</div>';
  }
}

function getTimer(dateStr) {
  const target = new Date(dateStr + 'T23:59:59').getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return '🎉 Ивент завершён';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${days} дн. ${hours} ч. ${minutes} мин.`;
}

setInterval(() => {
  const el = document.querySelector('.timer-value');
  if (el) loadEvent();
}, 60000);

// ========== СЕРВЕРА ==========
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
    opt.value = g.id; opt.textContent = g.name;
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
  hideAllPanels();
});

function hideAllPanels() {
  ['settingsPanel', 'welcomePanel', 'automodPanel', 'logsPanel'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });
}

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
    opt.value = c.id; opt.textContent = '#' + c.name;
    if (selectedId && String(selectedId) === String(c.id)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function fillRoles(selectEl, roles, selectedId) {
  selectEl.innerHTML = '<option value="">— Не выбрана —</option>';
  roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id; opt.textContent = '@' + r.name;
    if (selectedId && String(selectedId) === String(r.id)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// НАСТРОЙКИ
function toggleSettings() {
  const el = document.getElementById('settingsPanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadSettings(gid);
}
async function loadSettings(gid) {
  const autoSel = document.getElementById('autoRoleSelect');
  autoSel.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const roles = await getRoles(gid);
    let saved = {};
    try { saved = await fetchJSON(`${API}/api/settings/get?guild_id=${gid}`) || {}; } catch (e) {}
    fillRoles(autoSel, roles, saved.auto_role_id);
    document.getElementById('antiCapsEnabled').checked = !!saved.anti_caps_enabled;
    document.getElementById('antiBotsEnabled').checked = !!saved.anti_bots_enabled;
  } catch (e) { autoSel.innerHTML = '<option value="">Ошибка</option>'; }
}
async function saveSettings() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('settingsMsg', 'Выбери сервер', true);
  try {
    const data = await fetchJSON(`${API}/api/settings/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        guild_id: gid,
        auto_role_id: document.getElementById('autoRoleSelect').value || null,
        anti_caps_enabled: document.getElementById('antiCapsEnabled').checked,
        anti_bots_enabled: document.getElementById('antiBotsEnabled').checked,
      })
    }, 20000);
    showMsg('settingsMsg', data?.status === 'ok' ? '✅ Сохранено!' : '❌ Ошибка', data?.status !== 'ok');
  } catch (e) { showMsg('settingsMsg', '❌ ' + e.message, true); }
}

// АВТОМОДЕРАЦИЯ
function toggleAutomod() {
  const el = document.getElementById('automodPanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadAutomod(gid);
}
async function loadAutomod(gid) {
  try {
    const data = await fetchJSON(`${API}/api/automod/get?guild_id=${gid}`) || {};
    document.getElementById('antiInvite').checked = !!data.anti_invite;
    document.getElementById('antiLink').checked = !!data.anti_link;
    document.getElementById('antiSpam').checked = !!data.anti_spam;
    document.getElementById('bannedWords').value = (data.banned_words || []).join(', ');
  } catch (e) {}
}
async function saveAutomod() {
  const gid = guildSelect.value;
  if (!gid) return showMsg('automodMsg', 'Выбери сервер', true);
  const words = document.getElementById('bannedWords').value
    .split(',').map(w => w.trim().toLowerCase()).filter(w => w);
  try {
    const data = await fetchJSON(`${API}/api/automod/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        guild_id: gid,
        anti_invite: document.getElementById('antiInvite').checked,
        anti_link: document.getElementById('antiLink').checked,
        anti_spam: document.getElementById('antiSpam').checked,
        banned_words: words,
      })
    }, 20000);
    showMsg('automodMsg', data?.status === 'ok' ? '✅ Сохранено!' : '❌ Ошибка', data?.status !== 'ok');
  } catch (e) { showMsg('automodMsg', '❌ ' + e.message, true); }
}

// ЛОГИ
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
async function loadLogs(gid) {
  try {
    const chans = await getChannels(gid);
    const data = await fetchJSON(`${API}/api/logs/get?guild_id=${gid}`) || {};
    Object.keys(LOG_FIELDS).forEach(type => {
      fillSelect(document.getElementById(LOG_FIELDS[type]), chans, data[type]);
    });
  } catch (e) {}
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
    showMsg('logsMsg', data?.status === 'ok' ? '✅ Сохранено!' : '❌ Ошибка', data?.status !== 'ok');
  } catch (e) { showMsg('logsMsg', '❌ ' + e.message, true); }
      }
