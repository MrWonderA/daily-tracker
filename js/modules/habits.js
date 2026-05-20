/* ============================================
   Habits - 习惯追踪 / 自律养成模块
   自定义习惯、量化追踪（时长/时间/次数）、每日勾选、热力图
   ============================================ */

const Habits = {
  HABITS_KEY: 'habits_list',
  LOGS_KEY: 'habits_logs',

  /* 跟踪类型 */
  trackTypes: {
    toggle: { label: '勾选', unit: '', inputType: 'toggle' },
    duration: { label: '时长', unit: '分钟', inputType: 'number', suffix: '分钟' },
    time: { label: '时间', unit: '', inputType: 'time', suffix: '' },
    count: { label: '次数', unit: '次', inputType: 'number', suffix: '次' }
  },

  init() {
    const existing = Store.getList(this.HABITS_KEY);
    if (existing.length === 0) {
      const defaults = [
        { name: '阅读', emoji: '📖', isBad: false, trackType: 'duration' },
        { name: '冥想', emoji: '🧘', isBad: false, trackType: 'duration' },
        { name: '运动', emoji: '🏃', isBad: false, trackType: 'duration' },
        { name: '早睡', emoji: '🌙', isBad: false, trackType: 'time' },
        { name: '早起', emoji: '🌅', isBad: false, trackType: 'time' },
        { name: '喝水', emoji: '💧', isBad: false, trackType: 'count' }
      ];
      defaults.forEach(h => Store.addItem(this.HABITS_KEY, h));
    } else {
      /* 给旧数据默认 trackType */
      let changed = false;
      existing.forEach(h => {
        if (!h.trackType) { h.trackType = 'toggle'; changed = true; }
      });
      if (changed) Store.set(this.HABITS_KEY, existing);
    }
  },

  /* ---- 习惯 CRUD ---- */
  getHabits() { return Store.getList(this.HABITS_KEY); },

  addHabit(data) {
    return Store.addItem(this.HABITS_KEY, {
      ...data,
      isBad: data.isBad || false,
      trackType: data.trackType || 'toggle'
    });
  },

  updateHabit(id, data) { return Store.updateItem(this.HABITS_KEY, id, data); },

  deleteHabit(id) { return Store.removeItem(this.HABITS_KEY, id); },

  /* ---- 打卡记录 ---- */
  getLog(dateStr) {
    return Store.getDate(this.LOGS_KEY, dateStr) || {};
  },

  setLog(habitId, dateStr, value) {
    const log = this.getLog(dateStr);
    if (value === null || value === undefined || value === '' || value === false) {
      delete log[habitId];
    } else {
      log[habitId] = value;
    }
    Store.setDate(this.LOGS_KEY, dateStr, log);
  },

  toggleLog(habitId, dateStr) {
    const log = this.getLog(dateStr);
    if (log[habitId]) { delete log[habitId]; }
    else { log[habitId] = true; }
    Store.setDate(this.LOGS_KEY, dateStr, log);
  },

  getLogValue(habitId, dateStr) {
    const log = this.getLog(dateStr);
    const raw = log[habitId];
    if (!raw) return null;
    /* 兼容旧数据：true 表示已勾选 */
    if (raw === true) return { value: true };
    return raw;
  },

  isDone(habitId, dateStr) {
    const v = this.getLogValue(habitId, dateStr);
    if (!v) return false;
    if (v.value === true) return true;
    /* duration/count: value > 0 算完成 */
    if (typeof v.value === 'number') return v.value > 0;
    /* time: 有值就算完成 */
    if (typeof v.value === 'string' && v.value) return true;
    return false;
  },

  getCompletionRate(dateStr) {
    const habits = this.getHabits();
    const good = habits.filter(h => !h.isBad);
    const done = good.filter(h => this.isDone(h.id, dateStr)).length;
    return { total: good.length, done, rate: good.length ? (done / good.length) * 100 : 0 };
  },

  getMonthCompletion(month) {
    const habits = this.getHabits();
    const good = habits.filter(h => !h.isBad);
    if (good.length === 0) return 0;
    const [y, m] = month.split('-').map(Number);
    const days = Utils.getMonthDays(y, m);
    let totalDone = 0, totalPossible = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      const done = good.filter(h => this.isDone(h.id, dateStr)).length;
      totalPossible += good.length;
      totalDone += done;
    }
    return totalPossible ? (totalDone / totalPossible) * 100 : 0;
  },

  /* ---- 量化统计 ---- */
  getTrackedTotal(habitId, dateStr) {
    const v = this.getLogValue(habitId, dateStr);
    if (!v || !v.value || v.value === true) return 0;
    return typeof v.value === 'number' ? v.value : 0;
  },

  getTodayTrackedSummary() {
    const today = Utils.today();
    const habits = this.getHabits();
    const good = habits.filter(h => !h.isBad && h.trackType !== 'toggle');
    return good.map(h => ({
      ...h,
      value: this.getTrackedTotal(h.id, today)
    }));
  },

  getWeekTrackedTotal(habitId) {
    const today = Utils.today();
    const weekStart = Utils.getWeekStart(today);
    let total = 0;
    let d = Utils.parseDate(weekStart);
    const end = Utils.parseDate(today);
    while (d <= end) {
      const ds = Utils.formatDate(d);
      total += this.getTrackedTotal(habitId, ds);
      d.setDate(d.getDate() + 1);
    }
    return total;
  },

  getMonthTrackedTotal(habitId) {
    const month = Utils.today().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const days = Utils.getMonthDays(y, m);
    let total = 0;
    for (let d = 1; d <= days; d++) {
      const ds = `${month}-${String(d).padStart(2, '0')}`;
      total += this.getTrackedTotal(habitId, ds);
    }
    return total;
  },

  /* ---- 热力图数据 ---- */
  getHeatmapData(month) {
    const [y, m] = month.split('-').map(Number);
    const days = Utils.getMonthDays(y, m);
    const habits = this.getHabits();
    const good = habits.filter(h => !h.isBad);
    const data = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      const done = good.filter(h => this.isDone(h.id, dateStr)).length;
      let level = 0;
      if (good.length > 0) {
        const rate = done / good.length;
        if (rate > 0.75) level = 4;
        else if (rate > 0.5) level = 3;
        else if (rate > 0.25) level = 2;
        else if (rate > 0) level = 1;
      }
      data.push({ date: dateStr, day: d, level, done, total: good.length });
    }
    return data;
  },

  /* ---- 渲染习惯控制组件 ---- */
  renderHabitControl(habit, dateStr) {
    const v = this.getLogValue(habit.id, dateStr);
    const tt = this.trackTypes[habit.trackType] || this.trackTypes.toggle;

    if (habit.trackType === 'toggle') {
      return `<div class="habit-check${v ? ' done' : ''}" onclick="Habits.toggleLog('${habit.id}','${dateStr}');App.refresh()"></div>`;
    }

    const currentVal = v ? v.value : '';
    const inputId = `habit-val-${habit.id}`;

    if (habit.trackType === 'time') {
      return `<input type="time" id="${inputId}" class="input" style="width:100px;padding:4px 8px;font-size:0.82rem;" value="${currentVal || ''}" onchange="Habits.saveValue('${habit.id}','${dateStr}',this.value)">`;
    }
    if (habit.trackType === 'duration' || habit.trackType === 'count') {
      const placeholder = habit.trackType === 'duration' ? '分钟' : '次数';
      return `<input type="number" min="0" id="${inputId}" class="input" style="width:72px;padding:4px 8px;font-size:0.82rem;" value="${currentVal || ''}" placeholder="${placeholder}" onchange="Habits.saveValue('${habit.id}','${dateStr}',parseFloat(this.value)||0)">`;
    }

    return '';
  },

  saveValue(habitId, dateStr, value) {
    const habit = Store.getItem(this.HABITS_KEY, habitId);
    if (!habit) return;
    if (habit.trackType === 'time') {
      this.setLog(habitId, dateStr, { value, type: 'time' });
    } else if (habit.trackType === 'duration' || habit.trackType === 'count') {
      this.setLog(habitId, dateStr, { value: Math.max(0, value), type: habit.trackType });
    }
    App.refresh();
  },

  /* ---- 渲染 ---- */
  renderHabitsPage(container) {
    const today = Utils.today();
    const month = today.slice(0, 7);
    const habits = this.getHabits();
    const goodHabits = habits.filter(h => !h.isBad);
    const badHabits = habits.filter(h => h.isBad);
    const rate = this.getCompletionRate(today);
    const tracked = this.getTodayTrackedSummary();

    container.innerHTML = `
      <div class="card-grid card-grid-2 mb-16">
        <div class="card">
          <div class="card-title"><span>📊 今日完成</span></div>
          <div class="text-center">
            <div class="stat-value" style="font-size:2rem;">${rate.done}/${rate.total}</div>
            <div class="progress-bar mt-8"><div class="progress-fill" style="width:${rate.rate}%"></div></div>
            <div class="text-sm text-muted mt-8">月度完成率 ${this.getMonthCompletion(month).toFixed(1)}%</div>
          </div>
          ${tracked.length > 0 ? `
          <div class="mt-8 text-sm" style="border-top:1px solid var(--border-light);padding-top:10px;">
            ${tracked.map(t => {
              const suffix = this.trackTypes[t.trackType]?.suffix || '';
              return `<div class="flex justify-between items-center" style="padding:2px 0;"><span>${t.emoji} ${t.name}</span><span class="font-bold">${t.value}${suffix}</span></div>`;
            }).join('')}
          </div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">
            <span>📅 ${month} 热力图</span>
          </div>
          <div id="habits-heatmap"></div>
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-title">
          <span>✅ 好习惯</span>
          <button class="btn btn-sm btn-primary" onclick="Habits.showAddHabit()">+ 添加</button>
        </div>
        <div id="good-habit-list">
          ${goodHabits.length === 0 ? '<div class="empty-state-text">暂无习惯，添加一个吧</div>' :
            goodHabits.map(h => {
              const done = this.isDone(h.id, today);
              const controlHtml = this.renderHabitControl(h, today);
              const tt = this.trackTypes[h.trackType] || this.trackTypes.toggle;
              const valueDisplay = (h.trackType !== 'toggle' && done) ? Utils.formatNumber(this.getTrackedTotal(h.id, today)) + tt.suffix : '';
              return `
              <div class="list-item">
                <div style="flex-shrink:0;">${controlHtml}</div>
                <div class="list-item-main">
                  <div class="list-item-title">${h.emoji || '✅'} ${h.name} <span class="text-sm text-muted">${tt.label}</span></div>
                  ${valueDisplay ? `<div class="list-item-sub">今日 ${valueDisplay}</div>` : ''}
                </div>
                <div class="list-item-actions flex gap-8">
                  <button class="btn btn-sm btn-secondary" onclick="Habits.showEditHabit('${h.id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Habits.deleteHabit('${h.id}');App.refresh()">×</button>
                </div>
              </div>`;
            }).join('')}
        </div>
      </div>
      ${badHabits.length > 0 ? `
      <div class="card mb-16">
        <div class="card-title">
          <span>⚠️ 坏习惯（自我监督）</span>
          <button class="btn btn-sm btn-primary" onclick="Habits.showAddHabit()">+ 添加</button>
        </div>
        <div id="bad-habit-list">
          ${badHabits.map(h => `
            <div class="list-item">
              <div class="habit-check${this.isDone(h.id, today) ? ' done' : ''}" style="${this.isDone(h.id, today) ? 'background:var(--accent-red);border-color:var(--accent-red);' : ''}" onclick="Habits.toggleLog('${h.id}','${today}');App.refresh()"></div>
              <div class="list-item-main">
                <div class="list-item-title">${h.emoji || '⚠️'} ${h.name}</div>
              </div>
              <button class="btn btn-sm btn-danger" onclick="Habits.deleteHabit('${h.id}');App.refresh()">×</button>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
    `;

    this.renderHeatmap(month);
  },

  renderHeatmap(month) {
    const el = document.getElementById('habits-heatmap');
    if (!el) return;
    const data = this.getHeatmapData(month);
    const [y, m] = month.split('-').map(Number);
    const firstDay = Utils.getMonthFirstDay(y, m);

    let html = '<div class="flex gap-4 items-center mb-8">';
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(w => { html += `<span style="width:14px;text-align:center;font-size:0.65rem;color:var(--text-muted)">${w}</span>`; });
    html += '</div><div class="heatmap-grid" style="gap:3px;">';

    for (let i = 0; i < firstDay; i++) {
      html += '<div style="width:14px;height:14px;"></div>';
    }

    data.forEach(d => {
      html += `<div class="heatmap-cell level-${d.level}" title="${d.date}: ${d.done}/${d.total}"></div>`;
    });

    html += '</div>';
    html += '<div class="flex gap-4 items-center mt-8 text-sm text-muted"><span>少</span>';
    for (let i = 0; i <= 4; i++) {
      html += `<div class="heatmap-cell level-${i}" style="width:12px;height:12px;"></div>`;
    }
    html += '<span>多</span></div>';
    el.innerHTML = html;
  },

  showAddHabit() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>✅ 添加习惯</span><button class="btn btn-sm btn-secondary" onclick="App.refresh()">← 返回</button></div>
        <div class="form-group">
          <label class="form-label">习惯名称</label>
          <input class="input" id="habit-name" placeholder="如：早睡、运动…">
        </div>
        <div class="form-group">
          <label class="form-label">Emoji 图标</label>
          <input class="input" id="habit-emoji" placeholder="🌅">
        </div>
        <div class="form-group">
          <label class="form-label">跟踪方式</label>
          <select class="select" id="habit-track-type">
            <option value="toggle">勾选（完成/未完成）</option>
            <option value="duration">时长（分钟数）</option>
            <option value="time">时间（具体时刻）</option>
            <option value="count">次数</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">类型</label>
          <div class="flex gap-8">
            <label><input type="radio" name="habit-type" value="good" checked> 好习惯</label>
            <label><input type="radio" name="habit-type" value="bad"> ⚠️ 坏习惯（自我监督）</label>
          </div>
        </div>
        <button class="btn btn-primary" onclick="Habits.saveHabit()">💾 保存</button>
      </div>
    `;
  },

  saveHabit() {
    const name = document.getElementById('habit-name')?.value;
    if (!name) { alert('请输入习惯名称'); return; }
    const emoji = document.getElementById('habit-emoji')?.value || '✅';
    const trackType = document.getElementById('habit-track-type')?.value || 'toggle';
    const isBad = document.querySelector('input[name="habit-type"]:checked')?.value === 'bad';
    this.addHabit({ name, emoji, isBad, trackType });
    App.refresh();
  },

  showEditHabit(id) {
    const habit = Store.getItem(this.HABITS_KEY, id);
    if (!habit) return;
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>✏️ 编辑习惯</span><button class="btn btn-sm btn-secondary" onclick="App.refresh()">← 返回</button></div>
        <div class="form-group">
          <label class="form-label">习惯名称</label>
          <input class="input" id="habit-name" value="${habit.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Emoji 图标</label>
          <input class="input" id="habit-emoji" value="${habit.emoji || '✅'}">
        </div>
        <div class="form-group">
          <label class="form-label">跟踪方式</label>
          <select class="select" id="habit-track-type">
            <option value="toggle" ${habit.trackType === 'toggle' ? 'selected' : ''}>勾选（完成/未完成）</option>
            <option value="duration" ${habit.trackType === 'duration' ? 'selected' : ''}>时长（分钟数）</option>
            <option value="time" ${habit.trackType === 'time' ? 'selected' : ''}>时间（具体时刻）</option>
            <option value="count" ${habit.trackType === 'count' ? 'selected' : ''}>次数</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="Habits.saveEditHabit('${id}')">💾 保存</button>
      </div>
    `;
  },

  saveEditHabit(id) {
    const name = document.getElementById('habit-name')?.value;
    if (!name) { alert('请输入习惯名称'); return; }
    const emoji = document.getElementById('habit-emoji')?.value || '✅';
    const trackType = document.getElementById('habit-track-type')?.value || 'toggle';
    this.updateHabit(id, { name, emoji, trackType });
    App.refresh();
  },

  /* ---- 获取习惯完成率（首页用） ---- */
  getDailyCompletionData(days) {
    days = days || 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDate(d);
      const rate = this.getCompletionRate(dateStr);
      data.push({
        label: dateStr.slice(5),
        value: rate.rate,
        done: rate.done,
        total: rate.total,
        date: dateStr
      });
    }
    return data;
  }
};