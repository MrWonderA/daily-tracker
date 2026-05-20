/* ============================================
   Extras - 扩展功能模块
   体重记录、作息表、目标清单
   ============================================ */

const Extras = {
  /* ==========================================
     体重记录
     ========================================== */
  WEIGHT_KEY: 'weight_records',

  getWeights() { return Store.getList(this.WEIGHT_KEY); },

  addWeight(data) {
    return Store.addItem(this.WEIGHT_KEY, {
      ...data,
      date: data.date || Utils.today()
    });
  },

  deleteWeight(id) { return Store.removeItem(this.WEIGHT_KEY, id); },

  getWeightChartData(days) {
    days = days || 30;
    const records = this.getWeights()
      .filter(r => {
        const d = Utils.parseDate(r.date);
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        return d >= limit;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return records.map(r => ({
      label: r.date.slice(5),
      value: r.weight,
      date: r.date
    }));
  },

  /* ==========================================
     作息表
     ========================================== */
  SCHEDULE_KEY: 'weekly_schedule',
  defaultWeekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],

  getSchedule() {
    const s = Store.get(this.SCHEDULE_KEY);
    if (s) return s;
    const defaultSched = {};
    this.defaultWeekdays.forEach((_, i) => {
      defaultSched[i] = [
        { time: '07:00', activity: '起床', emoji: '🌅' },
        { time: '08:00', activity: '早餐', emoji: '🍳' },
        { time: '09:00', activity: '工作/学习', emoji: '💼' },
        { time: '12:00', activity: '午餐', emoji: '🍱' },
        { time: '13:00', activity: '午休', emoji: '😴' },
        { time: '14:00', activity: '工作/学习', emoji: '📚' },
        { time: '18:00', activity: '晚餐', emoji: '🍜' },
        { time: '19:00', activity: '自由时间', emoji: '🎮' },
        { time: '22:00', activity: '洗漱', emoji: '🪥' },
        { time: '23:00', activity: '睡觉', emoji: '🌙' }
      ];
    });
    return defaultSched;
  },

  saveSchedule(schedule) {
    Store.set(this.SCHEDULE_KEY, schedule);
  },

  getTodaySchedule() {
    const day = new Date().getDay();
    const sched = this.getSchedule();
    return sched[day] || [];
  },

  /* ==========================================
     目标清单
     ========================================== */
  GOALS_KEY: 'goal_list',

  getGoals() { return Store.getList(this.GOALS_KEY); },

  addGoal(data) {
    return Store.addItem(this.GOALS_KEY, {
      ...data,
      done: false,
      progress: data.progress || 0,
      createdAt: new Date().toISOString()
    });
  },

  updateGoal(id, data) { return Store.updateItem(this.GOALS_KEY, id, data); },

  deleteGoal(id) { return Store.removeItem(this.GOALS_KEY, id); },

  toggleGoal(id) {
    const g = Store.getItem(this.GOALS_KEY, id);
    if (g) {
      g.done = !g.done;
      if (g.done) g.progress = 100;
      Store.updateItem(this.GOALS_KEY, id, g);
    }
  },

  /* ==========================================
     体重记录页面
     ========================================== */
  renderWeightPage(container) {
    const records = this.getWeights().slice(0, 50);
    const today = Utils.today();
    const lastRecord = records.find(r => r.date === today);

    container.innerHTML = `
      <div class="card page-enter mb-16">
        <div class="card-title">
          <span>⚖️ 体重记录</span>
          <button class="btn btn-sm btn-secondary" onclick="App.navigate('dashboard')">← 返回</button>
        </div>
        <div class="form-group">
          <label class="form-label">今日体重 (kg)</label>
          <div class="input-group">
            <input class="input" id="weight-input" type="number" step="0.1" min="20" max="300" placeholder="65.0" value="${lastRecord ? lastRecord.weight : ''}">
            <button class="btn btn-primary" onclick="Extras.saveWeight()">记录</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <input class="input" id="weight-note" placeholder="如：饭后、晨起…" value="${lastRecord ? (lastRecord.note || '') : ''}">
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-title"><span>📈 趋势</span></div>
        <div id="weight-chart"></div>
      </div>
      <div class="card">
        <div class="card-title"><span>📜 历史记录</span></div>
        <div id="weight-list">
          ${records.length === 0 ? '<div class="empty-state-text">暂无记录</div>' :
            records.sort((a,b) => b.date.localeCompare(a.date)).map(r => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${r.date} · ${r.weight} kg</div>
                  ${r.note ? `<div class="list-item-sub">${r.note}</div>` : ''}
                </div>
                <button class="btn btn-sm btn-danger" onclick="Extras.deleteWeight('${r.id}');Extras.renderWeightPage(document.getElementById('page-container'))">×</button>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    const chartData = this.getWeightChartData(30);
    if (chartData.length > 1) {
      Utils.drawLine(document.getElementById('weight-chart'), chartData, {
        height: 160, width: 300, color: 'var(--accent-purple)'
      });
    } else {
      document.getElementById('weight-chart').innerHTML = '<div class="empty-state-text">记录更多体重数据以显示趋势</div>';
    }
  },

  saveWeight() {
    const val = parseFloat(document.getElementById('weight-input')?.value);
    if (!val || val <= 0) { alert('请输入有效体重'); return; }
    const note = document.getElementById('weight-note')?.value || '';
    const today = Utils.today();
    const existing = this.getWeights().find(r => r.date === today);
    if (existing) {
      Store.updateItem(this.WEIGHT_KEY, existing.id, { weight: val, note });
    } else {
      this.addWeight({ weight: val, note, date: today });
    }
    this.renderWeightPage(document.getElementById('page-container'));
  },

  /* ==========================================
     作息表页面
     ========================================== */
  renderSchedulePage(container) {
    const schedule = this.getSchedule();
    const todayIdx = new Date().getDay();

    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title">
          <span>📋 作息表</span>
          <button class="btn btn-sm btn-secondary" onclick="App.navigate('dashboard')">← 返回</button>
          <button class="btn btn-sm btn-primary" onclick="Extras.showEditSchedule()">✏️ 编辑</button>
        </div>
        <div class="tabs" id="schedule-tabs">
          ${this.defaultWeekdays.map((name, i) =>
            `<button class="tab ${i === todayIdx ? 'active' : ''}" onclick="Extras.switchScheduleDay(${i},this)">${name}</button>`
          ).join('')}
        </div>
        <div id="schedule-today">
          ${this.renderScheduleDay(todayIdx)}
        </div>
      </div>
    `;
  },

  switchScheduleDay(idx, btn) {
    Utils.$$('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('schedule-today').innerHTML = this.renderScheduleDay(idx);
  },

  renderScheduleDay(idx) {
    const schedule = this.getSchedule();
    const slots = schedule[idx] || [];
    const now = Utils.formatTime(new Date());

    if (slots.length === 0) {
      return '<div class="empty-state-text">该天暂无安排，点编辑添加</div>';
    }

    return slots.map(s => {
      return `
        <div class="list-item" style="${s.time === now ? 'background:var(--bg-hover);border-radius:8px;padding:10px 12px;' : ''}">
          <span style="font-size:1.2rem;width:32px;text-align:center;">${s.emoji || '⏰'}</span>
          <span style="font-weight:500;min-width:48px;font-size:0.88rem;">${s.time}</span>
          <span class="text-sm" style="flex:1;">${s.activity}</span>
          ${s.time === now ? '<span class="badge badge-blue">现在</span>' : ''}
        </div>
      `;
    }).join('');
  },

  showEditSchedule() {
    const schedule = this.getSchedule();
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title">
          <span>✏️ 编辑作息表</span>
          <button class="btn btn-sm btn-secondary" onclick="Extras.renderSchedulePage(document.getElementById('page-container'))">← 返回</button>
          <button class="btn btn-sm btn-success" onclick="Extras.saveEditedSchedule()">💾 保存</button>
        </div>
        <div class="form-group">
          <label class="form-label">选择星期</label>
          <select class="select" id="edit-sched-day" onchange="Extras.loadScheduleDay(this.value)">
            ${this.defaultWeekdays.map((n,i) => `<option value="${i}">${n}</option>`).join('')}
          </select>
        </div>
        <div id="edit-schedule-slots">
          ${this.renderScheduleEditor(0)}
        </div>
        <button class="btn btn-sm btn-secondary mt-16" onclick="Extras.addScheduleSlot()">+ 添加时段</button>
      </div>
    `;
  },

  renderScheduleEditor(dayIdx) {
    const schedule = this.getSchedule();
    const slots = schedule[dayIdx] || [];
    return slots.map((s, i) => `
      <div class="flex gap-8 items-center mb-8" data-slot="${i}">
        <input class="input" style="width:50px;padding:4px 6px;font-size:0.82rem;" value="${s.emoji || ''}" placeholder="图标" onchange="Extras._editSlots[${dayIdx}][${i}].emoji=this.value">
        <input type="time" class="input" style="width:90px;padding:4px 6px;font-size:0.82rem;" value="${s.time}" onchange="Extras._editSlots[${dayIdx}][${i}].time=this.value">
        <input class="input" style="flex:1;padding:4px 8px;font-size:0.82rem;" value="${s.activity}" placeholder="活动" onchange="Extras._editSlots[${dayIdx}][${i}].activity=this.value">
        <button class="btn btn-sm btn-danger" onclick="Extras.removeScheduleSlot(${dayIdx},${i})">×</button>
      </div>
    `).join('');
  },

  _editSlots: [],

  loadScheduleDay(dayIdx) {
    const schedule = this.getSchedule();
    const idx = parseInt(dayIdx);
    if (!this._editSlots[idx]) {
      this._editSlots[idx] = (schedule[idx] || []).map(s => ({ ...s }));
    }
    const el = document.getElementById('edit-schedule-slots');
    el.innerHTML = this.renderScheduleEditor(idx);
  },

  addScheduleSlot() {
    const daySel = document.getElementById('edit-sched-day');
    const idx = parseInt(daySel.value);
    if (!this._editSlots[idx]) this._editSlots[idx] = [];
    this._editSlots[idx].push({ time: '12:00', activity: '', emoji: '⏰' });
    this.loadScheduleDay(idx);
  },

  removeScheduleSlot(dayIdx, slotIdx) {
    if (!this._editSlots[dayIdx]) return;
    this._editSlots[dayIdx].splice(slotIdx, 1);
    this.loadScheduleDay(dayIdx);
  },

  saveEditedSchedule() {
    this._editSlots.forEach((slots, i) => {
      if (slots) {
        const schedule = this.getSchedule();
        schedule[i] = slots;
        this.saveSchedule(schedule);
      }
    });
    this._editSlots = [];
    Extras.renderSchedulePage(document.getElementById('page-container'));
  },

  /* ==========================================
     目标清单页面
     ========================================== */
  renderGoalsPage(container) {
    const goals = this.getGoals();
    const active = goals.filter(g => !g.done);
    const done = goals.filter(g => g.done);

    container.innerHTML = `
      <div class="card page-enter mb-16">
        <div class="card-title">
          <span>🎯 目标清单</span>
          <button class="btn btn-sm btn-secondary" onclick="App.navigate('dashboard')">← 返回</button>
          <button class="btn btn-sm btn-primary" onclick="Extras.showAddGoal()">+ 添加</button>
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-title"><span>进行中 (${active.length})</span></div>
        ${active.length === 0 ? '<div class="empty-state-text">暂无目标</div>' :
          active.map(g => `
            <div class="list-item">
              <div class="habit-check${g.done ? ' done' : ''}" onclick="Extras.toggleGoal('${g.id}');Extras.renderGoalsPage(document.getElementById('page-container'))"></div>
              <div class="list-item-main">
                <div class="list-item-title">${g.title}</div>
                ${g.deadline ? `<div class="list-item-sub">截止 ${g.deadline}</div>` : ''}
                <div class="progress-bar mt-8"><div class="progress-fill" style="width:${g.progress || 0}%"></div></div>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="Extras.showEditGoal('${g.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Extras.deleteGoal('${g.id}');Extras.renderGoalsPage(document.getElementById('page-container'))">×</button>
            </div>
          `).join('')}
      </div>
      ${done.length > 0 ? `
      <div class="card">
        <div class="card-title"><span>✅ 已完成 (${done.length})</span></div>
        ${done.map(g => `
          <div class="list-item">
            <div class="habit-check done"></div>
            <div class="list-item-main">
              <div class="list-item-title" style="text-decoration:line-through;color:var(--text-muted)">${g.title}</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="Extras.deleteGoal('${g.id}');Extras.renderGoalsPage(document.getElementById('page-container'))">×</button>
          </div>
        `).join('')}
      </div>` : ''}
    `;
  },

  showAddGoal() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>🎯 添加目标</span><button class="btn btn-sm btn-secondary" onclick="Extras.renderGoalsPage(document.getElementById('page-container'))">← 返回</button></div>
        <div class="form-group"><label class="form-label">目标名称</label><input class="input" id="goal-title" placeholder="如：减重5kg、读完10本书…"></div>
        <div class="form-group"><label class="form-label">截止日期</label><input class="input" id="goal-deadline" type="date"></div>
        <div class="form-group"><label class="form-label">当前进度 (%)</label><input class="input" id="goal-progress" type="number" min="0" max="100" value="0"></div>
        <div class="form-group"><label class="form-label">备注</label><textarea class="textarea" id="goal-note" rows="3"></textarea></div>
        <button class="btn btn-primary" onclick="Extras.saveGoal()">💾 保存</button>
      </div>
    `;
  },

  saveGoal() {
    const title = document.getElementById('goal-title')?.value;
    if (!title) { alert('请输入目标名称'); return; }
    const deadline = document.getElementById('goal-deadline')?.value || '';
    const progress = parseInt(document.getElementById('goal-progress')?.value) || 0;
    const note = document.getElementById('goal-note')?.value || '';
    this.addGoal({ title, deadline, progress, note });
    this.renderGoalsPage(document.getElementById('page-container'));
  },

  showEditGoal(id) {
    const g = Store.getItem(this.GOALS_KEY, id);
    if (!g) return;
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>✏️ 编辑目标</span><button class="btn btn-sm btn-secondary" onclick="Extras.renderGoalsPage(document.getElementById('page-container'))">← 返回</button></div>
        <div class="form-group"><label class="form-label">目标名称</label><input class="input" id="goal-title" value="${g.title}"></div>
        <div class="form-group"><label class="form-label">截止日期</label><input class="input" id="goal-deadline" type="date" value="${g.deadline || ''}"></div>
        <div class="form-group"><label class="form-label">当前进度 (%)</label><input class="input" id="goal-progress" type="number" min="0" max="100" value="${g.progress || 0}"></div>
        <div class="form-group"><label class="form-label">备注</label><textarea class="textarea" id="goal-note" rows="3">${g.note || ''}</textarea></div>
        <button class="btn btn-primary" onclick="Extras.saveEditGoal('${id}')">💾 保存</button>
      </div>
    `;
  },

  saveEditGoal(id) {
    const title = document.getElementById('goal-title')?.value;
    if (!title) { alert('请输入目标名称'); return; }
    const deadline = document.getElementById('goal-deadline')?.value || '';
    const progress = parseInt(document.getElementById('goal-progress')?.value) || 0;
    const note = document.getElementById('goal-note')?.value || '';
    this.updateGoal(id, { title, deadline, progress, note });
    this.renderGoalsPage(document.getElementById('page-container'));
  }
};