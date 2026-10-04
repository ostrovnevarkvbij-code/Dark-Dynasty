// ========== ИНИЦИАЛИЗАЦИЯ ТЕМЫ ==========
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light');
  }
})();

// ========== АВАТАРКА ==========
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

// Показать имя пользователя из localStorage сразу
(function initAvatar() {
  const letter = document.getElementById('avatarLetter');
  if (u && letter) letter.textContent = u.charAt(0).toUpperCase();
})();

// Подтянуть полный профиль
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

    // Обновить localStorage username
    if (data.username && data.username !== u) {
      localStorage.setItem('logged_user', data.username);
    }

    // Обновить букву
    const letter = document.getElementById('avatarLetter');
    if (letter && data.username) letter.textContent = data.username.charAt(0).toUpperCase();
  } catch (e) {
    debugLog('Профиль не загрузился: ' + e.message);
  }
}

// ========== СТАТИСТИКА ==========
async function loadStats() {
  try {
    const data = await fetchJSON(`${API}/api/stats`);
    if (!data || data.error) return;

    document.getElementById('statGuilds').textContent = data.guilds ?? '—';
    document.getElementById('statMembers').textContent = data.members ?? '—';
    document.getElementById('statCommands').textContent = data.commands ?? '—';
  } catch (e) {
    debugLog('Статистика не загрузилась: ' + e.message);
  }
}

// ========== ПРОФИЛЬ (модалка) ==========
async function openProfile() {
  const modal = document.getElementById('profileModal');
  modal.style.display = 'flex';

  // Заполняем базой из localStorage
  const name = localStorage.getItem('logged_user') || 'Пользователь';
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileId').textContent = 'ID: ' + (userId || '—');
  document.getElementById('profileAvatarLetter').textContent = name.charAt(0).toUpperCase();

  // Пытаемся загрузить полные данные
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

function closeProfile() {
  document.getElementById('profileModal').style.display = 'none';
}

// Закрытие по клику на фон
document.getElementById('profileModal').addEventListener('click', function (e) {
  if (e.target === this) closeProfile();
});

// ========== ТЕМА ==========
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
}
// Установить правильную иконку при загрузке
(function initThemeIcon() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.getElementById('themeBtn').textContent = saved === 'light' ? '☀️' : '🌙';
})();

// ========== ВЫХОД ==========
function logout() {
  localStorage.clear();
  location.href = 'auth.html';
}

// ========== ВКЛАДКИ ==========
document.querySelectorAll('.tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

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

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchJSON(`${API}/api/guilds?user_id=${userId}`, {}, 20000);
      if (!Array.isArray(data)) {
        lastError = 'НЕ МАССИВ';
        continue;
      }
      MY_GUILDS = data;
      renderGuilds();
      return;
    } catch (e) {
      lastError = e.message;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }
  guildSelect.innerHTML = '<option value="">Нет связи с ботом</option>';
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
  document.getElementById('welcomePanel').style.display = 'none';
  document.getElementById('settingsPanel').style.display = 'none';
});

// ========== НАСТРОЙКИ ==========
const settingsPanel = document.getElementById('settingsPanel');

function toggleSettings() {
  const opened = settingsPanel.style.display === 'block';
  settingsPanel.style.display = opened ? 'none' : 'block';
  document.getElementById('welcomePanel').style.display = 'none';
  if (!opened) {
    const guildId = guildSelect.value;
    if (guildId) loadSettings(guildId);
  }
}

async function getRoles(guildId) {
  if (rolesCache[guildId]) return rolesCache[guildId];
  const roles = await fetchJSON(`${API}/api/guilds/${guildId}/roles`);
  if (Array.isArray(roles)) rolesCache[guildId] = roles;
  return roles || [];
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
    try {
      saved = await fetchJSON(`${API}/api/settings/get?guild_id=${guildId}`) || {};
    } catch (e) { }
    fillRoles(autoSel, roles, saved.auto_role_id);
    document.getElementById('antiCapsEnabled').checked = !!saved.anti_caps_enabled;
    document.getElementById('antiBotsEnabled').checked = !!saved.anti_bots_enabled;
  } catch (e) {
    autoSel.innerHTML = '<option value="">Ошибка</option>';
  }
}

async function saveSettings() {
  const guildId = guildSelect.value;
  if (!guildId) return showSettingsMsg('Сначала выбери сервер', true);

  const payload = {
    guild_id: guildId,
    auto_role_id: document.getElementById('autoRoleSelect').value || null,
    anti_caps_enabled: document.getElementById('antiCapsEnabled').checked,
    anti_bots_enabled: document.getElementById('antiBotsEnabled').checked,
  };

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchJSON(`${API}/api/settings/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }, 20000);
      if (data && data.status === 'ok') {
        showSettingsMsg('✅ Сохранено!', false);
        return;
      }
      lastError = (data && data.error) || 'Ошибка';
    } catch (e) {
      lastError = e.message;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }
  showSettingsMsg('❌ ' + lastError, true);
}

function showSettingsMsg(text, isErr) {
  const el = document.getElementById('settingsMsg');
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ========== ПРИВЕТСТВИЯ ==========
const welcomePanel = document.getElementById('welcomePanel');

function toggleWelcome() {
  const opened = welcomePanel.style.display === 'block';
  welcomePanel.style.display = opened ? 'none' : 'block';
  document.getElementById('settingsPanel').style.display = 'none';
  if (!opened) {
    const guildId = guildSelect.value;
    if (guildId) loadWelcome(guildId);
  }
}

async function getChannels(guildId) {
  if (channelsCache[guildId]) return channelsCache[guildId];
  const chans = await fetchJSON(`${API}/api/guilds/${guildId}/channels`);
  if (Array.isArray(chans)) channelsCache[guildId] = chans;
  return chans || [];
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

async function loadWelcome(guildId) {
  const welcomeSel = document.getElementById('welcomeChannel');
  const goodbyeSel = document.getElementById('goodbyeChannel');
  welcomeSel.innerHTML = '<option value="">Загрузка...</option>';
  goodbyeSel.innerHTML = '<option value="">Загрузка...</option>';

  try {
    const chans = await getChannels(guildId);
    let saved = {};
    try {
      saved = await fetchJSON(`${API}/api/welcome/get?guild_id=${guildId}`) || {};
    } catch (e) { }

    const w = saved.welcome || {};
    const g = saved.goodbye || {};
    fillSelect(welcomeSel, chans, w.channel_id);
    fillSelect(goodbyeSel, chans, g.channel_id);
    document.getElementById('welcomeEnabled').checked = !!w.enabled;
    document.getElementById('welcomeText').value = w.text || '';
    document.getElementById('goodbyeEnabled').checked = !!g.enabled;
    document.getElementById('goodbyeText').value = g.text || '';
  } catch (e) { }
}

async function saveWelcome() {
  const guildId = guildSelect.value;
  if (!guildId) return showWelcomeMsg('Сначала выбери сервер', true);

  const payload = {
    guild_id: guildId,
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

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchJSON(`${API}/api/welcome/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }, 20000);
      if (data && data.status === 'ok') {
        showWelcomeMsg('✅ Сохранено!', false);
        return;
      }
      lastError = (data && data.error) || 'Ошибка';
    } catch (e) {
      lastError = e.message;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }
  showWelcomeMsg('❌ ' + lastError, true);
}

function showWelcomeMsg(text, isErr) {
  const el = document.getElementById('welcomeMsg');
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ========== ЗАПУСК ==========
loadGuilds();
loadStats();
loadMyProfile();
setInterval(loadStats, 60000); // обновление статистики раз в минуту
