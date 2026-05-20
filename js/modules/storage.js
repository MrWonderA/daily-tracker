/* ============================================
   Storage - 本地存储管理模块
   所有数据操作统一入口
   ============================================ */

const Store = {
  prefix: 'daily_tracker_',

  _key(key) { return this.prefix + key; },

  get(key, def) {
    try {
      const raw = localStorage.getItem(this._key(key));
      return raw ? JSON.parse(raw) : def;
    } catch { return def; }
  },

  set(key, val) {
    try { localStorage.setItem(this._key(key), JSON.stringify(val)); return true; }
    catch { return false; }
  },

  remove(key) {
    try { localStorage.removeItem(this._key(key)); return true; }
    catch { return false; }
  },

  /* ---- 集合操作（用于日记、记账等列表数据） ---- */
  getList(key) { return this.get(key, []); },

  addItem(key, item) {
    const list = this.getList(key);
    item.id = item.id || Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    item.createdAt = item.createdAt || new Date().toISOString();
    list.unshift(item);
    this.set(key, list);
    return item;
  },

  updateItem(key, id, updates) {
    const list = this.getList(key);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    this.set(key, list);
    return list[idx];
  },

  removeItem(key, id) {
    const list = this.getList(key);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.set(key, list);
    return true;
  },

  getItem(key, id) {
    return this.getList(key).find(i => i.id === id) || null;
  },

  /* ---- 日期键值存储（每日一条的数据） ---- */
  getDate(key, dateStr) {
    const all = this.get(key, {});
    return all[dateStr] || null;
  },

  setDate(key, dateStr, val) {
    const all = this.get(key, {});
    all[dateStr] = val;
    return this.set(key, all);
  },

  getDateKeys(key) {
    return Object.keys(this.get(key, {}));
  },

  /* ---- 导出/导入 ---- */
  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        data[k] = localStorage.getItem(k);
      }
    }
    return data;
  },

  importAll(data) {
    for (const k in data) {
      if (k.startsWith(this.prefix)) {
        try { localStorage.setItem(k, data[k]); } catch {}
      }
    }
  },

  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  },

  /* ---- 统计辅助 ---- */
  getStats(key, dateField) {
    const list = this.getList(key);
    return {
      total: list.length,
      byDate(dateStr) {
        return list.filter(i => {
          const d = i[dateField || 'createdAt'];
          return d && d.startsWith(dateStr);
        });
      }
    };
  }
};