function toggleWelcome() {
  const el = document.getElementById('welcomePanel');
  const opened = el.style.display === 'block';
  hideAllPanels();
  if (opened) return;
  el.style.display = 'block';
  const gid = guildSelect.value;
  if (gid) loadWelcome(gid);
}

async function loadWelcome(gid) {
  const wSel = document.getElementById('welcomeChannel');
  const gSel = document.getElementById('goodbyeChannel');
  wSel.innerHTML = '<option value="">Загрузка...</option>';
  gSel.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const chans = await getChannels(gid);
    let saved = {};
    try { saved = await fetchJSON(`${API}/api/welcome/get?guild_id=${gid}`) || {}; } catch (e) {}
    const w = saved.welcome || {}, g = saved.goodbye || {};
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
  try {
    const data = await fetchJSON(`${API}/api/welcome/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
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
      })
    }, 20000);
    showMsg('welcomeMsg', data?.status === 'ok' ? '✅ Сохранено!' : '❌ Ошибка', data?.status !== 'ok');
  } catch (e) { showMsg('welcomeMsg', '❌ ' + e.message, true); }
}

function showMsg(id, text, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ========== ЧАТ ==========

let chatLastCount = -1;
let chatSending = false;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function stringToColor(str) {
  const colors = ['#ff2d2d','#ff6b4a','#f59e0b','#22c55e','#22d3ee','#7c5cff','#ec4899','#8b5cf6'];
  let hash = 0;
  str = String(str);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function renderChatMsg(m) {
  const time = new Date(m.created * 1000).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
  const initial = (m.username || '?').charAt(0).toUpperCase();
  const color = stringToColor(m.user_id);
  const isMine = String(m.user_id) === String(userId);
  const del = isMine ? `<button class="chat-delete" onclick="deleteChatMsg(${m.id})" title="Удалить">🗑</button>` : '';
  return `
    <div class="chat-msg${isMine ? ' mine' : ''}" data-id="${m.id}">
      <div class="chat-avatar" style="background:${color}">${initial}</div>
      <div class="chat-body">
        <div class="chat-head">
          <span class="chat-name">@${escapeHtml(m.username)}</span>
          <span class="chat-time">${time}</span>
        </div>
        <div class="chat-text">${escapeHtml(m.text)}</div>
      </div>
      ${del}
    </div>
  `;
}

async function loadChat(silent) {
  const box = document.getElementById('chatMessages');
  if (!box) return;

  if (!silent) box.innerHTML = '<div class="chat-empty">Загрузка...</div>';

  try {
    const data = await fetchJSON(`${API}/api/chat/messages?limit=50`);
    if (!data || !data.messages) {
      if (!silent) box.innerHTML = '<div class="chat-empty">Ошибка загрузки</div>';
      return;
    }

    const cntEl = document.getElementById('chatCount');
    if (cntEl) cntEl.textContent = data.total || data.messages.length;

    if (data.messages.length === 0) {
      box.innerHTML = '<div class="chat-empty">💬 Пока никто не писал. Будь первым!</div>';
      chatLastCount = 0;
      return;
    }

    if (silent && data.messages.length === chatLastCount && box.querySelector('.chat-msg')) {
      return;
    }
    chatLastCount = data.messages.length;

    const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    box.innerHTML = data.messages.map(renderChatMsg).join('');
    if (!silent || wasAtBottom) box.scrollTop = box.scrollHeight;
  } catch (e) {
    if (!silent) box.innerHTML = '<div class="chat-empty">Ошибка: ' + e.message + '</div>';
  }
}

async function sendChat() {
  if (chatSending) return;
  const input = document.getElementById('chatInput');
  const text = (input?.value || '').trim();
  if (!text) return;

  chatSending = true;
  try {
    const data = await fetchJSON(`${API}/api/chat/send`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_id: userId, username: u, text })
    }, 20000);
    if (data && data.status === 'ok') {
      input.value = '';
      chatLastCount = -1;
      await loadChat();
    } else {
      showChatMsg(data?.error || 'Ошибка отправки', true);
    }
  } catch (e) {
    showChatMsg('❌ ' + e.message, true);
  } finally {
    chatSending = false;
  }
}

async function deleteChatMsg(id) {
  if (!confirm('Удалить сообщение?')) return;
  try {
    const data = await fetchJSON(`${API}/api/chat/delete`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_id: userId, msg_id: id })
    }, 20000);
    if (data && data.status === 'ok') {
      chatLastCount = -1;
      loadChat();
    } else {
      showChatMsg(data?.error || 'Ошибка', true);
    }
  } catch (e) {
    showChatMsg('❌ ' + e.message, true);
  }
}

function showChatMsg(text, isErr) {
  const el = document.getElementById('chatMsg');
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// Enter в поле ввода
setTimeout(() => {
  const inp = document.getElementById('chatInput');
  if (inp) {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
    });
  }
}, 100);

// Авто-обновление чата раз в 5 сек (если вкладка активна)
setInterval(() => {
  const s = document.getElementById('chat');
  if (s && s.classList.contains('active')) loadChat(true);
}, 5000);

// ========== ЗАПУСК ==========
loadGuilds();
loadStats();
loadMyProfile();
loadAdmins();
loadEvent();
setInterval(loadStats, 60000);
