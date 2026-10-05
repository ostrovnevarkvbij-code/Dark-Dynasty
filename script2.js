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

loadGuilds();
loadStats();
loadMyProfile();
loadAdmins();
loadEvent();
setInterval(loadStats, 60000);
