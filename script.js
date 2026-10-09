const API = 'https://dark-arbit-proxy.ostrokadkima.workers.dev';
const userId = localStorage.getItem('lolka_id');
const username = localStorage.getItem('logged_user');

let modFile = null;
let dbFile = null;

// ========== ТЕМА ==========
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = saved === 'light' ? '☀️' : '🌙';
})();

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
}

function logout() {
  localStorage.clear();
  location.href = 'auth.html';
}

async function fetchJSON(url, opts, timeout) {
  opts = opts || {};
  timeout = timeout || 60000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } finally {
    clearTimeout(id);
  }
}

function showMsg(id, text, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  if (!isErr) setTimeout(() => { el.textContent = ''; }, 5000);
}

// ========== СТАТУС ==========
async function checkStatus() {
  const ftpVal = document.getElementById('ftpValue');
  const ftpMsg = document.getElementById('ftpMsg');
  const mysqlVal = document.getElementById('mysqlValue');
  const mysqlMsg = document.getElementById('mysqlMsg');

  ftpVal.textContent = 'Проверка...';
  mysqlVal.textContent = 'Проверка...';
  ftpMsg.textContent = '';
  mysqlMsg.textContent = '';

  try {
    const data = await fetchJSON(`${API}/api/deploy/status?user_id=${userId}`, {}, 30000);
    if (!data || data.error) {
      ftpVal.textContent = '❌ Ошибка';
      mysqlVal.textContent = '❌ Ошибка';
      ftpMsg.textContent = data?.error || 'Не удалось получить статус';
      return;
    }

    if (data.ftp?.ok) {
      ftpVal.textContent = '🟢 Подключено';
      ftpVal.className = 'status-value ok';
    } else {
      ftpVal.textContent = '🔴 Нет связи';
      ftpVal.className = 'status-value err';
    }
    ftpMsg.textContent = data.ftp?.message || '';

    if (data.mysql?.ok) {
      mysqlVal.textContent = '🟢 Подключено';
      mysqlVal.className = 'status-value ok';
    } else {
      mysqlVal.textContent = '🔴 Нет связи';
      mysqlVal.className = 'status-value err';
    }
    mysqlMsg.textContent = data.mysql?.message || '';
  } catch (e) {
    ftpVal.textContent = '❌ Ошибка';
    mysqlVal.textContent = '❌ Ошибка';
    ftpMsg.textContent = e.message;
  }
}

// ========== НАСТРОЙКИ ==========
async function loadSettings() {
  try {
    const data = await fetchJSON(`${API}/api/deploy/settings?user_id=${userId}`);
    if (!data || data.error) return;

    const f = data.ftp || {};
    document.getElementById('ftpHost').value = f.host || '';
    document.getElementById('ftpPort').value = f.port || 21;
    document.getElementById('ftpUser').value = f.user || '';
    document.getElementById('ftpPass').value = f.pass || '';
    document.getElementById('ftpPath').value = f.path || '/';

    const m = data.mysql || {};
    document.getElementById('mysqlHost').value = m.host || '';
    document.getElementById('mysqlPort').value = m.port || 3306;
    document.getElementById('mysqlUser').value = m.user || '';
    document.getElementById('mysqlPass').value = m.pass || '';
    document.getElementById('mysqlDb').value = m.db || '';
  } catch (e) {
    console.log('Ошибка загрузки настроек:', e);
  }
}

async function saveSettings() {
  const payload = {
    user_id: userId,
    ftp: {
      host: document.getElementById('ftpHost').value.trim(),
      port: parseInt(document.getElementById('ftpPort').value) || 21,
      user: document.getElementById('ftpUser').value.trim(),
      pass: document.getElementById('ftpPass').value,
      path: document.getElementById('ftpPath').value.trim() || '/',
    },
    mysql: {
      host: document.getElementById('mysqlHost').value.trim(),
      port: parseInt(document.getElementById('mysqlPort').value) || 3306,
      user: document.getElementById('mysqlUser').value.trim(),
      pass: document.getElementById('mysqlPass').value,
      db: document.getElementById('mysqlDb').value.trim(),
    }
  };

  try {
    const data = await fetchJSON(`${API}/api/deploy/settings/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (data && data.status === 'ok') {
      showMsg('ftpSaveMsg', '✅ Сохранено!', false);
      showMsg('mysqlSaveMsg', '✅ Сохранено!', false);
      loadSettings();
      checkStatus();
    } else {
      showMsg('ftpSaveMsg', '❌ ' + (data?.error || 'Ошибка'), true);
      showMsg('mysqlSaveMsg', '❌ ' + (data?.error || 'Ошибка'), true);
    }
  } catch (e) {
    showMsg('ftpSaveMsg', '❌ ' + e.message, true);
    showMsg('mysqlSaveMsg', '❌ ' + e.message, true);
  }
}

// ========== ВЫБОР ФАЙЛОВ ==========
document.getElementById('modFile').addEventListener('change', function () {
  if (this.files && this.files[0]) {
    modFile = this.files[0];
    document.getElementById('modPicked').textContent = '📦 ' + modFile.name + ' (' + formatSize(modFile.size) + ')';
    document.getElementById('modPicked').style.display = 'block';
    document.getElementById('modUploadBtn').disabled = false;
  }
});

document.getElementById('dbFile').addEventListener('change', function () {
  if (this.files && this.files[0]) {
    dbFile = this.files[0];
    document.getElementById('dbPicked').textContent = '🗄 ' + dbFile.name + ' (' + formatSize(dbFile.size) + ')';
    document.getElementById('dbPicked').style.display = 'block';
    document.getElementById('dbUploadBtn').disabled = false;
  }
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

// ========== ЗАГРУЗКА МОДА ==========
function uploadMod() {
  if (!modFile) return;
  const formData = new FormData();
  formData.append('file', modFile);
  formData.append('user_id', userId);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API}/api/deploy/upload-mod`);

  document.getElementById('modProgress').style.display = 'block';
  document.getElementById('modUploadBtn').disabled = true;

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      document.getElementById('modProgressBar').style.width = percent + '%';
    }
  };

  xhr.onload = () => {
    document.getElementById('modProgress').style.display = 'none';
    document.getElementById('modUploadBtn').disabled = false;
    try {
      const data = JSON.parse(xhr.responseText);
      if (data.status === 'ok') {
        showMsg('modMsg', `✅ Загружено: ${data.filename} (${formatSize(data.size)})`, false);
        modFile = null;
        document.getElementById('modPicked').style.display = 'none';
        document.getElementById('modFile').value = '';
        document.getElementById('modUploadBtn').disabled = true;
      } else {
        showMsg('modMsg', '❌ ' + (data.error || 'Ошибка'), true);
      }
    } catch (e) {
      showMsg('modMsg', '❌ Ошибка ответа: ' + xhr.responseText.slice(0, 100), true);
    }
  };

  xhr.onerror = () => {
    document.getElementById('modProgress').style.display = 'none';
    document.getElementById('modUploadBtn').disabled = false;
    showMsg('modMsg', '❌ Ошибка сети', true);
  };

  xhr.send(formData);
}

// ========== ЗАГРУЗКА БД ==========
function uploadDb() {
  if (!dbFile) return;
  const formData = new FormData();
  formData.append('file', dbFile);
  formData.append('user_id', userId);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API}/api/deploy/upload-db`);

  document.getElementById('dbProgress').style.display = 'block';
  document.getElementById('dbUploadBtn').disabled = true;

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      document.getElementById('dbProgressBar').style.width = percent + '%';
    }
  };

  xhr.onload = () => {
    document.getElementById('dbProgress').style.display = 'none';
    document.getElementById('dbUploadBtn').disabled = false;
    try {
      const data = JSON.parse(xhr.responseText);
      if (data.status === 'ok') {
        let msg = `✅ Выполнено запросов: ${data.executed}`;
        if (data.errors && data.errors.length > 0) {
          msg += `\n⚠️ Ошибок: ${data.errors.length} (первые: ${data.errors.slice(0, 3).join('; ')})`;
        }
        showMsg('dbMsg', msg, false);
        dbFile = null;
        document.getElementById('dbPicked').style.display = 'none';
        document.getElementById('dbFile').value = '';
        document.getElementById('dbUploadBtn').disabled = true;
      } else {
        showMsg('dbMsg', '❌ ' + (data.error || 'Ошибка'), true);
      }
    } catch (e) {
      showMsg('dbMsg', '❌ Ошибка ответа: ' + xhr.responseText.slice(0, 100), true);
    }
  };

  xhr.onerror = () => {
    document.getElementById('dbProgress').style.display = 'none';
    document.getElementById('dbUploadBtn').disabled = false;
    showMsg('dbMsg', '❌ Ошибка сети', true);
  };

  xhr.send(formData);
}

// ========== ЗАПУСК ==========
loadSettings();
checkStatus();
