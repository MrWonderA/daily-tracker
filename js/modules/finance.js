/* ============================================
   Finance - 智能记账 / 资产管理模块
   包含收支记录、分类管理、图表、预算、导出
   ============================================ */

const Finance = {
  BILLS_KEY: 'finance_bills',
  CATEGORIES_KEY: 'finance_categories',
  BUDGET_KEY: 'finance_budget',

  defaultCategories: {
    expense: ['餐饮', '交通', '购物', '房租', '娱乐', '医疗', '通讯', '教育', '日用', '其他'],
    income: ['工资', '兼职', '红包', '投资', '退款', '其他']
  },

  init() {
    if (!Store.get(this.CATEGORIES_KEY)) {
      Store.set(this.CATEGORIES_KEY, this.defaultCategories);
    }
  },

  getCategories() {
    return Store.get(this.CATEGORIES_KEY, this.defaultCategories);
  },

  addCategory(type, name) {
    const cats = this.getCategories();
    if (!cats[type].includes(name)) cats[type].push(name);
    Store.set(this.CATEGORIES_KEY, cats);
  },

  removeCategory(type, name) {
    const cats = this.getCategories();
    cats[type] = cats[type].filter(c => c !== name);
    Store.set(this.CATEGORIES_KEY, cats);
  },

  /* ---- 账单 ---- */
  getBills() { return Store.getList(this.BILLS_KEY); },

  addBill(data) {
    return Store.addItem(this.BILLS_KEY, {
      ...data,
      date: data.date || Utils.today()
    });
  },

  deleteBill(id) { return Store.removeItem(this.BILLS_KEY, id); },

  getBillsByDate(dateStr) {
    return this.getBills().filter(b => b.date === dateStr);
  },

  getBillsByMonth(month) {
    return this.getBills().filter(b => b.date && b.date.startsWith(month));
  },

  getBillsByRange(start, end) {
    return this.getBills().filter(b => b.date && b.date >= start && b.date <= end);
  },

  getTotal(bills, type) {
    return bills.filter(b => b.type === type).reduce((s, b) => s + (b.amount || 0), 0);
  },

  getSummary(bills) {
    const income = this.getTotal(bills, 'income');
    const expense = this.getTotal(bills, 'expense');
    return { income, expense, balance: income - expense };
  },

  getMonthSummary(month) {
    return this.getSummary(this.getBillsByMonth(month));
  },

  /* ---- 预算 ---- */
  getBudget() {
    return Store.get(this.BUDGET_KEY, { expense: 0, enabled: false });
  },

  setBudget(data) {
    Store.set(this.BUDGET_KEY, data);
  },

  getBudgetProgress(month) {
    const budget = this.getBudget();
    if (!budget.enabled || !budget.expense) return null;
    const expense = this.getTotal(this.getBillsByMonth(month), 'expense');
    return { total: budget.expense, used: expense, pct: (expense / budget.expense) * 100 };
  },

  /* ---- 分类统计 ---- */
  getCategorySummary(bills, type) {
    const filtered = bills.filter(b => b.type === type);
    const map = {};
    filtered.forEach(b => {
      map[b.category] = (map[b.category] || 0) + b.amount;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  },

  /* ---- 月趋势数据 ---- */
  getMonthlyTrend(months) {
    months = months || 6;
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const summary = this.getMonthSummary(month);
      data.push({
        label: month.slice(5),
        income: summary.income,
        expense: summary.expense,
        month
      });
    }
    return data;
  },

  /* ---- 导出账单 ---- */
  exportBills(month) {
    const bills = this.getBillsByMonth(month);
    let csv = '日期,类型,分类,金额,备注,支付方式\n';
    bills.forEach(b => {
      csv += `${b.date},${b.type},${b.category},${b.amount},${b.note || ''},${b.method || ''}\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `账单_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /* ---- 渲染 ---- */
  renderFinancePage(container) {
    const filterEl = document.getElementById('bill-month-filter');
    const month = filterEl ? filterEl.value : Utils.today().slice(0, 7);
    const monthlyBills = this.getBillsByMonth(month);
    const summary = this.getMonthSummary(month);
    const budget = this.getBudget();

    container.innerHTML = `
      <div class="card-grid card-grid-2 mb-16">
        <div class="card">
          <div class="card-title"><span>💰 ${month} 月度汇总</span></div>
          <div class="flex justify-between items-center mb-8">
            <span class="text-sm text-muted">收入</span>
            <span style="color:var(--accent-green);font-weight:600;">+${Utils.formatMoney(summary.income)}</span>
          </div>
          <div class="flex justify-between items-center mb-8">
            <span class="text-sm text-muted">支出</span>
            <span style="color:var(--accent-red);font-weight:600;">-${Utils.formatMoney(summary.expense)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted">结余</span>
            <span style="font-weight:700;">${Utils.formatMoney(summary.balance)}</span>
          </div>
          ${budget.enabled && budget.expense ? `
            <div class="mt-8">
              <div class="flex justify-between text-sm mb-4">
                <span class="text-muted">预算 ${Utils.formatMoney(budget.expense)}</span>
                <span style="color:${summary.expense > budget.expense ? 'var(--accent-red)' : 'var(--accent-green)'}">
                  ${summary.expense > budget.expense ? '超支' : '剩余' + Utils.formatMoney(budget.expense - summary.expense)}
                </span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, (summary.expense / budget.expense) * 100)}%;background:${summary.expense > budget.expense ? 'var(--accent-red)' : 'var(--accent-green)'}"></div></div>
            </div>
          ` : ''}
        </div>
        <div class="card">
          <div class="card-title"><span>📊 支出分布</span></div>
          <div id="expense-chart"></div>
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-title">
          <span>🧾 账单列表</span>
          <div class="flex gap-8">
            <select class="select" style="width:auto;padding:5px 10px;font-size:0.82rem;" id="bill-month-filter" onchange="Finance.renderFinancePage(document.getElementById('page-container'))">
              ${this.getMonthOptions()}
            </select>
            <button class="btn btn-sm btn-primary" onclick="Finance.showAddBill()">+ 记一笔</button>
            <button class="btn btn-sm btn-secondary" onclick="Finance.showExport()">📥 导出</button>
          </div>
        </div>
        <div id="bill-list">
          ${this.renderBillList(monthlyBills)}
        </div>
      </div>
    `;

    /* 绘制支出饼图 */
    const expenseData = this.getCategorySummary(monthlyBills, 'expense');
    if (expenseData.length > 0) {
      Utils.drawPie(document.getElementById('expense-chart'), expenseData, ['#7ba4c7','#8cb8a0','#d4a76a','#c99aa6','#a08fc9','#c97a7a','#7bb8b8','#b8a07b']);
    } else {
      document.getElementById('expense-chart').innerHTML = '<div class="empty-state-text">暂无支出数据</div>';
    }
  },

  getMonthOptions() {
    const now = new Date();
    let opts = '';
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts += `<option value="${m}" ${i === 0 ? 'selected' : ''}>${m}</option>`;
    }
    return opts;
  },

  renderBillList(bills) {
    if (bills.length === 0) return '<div class="empty-state-text">暂无账单记录</div>';
    return bills.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt?.localeCompare?.(a.createdAt || '')).map(b => `
      <div class="finance-row">
        <div class="finance-type ${b.type}">${b.type === 'income' ? '📈' : '📉'}</div>
        <div class="list-item-main">
          <div class="list-item-title">${b.category || '未分类'}</div>
          <div class="finance-cat">${b.date} ${b.note ? '· ' + b.note : ''} ${b.method ? '· ' + b.method : ''}</div>
        </div>
        <div class="finance-amount ${b.type}">${b.type === 'income' ? '+' : '-'}${Utils.formatMoney(b.amount)}</div>
        <button class="btn btn-sm btn-danger" onclick="Finance.deleteBill('${b.id}');App.refresh()">×</button>
      </div>
    `).join('');
  },

  showAddBill() {
    const cats = this.getCategories();
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>🧾 记一笔</span><button class="btn btn-sm btn-secondary" onclick="App.refresh()">← 返回</button></div>
        <div class="form-group">
          <label class="form-label">类型</label>
          <div class="flex gap-8">
            <button class="btn ${this._billType === 'expense' ? 'btn-primary' : 'btn-secondary'}" onclick="Finance.setBillType('expense')">💸 支出</button>
            <button class="btn ${this._billType === 'income' ? 'btn-primary' : 'btn-secondary'}" onclick="Finance.setBillType('income')">💰 收入</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">金额</label>
          <input class="input" id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="select" id="bill-category">
            ${cats[this._billType || 'expense'].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input class="input" id="bill-date" type="date" value="${Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">支付方式</label>
          <select class="select" id="bill-method">
            <option value="现金">现金</option>
            <option value="微信">微信</option>
            <option value="支付宝">支付宝</option>
            <option value="银行卡">银行卡</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <input class="input" id="bill-note" placeholder="备注…">
        </div>
        <button class="btn btn-primary" onclick="Finance.saveBill()">💾 保存</button>
      </div>
    `;
  },

  _billType: 'expense',
  setBillType(type) {
    this._billType = type;
    this.showAddBill();
  },

  saveBill() {
    const type = this._billType || 'expense';
    const amount = parseFloat(document.getElementById('bill-amount')?.value);
    if (!amount || amount <= 0) { alert('请输入有效金额'); return; }
    const category = document.getElementById('bill-category')?.value || '其他';
    const date = document.getElementById('bill-date')?.value || Utils.today();
    const method = document.getElementById('bill-method')?.value || '';
    const note = document.getElementById('bill-note')?.value || '';
    this.addBill({ type, amount, category, date, method, note });
    this._billType = 'expense';
    App.refresh();
  },

  showExport() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="card page-enter">
        <div class="card-title"><span>📥 导出账单</span><button class="btn btn-sm btn-secondary" onclick="App.refresh()">← 返回</button></div>
        <div class="form-group">
          <label class="form-label">选择月份</label>
          <select class="select" id="export-month">${this.getMonthOptions().replace(/selected/g, '')}</select>
        </div>
        <button class="btn btn-primary" onclick="Finance.exportBills(document.getElementById('export-month').value)">📥 导出 CSV</button>
      </div>
    `;
  },

  /* 获取月度趋势（首页用） */
  getMonthlyChartData() {
    return this.getMonthlyTrend(6);
  }
};