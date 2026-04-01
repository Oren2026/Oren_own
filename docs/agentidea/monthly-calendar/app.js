// === State ===
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed

const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

// === Event Map (date string -> events[]) ===
function buildEventMap() {
  const map = {};
  events.forEach(ev => {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  });
  return map;
}

// === Render Sidebar ===
function renderSidebar(selectedDate) {
  const todoList = document.getElementById('todoList');
  const eventMap = buildEventMap();

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  if (sortedEvents.length === 0) {
    todoList.innerHTML = '<div class="todo-empty">尚無代辦事項</div>';
    return;
  }

  todoList.innerHTML = sortedEvents.map(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
    const active = selectedDate === ev.date ? 'active' : '';
    return `
      <div class="todo-item ${active}" data-date="${ev.date}">
        <div class="todo-date">${dateStr}</div>
        <div class="todo-title">${ev.title}</div>
      </div>
    `;
  }).join('');

  // Click handler
  todoList.querySelectorAll('.todo-item').forEach(item => {
    item.addEventListener('click', () => {
      const date = item.dataset.date;
      const [y, m, d] = date.split('-').map(Number);
      currentYear = y;
      currentMonth = m - 1;
      renderCalendar();
      renderSidebar(date);
      openModal(date);
    });
  });
}

// === Render Calendar ===
function renderCalendar() {
  const header = document.getElementById('headerTitle');
  header.textContent = `${currentYear} 年 ${MONTHS[currentMonth]}`;

  const grid = document.getElementById('calendarGrid');
  const eventMap = buildEventMap();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Weekday headers
  const weekdayRow = document.getElementById('weekdayRow');
  weekdayRow.innerHTML = WEEKDAYS.map(w => `<div class="weekday">${w}</div>`).join('');

  // Build calendar days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const cells = [];

  // Padding before first day
  for (let i = 0; i < startDow; i++) {
    const d = new Date(currentYear, currentMonth, 1 - (startDow - i));
    cells.push({ date: d, otherMonth: true });
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(currentYear, currentMonth, d), otherMonth: false });
  }

  // Pad to complete last row
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(currentYear, currentMonth + 1, i), otherMonth: true });
    }
  }

  grid.innerHTML = cells.map(cell => {
    const y = cell.date.getFullYear();
    const m = cell.date.getMonth() + 1;
    const d = cell.date.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = eventMap[dateStr] || [];
    const isToday = dateStr === todayStr;
    const otherMonth = cell.otherMonth ? 'other-month' : '';
    const todayClass = isToday ? 'today' : '';
    const hasEventClass = dayEvents.length > 0 ? 'has-event' : '';
    const cellClass = `${otherMonth} ${todayClass} ${hasEventClass}`.trim();

    const pills = dayEvents.slice(0, 3).map(ev =>
      `<div class="event-pill">${ev.title}</div>`
    ).join('');
    const more = dayEvents.length > 3
      ? `<div class="event-more">+${dayEvents.length - 3} 更多</div>`
      : '';

    return `
      <div class="day-cell ${cellClass}" data-date="${dateStr}">
        <div class="day-num">${d}</div>
        <div class="day-events">
          ${pills}
          ${more}
        </div>
      </div>
    `;
  }).join('');

  // Click handler on cells
  grid.querySelectorAll('.day-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      openModal(date);
      renderSidebar(date);
    });
  });
}

// === Modal ===
function openModal(dateStr) {
  const eventMap = buildEventMap();
  const dayEvents = eventMap[dateStr] || [];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const dateLabel = `${y} 年 ${m} 月 ${d} 日 ${dow}`;

  const overlay = document.getElementById('modalOverlay');
  const dateEl = document.getElementById('modalDate');
  const titleEl = document.getElementById('modalTitle');
  const detailEl = document.getElementById('modalDetail');

  if (dayEvents.length === 0) {
    dateEl.textContent = dateLabel;
    titleEl.textContent = '當日無代辦事項';
    titleEl.style.color = 'var(--text-muted)';
    detailEl.innerHTML = '<span class="modal-empty">點擊日期可新增事件，編輯 events.js 即可自訂代辦事項。</span>';
  } else {
    titleEl.style.color = 'var(--text-primary)';
    // Show first event in header, allow navigating multiple
    const ev = dayEvents[0];
    dateEl.textContent = dateLabel;
    titleEl.textContent = ev.title;
    detailEl.innerHTML = ev.detail
      ? `<span class="modal-detail">${ev.detail}</span>`
      : '<span class="modal-empty">無詳細說明</span>';

    if (dayEvents.length > 1) {
      const nav = document.createElement('div');
      nav.style.cssText = 'margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;';
      dayEvents.forEach((e, i) => {
        const btn = document.createElement('button');
        btn.textContent = e.title;
        btn.style.cssText = `padding:4px 10px;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;font-size:12px;font-family:var(--font);${i===0?'background:var(--accent-light);border-color:var(--accent);':''}`;
        btn.addEventListener('click', () => {
          titleEl.textContent = e.title;
          detailEl.innerHTML = e.detail ? `<span class="modal-detail">${e.detail}</span>` : '<span class="modal-empty">無詳細說明</span>';
          nav.querySelectorAll('button').forEach((b, j) => {
            b.style.background = j === dayEvents.indexOf(e) ? 'var(--accent-light)' : '';
            b.style.borderColor = j === dayEvents.indexOf(e) ? 'var(--accent)' : '';
          });
        });
        nav.appendChild(btn);
      });
      detailEl.appendChild(nav);
    }
  }

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  // Remove extra nav buttons
  document.querySelectorAll('#modalDetail button').forEach(b => b.remove());
}

// === Nav ===
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

function goToday() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
  renderSidebar('');
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  // If today is April 2026, use that; otherwise use current
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  renderCalendar();
  renderSidebar('');

  document.getElementById('prevBtn').addEventListener('click', prevMonth);
  document.getElementById('nextBtn').addEventListener('click', nextMonth);
  document.getElementById('todayBtn').addEventListener('click', goToday);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});
