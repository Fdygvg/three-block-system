let selectedDateOffset = 0;

const BLOCKS = [
  { id: 0, name: 'Early Morning', time: '3:00 AM – 6:00 AM', color: '#b047ff', short: 'B1' },
  { id: 1, name: 'Morning Block', time: '7:00 AM – 12:00 PM', color: '#e8ff47', short: 'B2' },
  { id: 2, name: 'Afternoon Block', time: '1:00 PM – 6:00 PM', color: '#ff6b35', short: 'B3' },
  { id: 3, name: 'Night Block', time: '7:00 PM – 11:00 PM', color: '#47c4ff', short: 'B4' },
];

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MOTIVES = [
  ['BLOCK 1', 'ends at 6:00 AM — dawn is coming'],
  ['BLOCK 2', 'ends at 12:00 PM — reset, then go again'],
  ['BLOCK 3', 'halfway through — don\'t stop now'],
  ['BLOCK 4', 'last push — finish strong'],
  ['ALL DONE', 'you ran the whole day. rest earned.'],
];

function getKey(suffix) {
  return getWeekKey(selectedDateOffset, suffix);
}

function getWeekKey(dayOffset, suffix) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `3block_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}_${suffix}`;
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function getTodayTasks(blockId) {
  return load(getKey(`tasks_${blockId}`), []);
}

function saveTodayTasks(blockId, tasks) {
  save(getKey(`tasks_${blockId}`), tasks);
}

function isBlockDone(blockId) {
  return load(getKey(`done_${blockId}`), false);
}

function setBlockDone(blockId, val) {
  save(getKey(`done_${blockId}`), val);
}

function renderWeekStrip() {
  const strip = document.getElementById('weekStrip');
  strip.innerHTML = '';
  const today = new Date().getDay();

  for (let i = 0; i < 7; i++) {
    const offset = i - today;
    const isToday = offset === 0;
    const isPast = offset < 0;

    const b1 = load(getWeekKey(offset, 'done_0'), false);
    const b2 = load(getWeekKey(offset, 'done_1'), false);
    const b3 = load(getWeekKey(offset, 'done_2'), false);
    const b4 = load(getWeekKey(offset, 'done_3'), false);
    const anyDone = b1 || b2 || b3 || b4;

    const isSelected = offset === selectedDateOffset;

    const el = document.createElement('div');
    el.className = `week-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${anyDone ? ' completed' : ''}`;
    el.onclick = () => selectDay(offset);
    el.innerHTML = `
      <div class="wd-label">${DAYS[i]}</div>
      <div class="wd-dots">
        <div class="wd-dot${b1 ? ' filled' : ''}"></div>
        <div class="wd-dot b2${b2 ? ' filled' : ''}"></div>
        <div class="wd-dot b3${b3 ? ' filled' : ''}"></div>
        <div class="wd-dot b4${b4 ? ' filled' : ''}"></div>
      </div>
    `;
    strip.appendChild(el);
  }
}

function renderBlocks() {
  const container = document.getElementById('blocksContainer');
  container.innerHTML = '';

  BLOCKS.forEach(block => {
    const tasks = getTodayTasks(block.id);
    const done = isBlockDone(block.id);
    const completedTasks = tasks.filter(t => t.done).length;

    const card = document.createElement('div');
    card.className = `block-card${done ? ' done' : ''}`;
    card.style.setProperty('--block-color', block.color);
    card.id = `block_${block.id}`;

    const taskHtml = tasks.map((t, i) => `
      <div class="task-item">
        <div class="task-check${t.done ? ' checked' : ''}" onclick="toggleTask(${block.id}, ${i})"></div>
        <div class="task-text${t.done ? ' done-text' : ''}">${t.text}</div>
        <button class="task-del" onclick="deleteTask(${block.id}, ${i})">×</button>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="block-header" onclick="toggleBlock(${block.id})">
        <div class="block-num">${block.short}</div>
        <div class="block-info">
          <div class="block-name">${block.name}</div>
          <div class="block-time">${block.time} · ${completedTasks}/${tasks.length} tasks</div>
        </div>
        <div class="block-status">
          <div class="status-badge${done ? ' done-badge' : ''}">${done ? 'DONE' : 'ACTIVE'}</div>
        </div>
      </div>
      <div class="block-body" id="body_${block.id}">
        <div class="task-input-row">
          <input class="task-input" id="input_${block.id}" placeholder="Add a task for this block..." 
            onkeydown="if(event.key==='Enter') addTask(${block.id})">
          <button class="add-btn" onclick="addTask(${block.id})">+</button>
        </div>
        <div class="task-list">${taskHtml}</div>
        <div class="block-actions">
          <button class="action-btn" onclick="clearTasks(${block.id})">clear tasks</button>
          <button class="action-btn primary" onclick="markDone(${block.id})">${done ? '✓ completed' : 'mark done'}</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  updateProgress();
  updateStats();
  updateMotive();
  updateCurrentBlock();
}

function selectDay(offset) {
  selectedDateOffset = offset;
  initDate();
  renderWeekStrip();
  renderBlocks();
}

function updateCurrentBlock() {
  document.querySelectorAll('.block-card').forEach(c => c.classList.remove('is-active'));

  if (selectedDateOffset !== 0) {
    BLOCKS.forEach(b => {
      const card = document.getElementById(`block_${b.id}`);
      if (!card) return;
      const done = isBlockDone(b.id);
      const badge = card.querySelector('.status-badge');
      if (badge) badge.textContent = done ? 'DONE' : 'OPEN';
    });
    return;
  }

  const h = new Date().getHours();
  let activeId = 3; // Default to night
  if (h >= 3 && h < 7) activeId = 0;
  else if (h >= 7 && h < 13) activeId = 1;
  else if (h >= 13 && h < 19) activeId = 2;

  BLOCKS.forEach(b => {
    const card = document.getElementById(`block_${b.id}`);
    if (!card) return;

    const done = isBlockDone(b.id);
    const badge = card.querySelector('.status-badge');

    if (done) {
      if (badge) badge.textContent = 'DONE';
      return;
    }

    if (b.id === activeId) {
      card.classList.add('is-active');
      if (badge) badge.textContent = 'CURRENT';
    } else if (b.id < activeId) {
      if (badge) badge.textContent = 'PAST';
    } else {
      if (badge) badge.textContent = 'UPCOMING';
    }
  });
}

function toggleBlock(id) {
  const body = document.getElementById(`body_${id}`);
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.block-body').forEach(b => b.classList.remove('open'));
  if (!isOpen) {
    body.classList.add('open');
    setTimeout(() => document.getElementById(`input_${id}`)?.focus(), 50);
  }
}

function addTask(blockId) {
  const input = document.getElementById(`input_${blockId}`);
  const text = input.value.trim();
  if (!text) return;
  const tasks = getTodayTasks(blockId);
  tasks.push({ text, done: false });
  saveTodayTasks(blockId, tasks);
  input.value = '';
  renderBlocks();
  // Reopen block
  setTimeout(() => {
    const body = document.getElementById(`body_${blockId}`);
    if (body) body.classList.add('open');
  }, 10);
}

function toggleTask(blockId, idx) {
  const tasks = getTodayTasks(blockId);
  tasks[idx].done = !tasks[idx].done;
  saveTodayTasks(blockId, tasks);
  renderBlocks();
  setTimeout(() => {
    const body = document.getElementById(`body_${blockId}`);
    if (body) body.classList.add('open');
  }, 10);
}

function deleteTask(blockId, idx) {
  const tasks = getTodayTasks(blockId);
  tasks.splice(idx, 1);
  saveTodayTasks(blockId, tasks);
  renderBlocks();
  setTimeout(() => {
    const body = document.getElementById(`body_${blockId}`);
    if (body) body.classList.add('open');
  }, 10);
}

function clearTasks(blockId) {
  saveTodayTasks(blockId, []);
  renderBlocks();
}

function markDone(blockId) {
  const current = isBlockDone(blockId);
  setBlockDone(blockId, !current);
  if (!current) showToast(`Block ${blockId + 1} complete 🔥`);
  renderBlocks();
  renderWeekStrip();
}

function updateProgress() {
  const totals = BLOCKS.map(b => {
    const tasks = getTodayTasks(b.id);
    if (tasks.length === 0) return isBlockDone(b.id) ? 100 : 0;
    return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
  });

  const overall = Math.round(totals.reduce((a, b) => a + b, 0) / 4);
  document.getElementById('totalPct').textContent = overall + '%';
  document.getElementById('totalFill').style.width = overall + '%';

  totals.forEach((pct, i) => {
    document.getElementById(`prog${i}`).style.width = pct + '%';
  });
}

function updateStats() {
  // Count this week
  let totalBlocks = 0;
  let totalTasks = 0;
  for (let i = -6; i <= 0; i++) {
    [0, 1, 2, 3].forEach(b => {
      if (load(getWeekKey(i, `done_${b}`), false)) totalBlocks++;
      const tasks = load(getWeekKey(i, `tasks_${b}`), []);
      totalTasks += tasks.filter(t => t.done).length;
    });
  }

  // Streak
  let streak = 0;
  for (let i = 0; i >= -30; i--) {
    const anyDone = [0, 1, 2, 3].some(b => load(getWeekKey(i, `done_${b}`), false));
    if (anyDone) streak++;
    else if (i < 0) break;
  }

  document.getElementById('statBlocks').textContent = totalBlocks;
  document.getElementById('statTasks').textContent = totalTasks;
  document.getElementById('statStreak').textContent = streak;

  // Update global day count
  save('3block_total_days', streak);
  document.getElementById('dayCount').textContent = streak;
}

function updateMotive() {
  const doneCount = BLOCKS.filter(b => isBlockDone(b.id)).length;
  const m = MOTIVES[Math.min(doneCount, 4)];
  document.getElementById('motiveBar').innerHTML = `<span>${m[0]}</span> ${m[1]}`;
}

function resetDay() {
  if (!confirm(`Reset blocks and tasks for ${selectedDateOffset === 0 ? "today" : "this day"}?`)) return;
  BLOCKS.forEach(b => {
    saveTodayTasks(b.id, []);
    setBlockDone(b.id, false);
  });
  renderBlocks();
  renderWeekStrip();
  showToast(`${selectedDateOffset === 0 ? "Today" : "Day"} reset 🌅`);
}

function initDate() {
  const d = new Date();
  d.setDate(d.getDate() + selectedDateOffset);
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  let dateText = d.toLocaleDateString('en-US', options).toUpperCase();
  if (selectedDateOffset === 0) dateText = "TODAY — " + dateText;
  document.getElementById('dateDisplay').textContent = dateText;

  const resetBtn = document.querySelector('.reset-btn');
  if (resetBtn) resetBtn.textContent = `↺ RESET ${selectedDateOffset === 0 ? "TODAY" : "DAY"}`;
}

// Init
initDate();
renderWeekStrip();
renderBlocks();
setInterval(updateCurrentBlock, 60000);