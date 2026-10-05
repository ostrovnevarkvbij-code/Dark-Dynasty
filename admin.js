const API = 'https://kjfgzzftse.apps.bot-hosting.cloud';
const myId = localStorage.getItem('lolka_id');

let selectedDays = 0;

// ============ ПРОВЕРКА ДОСТУПА ============

async function checkAccess() {
  if (!myId) {
    window.location.href = 'auth.html';
    return;
  }

  try {
    const r = await fetch(`${API}/api/admin/check?user_id=${myId}`);
    const data = await r.json();

    if (!data.is_admin) {
      document.getElementById('checking').style.display = 'none';
      document.getElementById('denied').style.display = 'block';
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
      return;
    }

    document.getElementById('checking').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    loadBlacklist();
  } catch (e) {
    document.getElementById('checking').innerHTML =
      '❌ Ошибка связи с сервером. <br><small>' + e.message + '</small>';
  }
}

// ============ ВЫБОР СРОКА ============

document.querySelectorAll('.day-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    selectedDays = parseInt(this.dataset.days) || 0;
  });
});

// ============ БАН ============

async function doBan() {
  const targetId = document.getElementById('banUserId').value.trim();
  const reason = document.getElementById('banReason').value.trim();
  const msg = document.getElementById('banMsg');

  if (!targetId) return showBanMsg('Введи ID пользователя', true);
  if (!/^\d+$/.test(targetId)) return showBanMsg('ID должен содержать только цифры', true);
  if (targetId === myId) return showBanMsg('Нельзя забанить себя', true);

  if (selectedDays > 0 && !reason) {
    return showBanMsg('Для временного бана укажи причину', true);
  }

  try {
    const r = await fetch(`${API}/api/blacklist/add`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        admin_id: myId,
        user_id: targetId,
        username: '',
        reason: reason,
        days: selectedDays
      })
    });
    const data = await r.json();

    if (data.status === 'ok') {
      const срок = selectedDays > 0 ? `на ${selectedDays} дн.` : 'навсегда';
      showBanMsg(`✅ Забанен ${срок}`, false);
      document.getElementById('banUserId').value = '';
      document.getElementById('banReason').value = '';
      selectedDays = 0;
      document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.day-btn[data-days="0"]').classList.add('active');
      loadBlacklist();
    } else {
      showBanMsg('❌ ' + (data.error || 'Ошибка'), true);
    }
  } catch (e) {
    showBanMsg('❌ Ошибка связи: ' + e.message, true);
  }
}

function showBanMsg(text, isErr) {
  const el = document.getElementById('banMsg');
  el.textContent = text;
  el.className = 'msg ' + (isErr ? 'err' : 'ok');
  setTimeout(() => { el.textContent = ''; }, 4000);
}

// ============ СПИСОК ЧС ============

async function loadBlacklist() {
  const container = document.getElementById('blItems');
  container.innerHTML = '<div class="bl-empty">Загрузка...</div>';

  try {
    const r = await fetch(`${API}/api/blacklist/list?user_id=${myId}`);
    const data = await r.json();

    if (data.error) {
      container.innerHTML = `<div class="bl-empty">❌ ${data.error}</div>`;
      return;
    }

    const ids = Object.keys(data);
    document.getElementById('blCount').textContent = ids.length;

    if (ids.length === 0) {
      container.innerHTML = '<div class="bl-empty">📭 Чёрный список пуст</div>';
      return;
    }

    container.innerHTML = '';
    ids.forEach(uid => {
      const info = data[uid];
      const item = document.createElement('div');
      item.className = 'bl-item';

      let untilText = '';
      if (info.until) {
        const d = new Date(info.until * 1000);
        untilText = ` · до ${d.toLocaleDateString('ru-RU')}`;
      } else {
        untilText = ' · навсегда';
      }

      item.innerHTML = `
        <div class="bl-item-info">
          <div class="bl-item-name">${info.username || 'Без ника'}</div>
          <div class="bl-item-meta">ID: ${uid}${untilText}</div>
          ${info.reason ? `<div class="bl-item-reason">${info.reason}</div>` : ''}
        </div>
        <button class="unban-btn" onclick="unban('${uid}')">✅ Разбан</button>
      `;
      container.appendChild(item);
    });
  } catch (e) {
    container.innerHTML = `<div class="bl-empty">❌ Ошибка: ${e.message}</div>`;
  }
}

// ============ РАЗБАН ============

async function unban(userId) {
  if (!confirm('Разбанить пользователя ' + userId + '?')) return;

  try {
    const r = await fetch(`${API}/api/blacklist/remove`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        admin_id: myId,
        user_id: userId
      })
    });
    const data = await r.json();

    if (data.status === 'ok') {
      loadBlacklist();
    } else {
      alert('Ошибка: ' + (data.error || 'неизвестная'));
    }
  } catch (e) {
    alert('Ошибка связи: ' + e.message);
  }
}

// ============ ЗАПУСК ============
checkAccess();
